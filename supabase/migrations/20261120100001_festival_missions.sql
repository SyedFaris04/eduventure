-- Festival missions: one daily and four festival-long missions per festival kind, paying festival tokens.
-- Two new mission kinds: harvest (every harvest) and lesson (every completed lesson, replays included).

alter table public.mission_templates
  add column festival_kind text check (festival_kind in ('school_holiday', 'cny', 'raya', 'merdeka', 'deepavali')),
  add column token_reward int not null default 0 check (token_reward >= 0);
alter table public.mission_templates drop constraint mission_templates_period_check;
alter table public.mission_templates add constraint mission_templates_period_check check (period in ('daily', 'weekly', 'festival'));
alter table public.mission_templates drop constraint mission_templates_kind_check;
alter table public.mission_templates add constraint mission_templates_kind_check
  check (kind in ('answer_correct', 'answer_subject', 'defeat_monsters', 'defeat_returning', 'harvest', 'lesson'));

insert into public.mission_templates (id, period, kind, target, xp_reward, gold_reward, festival_kind, token_reward)
select 'f_' || k || '_' || s.shape, s.period, s.kind, s.target, s.xp, s.gold, k, s.tokens
from unnest(array['school_holiday', 'cny', 'raya', 'merdeka', 'deepavali']) k
cross join (values
  ('daily', 'daily', 'answer_correct', 5, 10, 5, 2),
  ('answers', 'festival', 'answer_correct', 40, 60, 30, 10),
  ('monsters', 'festival', 'defeat_monsters', 10, 50, 25, 8),
  ('harvest', 'festival', 'harvest', 10, 40, 20, 8),
  ('lessons', 'festival', 'lesson', 3, 50, 25, 8)
) s (shape, period, kind, target, xp, gold, tokens);

------------------------------------------------------------------------------------------
-- Missions (from 20261117120000_returning_monsters.sql and 20261116012700_missions_streaks.sql)
------------------------------------------------------------------------------------------
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
  where t.festival_kind is null and (t.kind <> 'defeat_returning' or v_due > 0)
  on conflict (user_id, template_id, period_start) do nothing;
  -- Festival missions, only while their festival is on: daily ones per local day, the rest once per festival.
  insert into public.player_missions (user_id, template_id, period_start, target)
  select p_user, t.id, case t.period when 'daily' then v_today else a.starts_on end, t.target
  from public.mission_templates t join public.active_festivals(p_user) a on a.kind = t.festival_kind
  on conflict (user_id, template_id, period_start) do nothing;
end $$;

-- Current missions only: today's dailies, this week's weeklies, and the missions of festivals that are on.
create or replace function public.current_missions(p_user uuid) returns setof public.player_missions
language sql stable security definer set search_path = '' as $$
  select m.* from public.player_missions m
  join public.mission_templates t on t.id = m.template_id
  left join public.active_festivals(p_user) a on a.kind = t.festival_kind
  where m.user_id = p_user
    and case
      when t.festival_kind is null then
        m.period_start = case t.period when 'daily' then public.local_today(p_user) else date_trunc('week', public.local_today(p_user))::date end
      else a.kind is not null and m.period_start = case t.period when 'daily' then public.local_today(p_user) else a.starts_on end
    end
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
      'xp', t.xp_reward, 'gold', t.gold_reward, 'festival', t.festival_kind, 'tokens', t.token_reward,
      'ends_on', case when t.period = 'festival' then a.ends_on end) order by t.period, t.id), '[]'::jsonb)
    from public.current_missions(v_uid) m
    join public.mission_templates t on t.id = m.template_id
    left join public.active_festivals(v_uid) a on a.kind = t.festival_kind);
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
  v_tokens int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_m from public.player_missions where id = p_id and user_id = v_uid for update;
  if not found then raise exception 'Mission not found' using errcode = 'P0002'; end if;
  if v_m.completed_at is null then raise exception 'Mission is not complete yet' using errcode = 'P0001'; end if;
  if v_m.claimed_at is not null then raise exception 'Reward already claimed' using errcode = 'P0001'; end if;
  -- A mission whose day, week or festival is over is gone, as the missions panel shows.
  if not exists (select 1 from public.current_missions(v_uid) c where c.id = p_id) then
    raise exception 'This mission has ended' using errcode = 'P0001';
  end if;
  select * into v_t from public.mission_templates where id = v_m.template_id;

  update public.player_missions set claimed_at = now() where id = p_id;
  select level into v_old from public.player_xp where user_id = v_uid;
  update public.player_xp set xp = xp + v_t.xp_reward, level = public.level_for_xp(xp + v_t.xp_reward)
    where user_id = v_uid returning xp, level into v_xp, v_level;
  update public.player_wallets set gold = gold + v_t.gold_reward, festival_tokens = festival_tokens + v_t.token_reward
    where user_id = v_uid returning gold, festival_tokens into v_gold, v_tokens;
  return jsonb_build_object('xp', v_t.xp_reward, 'gold', v_t.gold_reward, 'tokens', v_t.token_reward,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold, 'tokens', v_tokens), 'leveled_up', v_level > v_old);
end $$;

------------------------------------------------------------------------------------------
-- Harvest (from 20261120090003_harvest_no_double_pay.sql): every harvest counts for harvest missions
------------------------------------------------------------------------------------------
create or replace function public.answer_harvest(p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_h public.harvests;
  v_q public.questions;
  v_key public.question_keys;
  v_correct boolean;
  v_reason text;
  v_gain int;
  v_missions text[];
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_h from public.harvests where user_id = v_uid for update;
  if not found then raise exception 'No harvest in progress' using errcode = 'P0002'; end if;
  -- An ask that raced an earlier answer for this node left a pending row behind the regrowth: it pays nothing.
  if exists (select 1 from public.harvest_cooldowns where user_id = v_uid and place = v_h.place and x = v_h.x and y = v_h.y and ready_at > now()) then
    raise exception 'Still regrowing' using errcode = 'P0001';
  end if;
  if now() - v_h.served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;
  select * into v_q from public.questions where id = v_h.question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  v_correct := coalesce(public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb)), false);
  if not v_correct then
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;
  -- Recorded like a battle answer (mastery, ratings, missions, streak, pet), without XP or gold.
  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, null, v_q.id, p_answer, v_correct, 0, 0);
  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, false);
  v_missions := v_missions || public.bump_missions(v_uid, 'harvest', null);
  v_gain := case when v_correct then 2 else 1 end + public.tool_bonus(v_uid, v_h.material);
  insert into public.player_materials (user_id, material, amount) values (v_uid, v_h.material, v_gain)
  on conflict (user_id, material) do update set amount = public.player_materials.amount + v_gain;
  insert into public.harvest_cooldowns (user_id, place, x, y, ready_at) values (v_uid, v_h.place, v_h.x, v_h.y, now() + interval '3 minutes')
  on conflict (user_id, place, x, y) do update set ready_at = excluded.ready_at;
  delete from public.harvests where user_id = v_uid;
  return jsonb_build_object('correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'material', v_h.material, 'gained', v_gain, 'materials', public.materials_of(v_uid), 'missions_completed', to_jsonb(v_missions));
end $$;

------------------------------------------------------------------------------------------
-- Lessons (from 20261119090000_teach_your_pet.sql): every completed lesson counts for lesson missions
------------------------------------------------------------------------------------------
create or replace function public.complete_lesson(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.lesson_attempts;
  v_first boolean;
  v_old int;
  v_level int;
  v_xp bigint;
  v_gold bigint;
  v_missions text[];
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  perform 1 from public.lesson_attempts where id = v_a.id for update;
  if v_a.status <> 'active' then raise exception 'This lesson has ended' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.lesson_steps s
    where s.lesson_id = v_a.lesson_id and s.kind in ('predict', 'fix', 'pick', 'match', 'build', 'gap', 'type')
      and not exists (select 1 from public.lesson_step_results r where r.attempt_id = v_a.id and r.step_id = s.id and r.correct)
  ) then
    raise exception 'Answer every question first' using errcode = 'P0001';
  end if;

  insert into public.lesson_rewards (user_id, lesson_id, xp, gold) values (v_uid, v_a.lesson_id, 25, 10) on conflict do nothing;
  v_first := found;
  select level into v_old from public.player_xp where user_id = v_uid;
  if v_first then
    update public.player_xp set xp = xp + 25, level = public.level_for_xp(xp + 25) where user_id = v_uid;
    update public.player_wallets set gold = gold + 10 where user_id = v_uid;
    perform public.pet_award(v_uid, (
      select case c.kind when 'code' then 'technology' else 'language' end
      from public.lessons l join public.courses c on c.id = l.course_id where l.id = v_a.lesson_id), 'lesson');
    perform public.maybe_start_adventure(v_uid);
  end if;
  insert into public.learning_days (user_id, day) values (v_uid, public.local_today(v_uid)) on conflict do nothing;
  if found then perform public.pet_award(v_uid, null, 'day'); end if;
  update public.lesson_attempts set status = 'completed' where id = v_a.id;
  v_missions := public.bump_missions(v_uid, 'lesson', null);

  select xp, level into v_xp, v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;
  return jsonb_build_object('first_time', v_first, 'xp', case when v_first then 25 else 0 end, 'gold', case when v_first then 10 else 0 end,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold), 'leveled_up', coalesce(v_level > v_old, false),
    'missions_completed', to_jsonb(v_missions));
end $$;

------------------------------------------------------------------------------------------
-- Admin preview (from 20261120100000_festivals.sql): a reset also wipes the caller's missions for that festival kind
------------------------------------------------------------------------------------------
create or replace function public.set_festival_preview(p_id text, p_reset boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
begin
  if v_uid is null or not public.has_role(array['admin']) then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_id is null then
    delete from public.festival_previews where user_id = v_uid;
  else
    select kind into v_kind from public.festivals where id = p_id;
    if v_kind is null then raise exception 'No such festival' using errcode = '22023'; end if;
    insert into public.festival_previews (user_id, festival_id) values (v_uid, p_id)
      on conflict (user_id) do update set festival_id = excluded.festival_id;
    if p_reset then
      update public.player_wallets set festival_tokens = 50 where user_id = v_uid;
      delete from public.player_missions m using public.mission_templates t
        where t.id = m.template_id and m.user_id = v_uid and t.festival_kind = v_kind;
    end if;
  end if;
  return public.my_festivals();
end $$;
