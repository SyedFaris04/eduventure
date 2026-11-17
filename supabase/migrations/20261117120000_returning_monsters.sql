-- Returning monsters: a memory timer per topic (spaced retrieval). Due topics come back as Returning monsters on their
-- island; winning one pays a comeback bonus and counts for a daily mission. Overdue topics never cost anything.

------------------------------------------------------------------------------------------
-- The memory timer
------------------------------------------------------------------------------------------
alter table public.topic_mastery
  add column strength_days numeric(6, 2) not null default 1,
  add column due_at timestamptz not null default now() + interval '1 day';
update public.topic_mastery set due_at = last_seen + interval '1 day';

-- Right when due (or first seen): twice as long, at most 60 days. Right before it is due: no change.
-- Wrong: back to one day, and the topic returns in two minutes, once the player has read why.
create or replace function public.next_review(p_strength numeric, p_due timestamptz, p_correct boolean, p_now timestamptz) returns jsonb
language sql immutable set search_path = '' as $$
  select case
    when not p_correct then jsonb_build_object('strength', 1, 'due_at', p_now + interval '2 minutes')
    when p_due is not null and p_due > p_now then jsonb_build_object('strength', p_strength, 'due_at', p_due)
    else (select jsonb_build_object('strength', s, 'due_at', p_now + make_interval(secs => (s * 86400)::double precision))
          from (select least(coalesce(p_strength, 1) * 2, 60) as s) x)
  end
$$;

create or replace function public.record_mastery(p_user uuid, p_subject text, p_topic text, p_correct boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_row public.topic_mastery;
  v_next jsonb;
begin
  select * into v_row from public.topic_mastery where user_id = p_user and subject_id = p_subject and topic = p_topic for update;
  if not found then
    v_next := public.next_review(1, null, p_correct, now());
    insert into public.topic_mastery (user_id, subject_id, topic, attempts, correct, mastery, last_seen, strength_days, due_at)
    values (p_user, p_subject, p_topic, 1, p_correct::int, (p_correct::int + 1)::numeric / 3, now(),
            (v_next ->> 'strength')::numeric, (v_next ->> 'due_at')::timestamptz)
    on conflict do nothing;
    return;
  end if;
  v_next := public.next_review(v_row.strength_days, v_row.due_at, p_correct, now());
  update public.topic_mastery set
    attempts = attempts + 1,
    correct = correct + p_correct::int,
    mastery = (correct + p_correct::int + 1)::numeric / (attempts + 3),
    last_seen = now(),
    strength_days = (v_next ->> 'strength')::numeric,
    due_at = (v_next ->> 'due_at')::timestamptz
  where user_id = p_user and subject_id = p_subject and topic = p_topic;
end $$;

------------------------------------------------------------------------------------------
-- What is due, and where
------------------------------------------------------------------------------------------
create or replace function public.topic_island(p_subject text) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select i.id from public.islands i where p_subject = any (i.subject_ids) order by i.sort limit 1), 'greenhaven')
$$;

-- A question this player may be asked (same rules as pick_question).
create or replace function public.question_open_to(p_user uuid, p_status text, p_levels text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select (p_status = 'published' or (coalesce((select allow_draft_questions from public.app_settings), false) and p_status in ('in_review', 'approved')))
    and coalesce((select level_id = any (p_levels) from public.academic_profiles where user_id = p_user), true)
$$;

-- Due topics that still have a question the player can be asked.
create or replace function public.due_topics(p_user uuid) returns table (subject_id text, topic text, island_id text)
language sql stable security definer set search_path = '' as $$
  select m.subject_id, m.topic, public.topic_island(m.subject_id)
  from public.topic_mastery m
  where m.user_id = p_user and m.due_at <= now()
    and exists (select 1 from public.questions q
                where q.subject_id = m.subject_id and q.topic = m.topic and public.question_open_to(p_user, q.status, q.level_ids))
$$;

create or replace function public.my_returning() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('island_id', island_id, 'count', least(n, 3)) order by island_id), '[]'::jsonb)
          from (select island_id, count(*) as n from public.due_topics(v_uid) group by island_id) x);
end $$;

------------------------------------------------------------------------------------------
-- Returning battles
------------------------------------------------------------------------------------------
alter table public.encounters add column is_returning boolean not null default false;

drop function public.pick_question(uuid, text);
create function public.pick_question(p_user uuid, p_monster text default null, p_returning boolean default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text;
  v_subjects text[];
  v_island text[];
  v_island_id text;
  v_drafts boolean;
  v_recent text[];
  v_monster text := p_monster;
  v_returning boolean := p_returning;
  v_id text;
begin
  select level_id, subject_ids into v_level, v_subjects from public.academic_profiles where user_id = p_user;
  select allow_draft_questions into v_drafts from public.app_settings;
  select coalesce(array_agg(question_id), '{}') into v_recent
  from (select question_id from public.question_attempts where user_id = p_user order by created_at desc limit 10) r;
  if v_monster is null then
    select monster_id into v_monster from public.encounters where user_id = p_user and status = 'active';
  end if;
  if v_returning is null then
    select e.is_returning into v_returning from public.encounters e where e.user_id = p_user and e.status = 'active';
  end if;
  select i.subject_ids, i.id into v_island, v_island_id from public.monsters m join public.islands i on i.id = m.island_id where m.id = v_monster;

  -- A Returning battle asks the island's due topics first (a different question than last time when there is one).
  if coalesce(v_returning, false) then
    select q.id into v_id
    from public.questions q join public.due_topics(p_user) d on d.subject_id = q.subject_id and d.topic = q.topic
    where d.island_id = v_island_id and public.question_open_to(p_user, q.status, q.level_ids)
    order by (q.id = any (v_recent)), random()
    limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  for pass in 1..5 loop
    continue when pass <= 2 and v_island is null;
    -- Weighted random choice (exponential race): smaller key wins, higher weight gives smaller keys.
    select q.id into v_id
    from public.questions q
    left join public.topic_mastery m on m.user_id = p_user and m.subject_id = q.subject_id and m.topic = q.topic
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass in (2, 5) or not (q.id = any (v_recent)))
      and (pass > 2 or q.subject_id = any (v_island))
      and (pass <> 3 or q.subject_id = any (coalesce(v_subjects, '{}')))
    order by -ln(1 - random()) / public.question_weight(m.mastery)
    limit 1;
    exit when v_id is not null;
  end loop;

  if v_id is null then
    raise exception 'No questions are available yet' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

drop function public.start_encounter(text);
create function public.start_encounter(p_monster text, p_returning boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_hp int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  if found then return public.encounter_state(v_enc); end if;

  select max_hp into v_hp from public.monsters where id = p_monster;
  if v_hp is null then raise exception 'Unknown monster' using errcode = '22023'; end if;
  if coalesce(p_returning, false) and not exists (
    select 1 from public.due_topics(v_uid) d join public.monsters m on m.island_id = d.island_id where m.id = p_monster
  ) then
    raise exception 'Nothing is due on this island' using errcode = 'P0001';
  end if;

  begin
    insert into public.encounters (user_id, monster_id, monster_hp, current_question_id, question_served_at, is_returning)
    values (v_uid, p_monster, v_hp, public.pick_question(v_uid, p_monster, coalesce(p_returning, false)), now(), coalesce(p_returning, false))
    returning * into v_enc;
  exception when unique_violation then
    select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  end;
  return public.encounter_state(v_enc);
end $$;

------------------------------------------------------------------------------------------
-- The daily mission: given only while something is due, sized to what is due
------------------------------------------------------------------------------------------
alter table public.mission_templates drop constraint mission_templates_kind_check;
alter table public.mission_templates add constraint mission_templates_kind_check
  check (kind in ('answer_correct', 'answer_subject', 'defeat_monsters', 'defeat_returning'));
insert into public.mission_templates values ('d_returning_3', 'daily', 'defeat_returning', 3, 30, 15);

create or replace function public.ensure_missions(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := public.local_today(p_user);
  v_week date := date_trunc('week', v_today)::date;
  v_subject text;
  v_due int;
begin
  select subject_ids[1] into v_subject from public.academic_profiles where user_id = p_user;
  select count(*) into v_due from public.due_topics(p_user);
  insert into public.player_missions (user_id, template_id, period_start, subject_id, target)
  select p_user, t.id, case t.period when 'daily' then v_today else v_week end,
         case when t.kind = 'answer_subject' then v_subject end,
         case when t.kind = 'defeat_returning' then least(t.target, v_due) else t.target end
  from public.mission_templates t
  where t.kind <> 'defeat_returning' or v_due > 0
  on conflict (user_id, template_id, period_start) do nothing;
end $$;

------------------------------------------------------------------------------------------
-- Battle state and answers (from 20261116090100_unlocks.sql): the Returning flag and the comeback bonus
------------------------------------------------------------------------------------------
create or replace function public.encounter_state(e public.encounters) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'encounter_id', e.id, 'monster_id', e.monster_id, 'monster_hp', e.monster_hp,
    'monster_max_hp', (select max_hp from public.monsters where id = e.monster_id),
    'player_hp', e.player_hp, 'combo', e.combo, 'status', e.status, 'returning', e.is_returning,
    'helpers', public.helpers_state(e.user_id, e.second_chance_used, e.fifty_used, e.hidden_options),
    'question', case when e.status = 'active' then public.question_payload(e.current_question_id) end)
$$;

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
  v_second boolean := false;
  v_comeback jsonb := null;
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
  v_second := not v_correct and not v_enc.second_chance_used
    and public.unlocked(public.player_level(v_uid), 'helper', 'second_chance');
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
      -- 50/50 on this question halves its XP.
      if v_enc.fifty_question_id = v_q.id then v_xp := v_xp / 2; end if;
    end if;
  else
    v_enc.combo := 0;
    if v_second then
      v_enc.second_chance_used := true; -- Second Chance: this wrong answer costs no HP
    else
      v_enc.player_hp := greatest(0, v_enc.player_hp - 10);
    end if;
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
    if v_enc.is_returning then
      -- Comeback bonus for beating a Returning monster.
      v_bonus_xp := v_bonus_xp + 20;
      v_bonus_gold := v_bonus_gold + 10;
      v_comeback := jsonb_build_object('xp', 20, 'gold', 10);
    end if;
  elsif v_enc.player_hp = 0 then
    v_enc.status := 'lost';
  end if;

  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, v_enc.status = 'won');
  if v_comeback is not null then v_missions := v_missions || public.bump_missions(v_uid, 'defeat_returning', null); end if;

  select level into v_old_level from public.player_xp where user_id = v_uid;
  update public.player_xp
    set xp = xp + v_xp + v_bonus_xp, level = public.level_for_xp(xp + v_xp + v_bonus_xp)
    where user_id = v_uid
    returning xp, level into v_total_xp, v_new_level;
  update public.player_wallets set gold = gold + v_gold + v_bonus_gold where user_id = v_uid returning gold into v_total_gold;

  if v_enc.status = 'active' then
    v_enc.current_question_id := public.pick_question(v_uid, v_enc.monster_id);
    v_enc.question_served_at := now();
    v_enc.hidden_options := '{}';
  else
    v_enc.ended_at := now();
  end if;

  update public.encounters set
    monster_hp = v_enc.monster_hp, player_hp = v_enc.player_hp, combo = v_enc.combo, status = v_enc.status,
    current_question_id = v_enc.current_question_id, question_served_at = v_enc.question_served_at,
    xp_earned = xp_earned + v_xp + v_bonus_xp, gold_earned = gold_earned + v_gold + v_bonus_gold, ended_at = v_enc.ended_at,
    second_chance_used = v_enc.second_chance_used, hidden_options = v_enc.hidden_options
  where id = v_enc.id
  returning * into v_enc;

  return jsonb_build_object(
    'correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'damage', v_damage, 'farmed', v_correct and v_farmed, 'xp_gained', v_xp + v_bonus_xp, 'gold_gained', v_gold + v_bonus_gold,
    'bonus', jsonb_build_object('xp', v_bonus_xp, 'gold', v_bonus_gold),
    'totals', jsonb_build_object('xp', v_total_xp, 'level', v_new_level, 'gold', v_total_gold),
    'leveled_up', v_new_level > v_old_level,
    'second_chance', v_second,
    'returning_bonus', v_comeback,
    'missions_completed', to_jsonb(v_missions),
    'state', public.encounter_state(v_enc));
end $$;

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke execute on function public.next_review(numeric, timestamptz, boolean, timestamptz), public.my_returning(),
  public.start_encounter(text, boolean) from public, anon;
grant execute on function public.next_review(numeric, timestamptz, boolean, timestamptz), public.my_returning(),
  public.start_encounter(text, boolean) to authenticated;
revoke execute on function public.topic_island(text), public.question_open_to(uuid, text, text[]), public.due_topics(uuid),
  public.pick_question(uuid, text, boolean) from public, anon, authenticated;
