-- Greenhaven Guardian: a 4-round boss. 3 correct answers clear a round; 3 hearts; one reward per local day.

create table public.boss_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  boss_id text not null default 'guardian' check (boss_id in ('guardian')),
  round int not null default 1 check (round between 1 and 4),
  round_progress int not null default 0 check (round_progress between 0 and 3),
  hearts int not null default 3 check (hearts between 0 and 3),
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'fled')),
  current_question_id text references public.questions (id),
  question_served_at timestamptz,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index boss_runs_one_active on public.boss_runs (user_id) where status = 'active';

create table public.boss_rewards (
  user_id uuid not null references auth.users (id) on delete cascade,
  boss_id text not null,
  day date not null,
  xp int not null,
  gold int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, boss_id, day)
);

-- Subjects each round draws from (round 4 is the mixed final).
create or replace function public.boss_round_subjects(p_round int) returns text[]
language sql immutable set search_path = '' as $$
  select case p_round
    when 1 then array['mathematics', 'additional_mathematics', 'advanced_mathematics', 'calculus', 'statistics']
    when 2 then array['science', 'biology', 'chemistry', 'physics', 'environmental_studies']
    when 3 then array['english', 'malay_language', 'literature', 'critical_thinking', 'general_knowledge', 'reading', 'writing']
    else null
  end
$$;

-- Like pick_question, but restricted to the round's subjects first (general pool fills gaps for any level).
create or replace function public.pick_boss_question(p_user uuid, p_round int) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text;
  v_drafts boolean;
  v_recent text[];
  v_subjects text[] := public.boss_round_subjects(p_round);
  v_id text;
begin
  select level_id into v_level from public.academic_profiles where user_id = p_user;
  select allow_draft_questions into v_drafts from public.app_settings;
  select coalesce(array_agg(question_id), '{}') into v_recent
  from (select question_id from public.question_attempts where user_id = p_user order by created_at desc limit 10) r;

  for pass in 1..4 loop
    select q.id into v_id
    from public.questions q
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass in (2, 4) or not (q.id = any (v_recent)))
      and (pass >= 3 or v_subjects is null or q.subject_id = any (v_subjects) or q.subject_id = 'general_knowledge')
    order by (case when v_subjects is not null and q.subject_id = any (v_subjects) then 0 else 1 end), random()
    limit 1;
    exit when v_id is not null;
  end loop;
  if v_id is null then raise exception 'No questions are available yet' using errcode = 'P0001'; end if;
  return v_id;
end $$;

create or replace function public.boss_state(r public.boss_runs) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'run_id', r.id, 'round', r.round, 'rounds', 4, 'round_progress', r.round_progress, 'per_round', 3,
    'hearts', r.hearts, 'status', r.status,
    'question', case when r.status = 'active' then public.question_payload(r.current_question_id) end)
$$;

create or replace function public.start_boss() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_run from public.boss_runs where user_id = v_uid and status = 'active';
  if found then return public.boss_state(v_run); end if;
  begin
    insert into public.boss_runs (user_id, current_question_id, question_served_at)
    values (v_uid, public.pick_boss_question(v_uid, 1), now())
    returning * into v_run;
  exception when unique_violation then
    select * into v_run from public.boss_runs where user_id = v_uid and status = 'active';
  end;
  return public.boss_state(v_run);
end $$;

create or replace function public.answer_boss(p_run uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
  v_q public.questions;
  v_key public.question_keys;
  v_correct boolean;
  v_reason text;
  v_missions text[];
  v_reward jsonb := null;
  v_rewarded boolean;
  v_old int;
  v_level int;
  v_xp bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_run from public.boss_runs where id = p_run and user_id = v_uid for update;
  if not found then raise exception 'Boss battle not found' using errcode = 'P0002'; end if;
  if v_run.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if now() - v_run.question_served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;

  select * into v_q from public.questions where id = v_run.current_question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  v_correct := public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb));

  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, null, v_q.id, p_answer, v_correct, 0, 0);

  if v_correct then
    v_run.round_progress := v_run.round_progress + 1;
    if v_run.round_progress = 3 then
      if v_run.round = 4 then v_run.status := 'won';
      else
        v_run.round := v_run.round + 1;
        v_run.round_progress := 0;
      end if;
    end if;
  else
    v_run.hearts := v_run.hearts - 1;
    if v_run.hearts = 0 then v_run.status := 'lost'; end if;
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;

  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, false);

  if v_run.status = 'won' then
    insert into public.boss_rewards (user_id, boss_id, day, xp, gold)
    values (v_uid, v_run.boss_id, public.local_today(v_uid), 150, 80)
    on conflict do nothing;
    v_rewarded := found;
    if v_rewarded then
      select level into v_old from public.player_xp where user_id = v_uid;
      update public.player_xp set xp = xp + 150, level = public.level_for_xp(xp + 150) where user_id = v_uid returning xp, level into v_xp, v_level;
      update public.player_wallets set gold = gold + 80 where user_id = v_uid returning gold into v_gold;
    end if;
    v_reward := jsonb_build_object('xp', case when v_rewarded then 150 else 0 end, 'gold', case when v_rewarded then 80 else 0 end,
      'already_today', not v_rewarded, 'leveled_up', coalesce(v_level > v_old, false));
  end if;

  if v_run.status = 'active' then
    v_run.current_question_id := public.pick_boss_question(v_uid, v_run.round);
    v_run.question_served_at := now();
  else
    v_run.ended_at := now();
  end if;

  update public.boss_runs set round = v_run.round, round_progress = v_run.round_progress, hearts = v_run.hearts, status = v_run.status,
    current_question_id = v_run.current_question_id, question_served_at = v_run.question_served_at, ended_at = v_run.ended_at
  where id = v_run.id returning * into v_run;

  select xp into v_xp from public.player_xp where user_id = v_uid;
  select level into v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;

  return jsonb_build_object(
    'correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'reward', v_reward, 'missions_completed', to_jsonb(v_missions),
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold),
    'state', public.boss_state(v_run));
end $$;

create or replace function public.flee_boss(p_run uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.boss_runs set status = 'fled', ended_at = now() where id = p_run and user_id = auth.uid() and status = 'active';
end $$;

revoke all on public.boss_runs, public.boss_rewards from anon, authenticated;
grant select on public.boss_runs, public.boss_rewards to authenticated;
alter table public.boss_runs enable row level security;
alter table public.boss_rewards enable row level security;
create policy "own row" on public.boss_runs for select to authenticated using (user_id = (select auth.uid()));
create policy "own row" on public.boss_rewards for select to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.pick_boss_question(uuid, int), public.boss_state(public.boss_runs) from public, anon, authenticated;
revoke execute on function public.start_boss(), public.answer_boss(uuid, jsonb), public.flee_boss(uuid) from public, anon;
grant execute on function public.start_boss(), public.answer_boss(uuid, jsonb), public.flee_boss(uuid) to authenticated;
