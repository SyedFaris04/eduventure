-- Missions (daily/weekly) and learning streaks. Progress is counted only inside after_answer();
-- rewards are paid only by claim_mission(). Days follow the player's own time zone.

------------------------------------------------------------------------------------------
-- Player time zone
------------------------------------------------------------------------------------------
alter table public.user_settings add column timezone text not null default 'UTC';

create or replace function public.check_timezone() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown time zone %', new.timezone using errcode = '22023';
  end if;
  return new;
end $$;
create trigger user_settings_timezone before insert or update of timezone on public.user_settings
  for each row execute function public.check_timezone();

create or replace function public.local_today(p_user uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select timezone from public.user_settings where user_id = p_user), 'UTC'))::date
$$;

------------------------------------------------------------------------------------------
-- Missions
------------------------------------------------------------------------------------------
create table public.mission_templates (
  id text primary key,
  period text not null check (period in ('daily', 'weekly')),
  kind text not null check (kind in ('answer_correct', 'answer_subject', 'defeat_monsters')),
  target int not null check (target > 0),
  xp_reward int not null check (xp_reward >= 0),
  gold_reward int not null check (gold_reward >= 0)
);
insert into public.mission_templates values
  ('d_correct_10', 'daily', 'answer_correct', 10, 30, 15),
  ('d_defeat_3', 'daily', 'defeat_monsters', 3, 25, 12),
  ('d_subject_5', 'daily', 'answer_subject', 5, 20, 10),
  ('w_correct_50', 'weekly', 'answer_correct', 50, 120, 60),
  ('w_defeat_12', 'weekly', 'defeat_monsters', 12, 100, 50);

create table public.player_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null references public.mission_templates (id),
  period_start date not null,
  subject_id text references public.subjects (id),
  progress int not null default 0,
  target int not null,
  completed_at timestamptz,
  claimed_at timestamptz,
  unique (user_id, template_id, period_start)
);
create index player_missions_active on public.player_missions (user_id, period_start desc);

create or replace function public.ensure_missions(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.local_today(p_user);
  v_week date := date_trunc('week', v_today)::date;
  v_subject text;
begin
  select subject_ids[1] into v_subject from public.academic_profiles where user_id = p_user;
  insert into public.player_missions (user_id, template_id, period_start, subject_id, target)
  select p_user, t.id, case t.period when 'daily' then v_today else v_week end,
         case when t.kind = 'answer_subject' then v_subject end, t.target
  from public.mission_templates t
  on conflict (user_id, template_id, period_start) do nothing;
end $$;

-- Current missions only (today's dailies, this week's weeklies).
create or replace function public.current_missions(p_user uuid) returns setof public.player_missions
language sql stable security definer set search_path = '' as $$
  select m.* from public.player_missions m join public.mission_templates t on t.id = m.template_id
  where m.user_id = p_user
    and m.period_start = case t.period when 'daily' then public.local_today(p_user) else date_trunc('week', public.local_today(p_user))::date end
$$;

create or replace function public.my_missions() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  perform public.ensure_missions(v_uid);
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', m.id, 'template_id', m.template_id, 'period', t.period, 'subject', m.subject_id,
      'progress', m.progress, 'target', m.target, 'completed', m.completed_at is not null, 'claimed', m.claimed_at is not null,
      'xp', t.xp_reward, 'gold', t.gold_reward) order by t.period, t.id), '[]'::jsonb)
    from public.current_missions(v_uid) m join public.mission_templates t on t.id = m.template_id);
end $$;

-- Adds progress to matching current missions; returns the template ids that just reached their target.
create or replace function public.bump_missions(p_user uuid, p_kind text, p_subject text) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_done text[];
begin
  perform public.ensure_missions(p_user);
  with hit as (
    update public.player_missions m set
      progress = m.progress + 1,
      completed_at = case when m.progress + 1 >= m.target then now() else null end
    from public.mission_templates t
    where t.id = m.template_id and m.id in (select id from public.current_missions(p_user))
      and t.kind = p_kind and m.completed_at is null
      and (p_kind <> 'answer_subject' or m.subject_id is null or m.subject_id = p_subject)
    returning m.template_id, m.completed_at)
  select coalesce(array_agg(template_id), '{}') into v_done from hit where completed_at is not null;
  return v_done;
end $$;

create or replace function public.claim_mission(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_m public.player_missions;
  v_t public.mission_templates;
  v_old int;
  v_level int;
  v_xp bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_m from public.player_missions where id = p_id and user_id = v_uid for update;
  if not found then raise exception 'Mission not found' using errcode = 'P0002'; end if;
  if v_m.completed_at is null then raise exception 'Mission is not complete yet' using errcode = 'P0001'; end if;
  if v_m.claimed_at is not null then raise exception 'Reward already claimed' using errcode = 'P0001'; end if;
  select * into v_t from public.mission_templates where id = v_m.template_id;

  update public.player_missions set claimed_at = now() where id = p_id;
  select level into v_old from public.player_xp where user_id = v_uid;
  update public.player_xp set xp = xp + v_t.xp_reward, level = public.level_for_xp(xp + v_t.xp_reward)
    where user_id = v_uid returning xp, level into v_xp, v_level;
  update public.player_wallets set gold = gold + v_t.gold_reward where user_id = v_uid returning gold into v_gold;
  return jsonb_build_object('xp', v_t.xp_reward, 'gold', v_t.gold_reward,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold), 'leveled_up', v_level > v_old);
end $$;

------------------------------------------------------------------------------------------
-- Streaks: a learning day is any day with at least one answered question.
-- One missed day per week is forgiven (a rest day); gaps never take anything away.
------------------------------------------------------------------------------------------
create table public.learning_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

create or replace function public.my_streak() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_day date;
  v_current int := 0;
  v_today_done boolean;
  v_rest_weeks date[] := '{}';
  v_week date;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_today := public.local_today(v_uid);
  v_today_done := exists (select 1 from public.learning_days where user_id = v_uid and day = v_today);
  -- Today still counts as "in progress": the streak is alive if it reached yesterday.
  v_day := case when v_today_done then v_today else v_today - 1 end;
  for i in 1..400 loop
    if exists (select 1 from public.learning_days where user_id = v_uid and day = v_day) then
      v_current := v_current + 1;
    else
      v_week := date_trunc('week', v_day)::date;
      exit when v_week = any (v_rest_weeks) or not exists (select 1 from public.learning_days where user_id = v_uid and day < v_day);
      v_rest_weeks := v_rest_weeks || v_week;
    end if;
    v_day := v_day - 1;
  end loop;
  return jsonb_build_object('current', v_current, 'today_done', v_today_done,
    'rest_available', not (date_trunc('week', v_today)::date = any (v_rest_weeks)));
end $$;

------------------------------------------------------------------------------------------
-- One hook for everything that follows an answer
------------------------------------------------------------------------------------------
create or replace function public.after_answer(p_user uuid, p_subject text, p_topic text, p_correct boolean, p_won boolean) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_done text[] := '{}';
begin
  perform public.record_mastery(p_user, p_subject, p_topic, p_correct);
  insert into public.learning_days (user_id, day) values (p_user, public.local_today(p_user)) on conflict do nothing;
  if p_correct then
    v_done := v_done || public.bump_missions(p_user, 'answer_correct', p_subject);
    v_done := v_done || public.bump_missions(p_user, 'answer_subject', p_subject);
  end if;
  if p_won then v_done := v_done || public.bump_missions(p_user, 'defeat_monsters', null); end if;
  return v_done;
end $$;

-- answer_question: unchanged rules; now calls after_answer() and reports finished missions.
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
  v_missions text[];
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

  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, v_enc.status = 'won');

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
    'missions_completed', to_jsonb(v_missions),
    'state', public.encounter_state(v_enc));
end $$;

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke all on public.mission_templates, public.player_missions, public.learning_days from anon, authenticated;
grant select on public.mission_templates to authenticated;
alter table public.mission_templates enable row level security;
alter table public.player_missions enable row level security;
alter table public.learning_days enable row level security;
create policy "templates are public" on public.mission_templates for select to authenticated using (true);

revoke execute on function public.ensure_missions(uuid), public.current_missions(uuid), public.bump_missions(uuid, text, text),
  public.after_answer(uuid, text, text, boolean, boolean), public.local_today(uuid) from public, anon, authenticated;
revoke execute on function public.my_missions(), public.claim_mission(uuid), public.my_streak() from public, anon;
grant execute on function public.my_missions(), public.claim_mission(uuid), public.my_streak() to authenticated;
