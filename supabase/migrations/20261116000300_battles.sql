-- Phase 2 battles. Clients never see an answer before answering and never write XP, gold or
-- encounter state: every change goes through start_encounter / answer_question / flee_encounter.

------------------------------------------------------------------------------------------
-- Settings (server-only)
------------------------------------------------------------------------------------------
create table public.app_settings (
  id boolean primary key default true check (id),
  allow_draft_questions boolean not null default false,
  updated_at timestamptz not null default now()
);
-- DEVELOPMENT PROJECT: battles may use questions still in review (shown with a Draft badge).
-- A production project must set this to false before launch (see docs/decisions.md #15).
insert into public.app_settings (allow_draft_questions) values (true);

------------------------------------------------------------------------------------------
-- Content
------------------------------------------------------------------------------------------
create table public.monsters (
  id text primary key,
  max_hp int not null check (max_hp > 0),
  xp_reward int not null check (xp_reward >= 0),
  gold_reward int not null check (gold_reward >= 0),
  created_at timestamptz not null default now()
);
insert into public.monsters (id, max_hp, xp_reward, gold_reward) values
  ('sproutling', 60, 20, 8),
  ('pebblewing', 90, 35, 14),
  ('dinobud', 120, 50, 20);

create table public.questions (
  id text primary key,
  version int not null check (version >= 1),
  status text not null check (status in ('draft', 'in_review', 'approved', 'published', 'rejected')),
  level_ids text[] not null check (cardinality(level_ids) > 0),
  subject_id text not null references public.subjects (id),
  topic text not null,
  subtopic text not null,
  difficulty smallint not null check (difficulty between 1 and 5),
  bloom text not null check (bloom in ('remember', 'understand', 'apply', 'analyze', 'evaluate', 'create')),
  type text not null check (type in ('mcq', 'true_false', 'numeric', 'fill_blank')),
  prompt text not null,
  options jsonb,
  unit text,
  objective text not null,
  alignment text not null,
  source_name text not null,
  license text not null,
  verification text not null default 'unverified' check (verification in ('unverified', 'verified')),
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index questions_levels_idx on public.questions using gin (level_ids);
create trigger questions_updated before update on public.questions for each row execute function public.set_updated_at();

-- Answers and explanations live apart from the question text and are never granted to clients.
create table public.question_keys (
  question_id text primary key references public.questions (id) on delete cascade,
  answer jsonb not null,
  explanation text not null,
  wrong jsonb,
  mistakes jsonb
);

------------------------------------------------------------------------------------------
-- Play state
------------------------------------------------------------------------------------------
create table public.encounters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  monster_id text not null references public.monsters (id),
  monster_hp int not null check (monster_hp >= 0),
  player_hp int not null default 100 check (player_hp >= 0),
  combo int not null default 0,
  status text not null default 'active' check (status in ('active', 'won', 'lost', 'fled')),
  current_question_id text references public.questions (id),
  question_served_at timestamptz,
  xp_earned int not null default 0,
  gold_earned int not null default 0,
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index encounters_one_active on public.encounters (user_id) where status = 'active';

create table public.question_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  encounter_id uuid references public.encounters (id) on delete cascade,
  question_id text not null references public.questions (id),
  answer jsonb,
  correct boolean not null,
  xp_awarded int not null,
  gold_awarded int not null,
  created_at timestamptz not null default now()
);
create index question_attempts_recent on public.question_attempts (user_id, created_at desc);
create index question_attempts_farm on public.question_attempts (user_id, question_id, created_at desc) where correct;

------------------------------------------------------------------------------------------
-- Level curve (mirrors src/game/levels.ts)
------------------------------------------------------------------------------------------
create or replace function public.xp_to_next(p_level int) returns int
language sql immutable set search_path = '' as $$
  select round(100 * power(p_level, 1.5))::int
$$;

create or replace function public.level_for_xp(p_xp bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare
  v_level int := 1;
  v_rest bigint := greatest(p_xp, 0);
begin
  while v_rest >= public.xp_to_next(v_level) loop
    v_rest := v_rest - public.xp_to_next(v_level);
    v_level := v_level + 1;
  end loop;
  return v_level;
end $$;

------------------------------------------------------------------------------------------
-- Internal helpers (not callable by clients)
------------------------------------------------------------------------------------------
-- A question that fits the player: their level (general pool covers every level), preferring their
-- subjects, avoiding the last 10 they saw. Falls back step by step so a battle always gets a question.
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
    select q.id into v_id
    from public.questions q
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass = 3 or not (q.id = any (v_recent)))
      and (pass >= 2 or q.subject_id = any (coalesce(v_subjects, '{}')))
    order by random()
    limit 1;
    exit when v_id is not null;
  end loop;

  if v_id is null then
    raise exception 'No questions are available yet' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

-- What the client may see: never the answer, explanation or wrong-option reasons.
create or replace function public.question_payload(p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', q.id, 'type', q.type, 'prompt', q.prompt, 'options', q.options, 'unit', q.unit,
    'difficulty', q.difficulty, 'subject', q.subject_id, 'status', q.status)
  from public.questions q where q.id = p_id
$$;

create or replace function public.encounter_state(e public.encounters) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'encounter_id', e.id, 'monster_id', e.monster_id, 'monster_hp', e.monster_hp,
    'monster_max_hp', (select max_hp from public.monsters where id = e.monster_id),
    'player_hp', e.player_hp, 'combo', e.combo, 'status', e.status,
    'question', case when e.status = 'active' then public.question_payload(e.current_question_id) end)
$$;

create or replace function public.is_correct(p_type text, p_key jsonb, p_answer jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  case p_type
    when 'mcq', 'true_false' then
      return (p_answer ->> 'choice') = (p_key #>> '{}');
    when 'numeric' then
      if coalesce(p_answer ->> 'value', '') !~ '^\s*-?\d+(\.\d+)?\s*$' then return false; end if;
      return abs((p_answer ->> 'value')::numeric - (p_key ->> 'value')::numeric) <= (p_key ->> 'tolerance')::numeric;
    when 'fill_blank' then
      return lower(btrim(coalesce(p_answer ->> 'text', ''))) in (select lower(a) from jsonb_array_elements_text(p_key -> 'accept') a);
    else
      return false;
  end case;
end $$;

------------------------------------------------------------------------------------------
-- Client API
------------------------------------------------------------------------------------------
create or replace function public.start_encounter(p_monster text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_hp int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  -- Resume an unfinished battle (e.g. after a reload) instead of starting a second one.
  select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  if found then return public.encounter_state(v_enc); end if;

  select max_hp into v_hp from public.monsters where id = p_monster;
  if v_hp is null then raise exception 'Unknown monster' using errcode = '22023'; end if;

  insert into public.encounters (user_id, monster_id, monster_hp, current_question_id, question_served_at)
  values (v_uid, p_monster, v_hp, public.pick_question(v_uid), now())
  returning * into v_enc;
  return public.encounter_state(v_enc);
end $$;

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

  if v_enc.monster_hp = 0 then
    v_enc.status := 'won';
    v_bonus_xp := v_mon.xp_reward;
    v_bonus_gold := v_mon.gold_reward;
  elsif v_enc.player_hp = 0 then
    v_enc.status := 'lost';
  end if;

  -- Progression changes only here.
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
    'correct', v_correct,
    'correct_answer', v_key.answer,
    'explanation', v_key.explanation,
    'wrong_reason', v_reason,
    'damage', v_damage,
    'farmed', v_correct and v_farmed,
    'xp_gained', v_xp + v_bonus_xp,
    'gold_gained', v_gold + v_bonus_gold,
    'bonus', jsonb_build_object('xp', v_bonus_xp, 'gold', v_bonus_gold),
    'totals', jsonb_build_object('xp', v_total_xp, 'level', v_new_level, 'gold', v_total_gold),
    'leveled_up', v_new_level > v_old_level,
    'state', public.encounter_state(v_enc));
end $$;

create or replace function public.flee_encounter(p_encounter uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.encounters set status = 'fled', ended_at = now()
  where id = p_encounter and user_id = auth.uid() and status = 'active';
end $$;

------------------------------------------------------------------------------------------
-- Privileges and RLS
------------------------------------------------------------------------------------------
revoke all on public.app_settings, public.monsters, public.questions, public.question_keys, public.encounters, public.question_attempts from anon, authenticated;
grant select on public.monsters to anon, authenticated;
grant select on public.encounters, public.question_attempts to authenticated;

alter table public.app_settings enable row level security;
alter table public.monsters enable row level security;
alter table public.questions enable row level security;
alter table public.question_keys enable row level security;
alter table public.encounters enable row level security;
alter table public.question_attempts enable row level security;

create policy "monsters are public" on public.monsters for select to anon, authenticated using (true);
create policy "own row" on public.encounters for select to authenticated using (user_id = (select auth.uid()));
create policy "own row" on public.question_attempts for select to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.pick_question(uuid), public.question_payload(text), public.encounter_state(public.encounters), public.is_correct(text, jsonb, jsonb)
  from public, anon, authenticated;
revoke execute on function public.start_encounter(text), public.answer_question(uuid, jsonb), public.flee_encounter(uuid) from public, anon;
grant execute on function public.start_encounter(text), public.answer_question(uuid, jsonb), public.flee_encounter(uuid) to authenticated;
