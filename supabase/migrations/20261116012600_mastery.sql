-- Learning model: per-topic mastery (accuracy only; answer speed is ignored), weak-topic weighting in
-- question selection, and the Academic Library of answered questions.

create table public.topic_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null references public.subjects (id),
  topic text not null,
  attempts int not null default 0,
  correct int not null default 0,
  mastery numeric(5, 4) not null default 0.5, -- (correct + 1) / (attempts + 2)
  last_seen timestamptz not null default now(),
  primary key (user_id, subject_id, topic)
);
revoke all on public.topic_mastery from anon, authenticated;
grant select on public.topic_mastery to authenticated;
alter table public.topic_mastery enable row level security;
create policy "own row" on public.topic_mastery for select to authenticated using (user_id = (select auth.uid()));

-- Selection weight: weak topics up to 3× as likely as mastered ones; unknown topics count as 0.5.
create or replace function public.question_weight(p_mastery numeric) returns numeric
language sql immutable set search_path = '' as $$
  select 1.5 - coalesce(p_mastery, 0.5)
$$;

create or replace function public.pick_question(p_user uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text;
  v_subjects text[];
  v_drafts boolean;
  v_recent text[];
  v_id text;
begin
  select level_id, subject_ids into v_level, v_subjects from public.academic_profiles where user_id = p_user;
  select allow_draft_questions into v_drafts from public.app_settings;
  select coalesce(array_agg(question_id), '{}') into v_recent
  from (select question_id from public.question_attempts where user_id = p_user order by created_at desc limit 10) r;

  for pass in 1..3 loop
    -- Weighted random choice (exponential race): smaller key wins, higher weight gives smaller keys.
    select q.id into v_id
    from public.questions q
    left join public.topic_mastery m on m.user_id = p_user and m.subject_id = q.subject_id and m.topic = q.topic
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass = 3 or not (q.id = any (v_recent)))
      and (pass >= 2 or q.subject_id = any (coalesce(v_subjects, '{}')))
    order by -ln(1 - random()) / public.question_weight(m.mastery)
    limit 1;
    exit when v_id is not null;
  end loop;

  if v_id is null then
    raise exception 'No questions are available yet' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

create or replace function public.record_mastery(p_user uuid, p_subject text, p_topic text, p_correct boolean) returns void
language sql security definer set search_path = '' as $$
  insert into public.topic_mastery as t (user_id, subject_id, topic, attempts, correct, mastery, last_seen)
  values (p_user, p_subject, p_topic, 1, p_correct::int, (p_correct::int + 1)::numeric / 3, now())
  on conflict (user_id, subject_id, topic) do update set
    attempts = t.attempts + 1,
    correct = t.correct + p_correct::int,
    mastery = (t.correct + p_correct::int + 1)::numeric / (t.attempts + 3),
    last_seen = now()
$$;

-- Same as 20261116000300_battles.sql, plus the mastery update after each attempt.
create or replace function public.answer_question(p_encounter uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_q public.questions;
  v_key public.question_keys;
  v_mon public.monsters;
  v_correct boolean;
  v_farmed boolean;
  v_damage int := 0;
  v_xp int := 0;
  v_gold int := 0;
  v_bonus_xp int := 0;
  v_bonus_gold int := 0;
  v_reason text;
  v_old_level int;
  v_new_level int;
  v_total_xp bigint;
  v_total_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select * into v_enc from public.encounters where id = p_encounter and user_id = v_uid for update;
  if not found then raise exception 'Encounter not found' using errcode = 'P0002'; end if;
  if v_enc.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if now() - v_enc.question_served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;

  select * into v_q from public.questions where id = v_enc.current_question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  select * into v_mon from public.monsters where id = v_enc.monster_id;

  v_correct := public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb));
  v_farmed := exists (
    select 1 from public.question_attempts
    where user_id = v_uid and question_id = v_q.id and correct and created_at > now() - interval '24 hours');

  if v_correct then
    v_enc.combo := v_enc.combo + 1;
    v_damage := round((12 + 4 * v_q.difficulty) * (1 + least(v_enc.combo - 1, 5) * 0.1));
    v_enc.monster_hp := greatest(0, v_enc.monster_hp - v_damage);
    if not v_farmed then
      v_xp := 5 * v_q.difficulty;
      v_gold := 2 * v_q.difficulty;
    end if;
  else
    v_enc.combo := 0;
    v_enc.player_hp := greatest(0, v_enc.player_hp - 10);
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;

  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, v_enc.id, v_q.id, p_answer, v_correct, v_xp, v_gold);
  perform public.record_mastery(v_uid, v_q.subject_id, v_q.topic, v_correct);

  if v_enc.monster_hp = 0 then
    v_enc.status := 'won';
    v_bonus_xp := v_mon.xp_reward;
    v_bonus_gold := v_mon.gold_reward;
  elsif v_enc.player_hp = 0 then
    v_enc.status := 'lost';
  end if;

  select level into v_old_level from public.player_xp where user_id = v_uid;
  update public.player_xp
    set xp = xp + v_xp + v_bonus_xp, level = public.level_for_xp(xp + v_xp + v_bonus_xp)
    where user_id = v_uid
    returning xp, level into v_total_xp, v_new_level;
  update public.player_wallets set gold = gold + v_gold + v_bonus_gold where user_id = v_uid returning gold into v_total_gold;

  if v_enc.status = 'active' then
    v_enc.current_question_id := public.pick_question(v_uid);
    v_enc.question_served_at := now();
  else
    v_enc.ended_at := now();
  end if;

  update public.encounters set
    monster_hp = v_enc.monster_hp, player_hp = v_enc.player_hp, combo = v_enc.combo, status = v_enc.status,
    current_question_id = v_enc.current_question_id, question_served_at = v_enc.question_served_at,
    xp_earned = xp_earned + v_xp + v_bonus_xp, gold_earned = gold_earned + v_gold + v_bonus_gold, ended_at = v_enc.ended_at
  where id = v_enc.id
  returning * into v_enc;

  return jsonb_build_object(
    'correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'damage', v_damage, 'farmed', v_correct and v_farmed, 'xp_gained', v_xp + v_bonus_xp, 'gold_gained', v_gold + v_bonus_gold,
    'bonus', jsonb_build_object('xp', v_bonus_xp, 'gold', v_bonus_gold),
    'totals', jsonb_build_object('xp', v_total_xp, 'level', v_new_level, 'gold', v_total_gold),
    'leveled_up', v_new_level > v_old_level,
    'state', public.encounter_state(v_enc));
end $$;

-- Academic Library: questions this player has already answered, with the answer and explanation they saw.
create or replace function public.my_library() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(row_to_json(x) order by x.last_at desc), '[]'::jsonb)
  from (
    select q.id, q.subject_id as subject, q.topic, q.type, q.prompt, q.options, q.unit,
           k.answer, k.explanation,
           (array_agg(a.correct order by a.created_at desc))[1] as last_correct,
           count(*) as attempts, max(a.created_at) as last_at
    from public.question_attempts a
    join public.questions q on q.id = a.question_id
    join public.question_keys k on k.question_id = q.id
    where a.user_id = auth.uid()
    group by q.id, k.answer, k.explanation
    order by max(a.created_at) desc
    limit 300
  ) x
$$;

revoke execute on function public.record_mastery(uuid, text, text, boolean), public.pick_question(uuid) from public, anon, authenticated;
revoke execute on function public.my_library() from public, anon;
grant execute on function public.my_library(), public.question_weight(numeric) to authenticated;
