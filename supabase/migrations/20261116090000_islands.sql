-- Island world: each monster belongs to an island, and the server picks questions from that island's
-- subjects. The client never says where it is: the island comes from the monster (or boss) row.

------------------------------------------------------------------------------------------
-- Islands and their monsters
------------------------------------------------------------------------------------------
create table public.islands (
  id text primary key,
  subject_ids text[], -- null: the player's own subjects (Greenhaven)
  sort int not null
);
insert into public.islands (id, subject_ids, sort) values
  ('greenhaven', null, 10),
  ('science_island', array['science', 'biology', 'chemistry', 'physics', 'environmental_science'], 20),
  ('mathematics_mountains', array['mathematics', 'additional_mathematics', 'calculus', 'statistics'], 30);

alter table public.monsters add column island_id text not null default 'greenhaven' references public.islands (id);
insert into public.monsters (id, max_hp, xp_reward, gold_reward, island_id) values
  ('hornbill', 100, 40, 16, 'science_island'),
  ('tapir', 120, 48, 19, 'science_island'),
  ('pangolin', 130, 55, 22, 'science_island'),
  ('cubelet', 100, 40, 16, 'mathematics_mountains'),
  ('hexowl', 120, 48, 19, 'mathematics_mountains'),
  ('pisnake', 130, 55, 22, 'mathematics_mountains');

revoke all on public.islands from anon, authenticated;
grant select on public.islands to anon, authenticated;
alter table public.islands enable row level security;
create policy "islands are public" on public.islands for select to anon, authenticated using (true);

------------------------------------------------------------------------------------------
-- Question picking by island
------------------------------------------------------------------------------------------
-- Passes 1-2 (island monsters only): the island's subjects, first avoiding the last 10 seen.
-- Passes 3-5 are the previous picker unchanged: own subjects, then any subject, then even recent ones.
-- Without p_monster the active battle's monster is used, so answer_question keeps the island mid-battle.
drop function public.pick_question(uuid);
create function public.pick_question(p_user uuid, p_monster text default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text;
  v_subjects text[];
  v_island text[];
  v_drafts boolean;
  v_recent text[];
  v_monster text := p_monster;
  v_id text;
begin
  select level_id, subject_ids into v_level, v_subjects from public.academic_profiles where user_id = p_user;
  select allow_draft_questions into v_drafts from public.app_settings;
  select coalesce(array_agg(question_id), '{}') into v_recent
  from (select question_id from public.question_attempts where user_id = p_user order by created_at desc limit 10) r;
  if v_monster is null then
    select monster_id into v_monster from public.encounters where user_id = p_user and status = 'active';
  end if;
  select i.subject_ids into v_island from public.monsters m join public.islands i on i.id = m.island_id where m.id = v_monster;

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

-- start_encounter: unchanged except that the first question knows which monster (and so which island) it is for.
create or replace function public.start_encounter(p_monster text) returns jsonb
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

  begin
    insert into public.encounters (user_id, monster_id, monster_hp, current_question_id, question_served_at)
    values (v_uid, p_monster, v_hp, public.pick_question(v_uid, p_monster), now())
    returning * into v_enc;
  exception when unique_violation then
    select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  end;
  return public.encounter_state(v_enc);
end $$;

------------------------------------------------------------------------------------------
-- Island bosses
------------------------------------------------------------------------------------------
alter table public.boss_runs drop constraint boss_runs_boss_id_check;
alter table public.boss_runs add constraint boss_runs_boss_id_check check (boss_id in ('guardian', 'raja_rafflesia', 'abacus_titan'));

create or replace function public.boss_island(p_boss text) returns text
language sql immutable set search_path = '' as $$
  select case p_boss when 'raja_rafflesia' then 'science_island' when 'abacus_titan' then 'mathematics_mountains' end
$$;

-- The Guardian's science round named a subject no question uses; environmental science questions now count.
create or replace function public.boss_round_subjects(p_round int) returns text[]
language sql immutable set search_path = '' as $$
  select case p_round
    when 1 then array['mathematics', 'additional_mathematics', 'advanced_mathematics', 'calculus', 'statistics']
    when 2 then array['science', 'biology', 'chemistry', 'physics', 'environmental_science']
    when 3 then array['english', 'malay_language', 'literature', 'critical_thinking', 'general_knowledge', 'reading', 'writing']
    else null
  end
$$;

-- Guardian rounds as before. Island bosses: rounds 1-3 draw the island's subjects, first at difficulty ≥ round
-- (pass 0); round 4 mixes the island with general knowledge. The Guardian's fallbacks follow in every case.
-- Without p_boss the player's active run decides, so answer_boss keeps its boss.
drop function public.pick_boss_question(uuid, int);
create function public.pick_boss_question(p_user uuid, p_round int, p_boss text default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_level text;
  v_drafts boolean;
  v_recent text[];
  v_boss text := p_boss;
  v_subjects text[];
  v_id text;
begin
  if v_boss is null then
    select boss_id into v_boss from public.boss_runs where user_id = p_user and status = 'active';
  end if;
  v_boss := coalesce(v_boss, 'guardian');
  if v_boss = 'guardian' then
    v_subjects := public.boss_round_subjects(p_round);
  else
    select subject_ids into v_subjects from public.islands where id = public.boss_island(v_boss);
  end if;

  select level_id into v_level from public.academic_profiles where user_id = p_user;
  select allow_draft_questions into v_drafts from public.app_settings;
  select coalesce(array_agg(question_id), '{}') into v_recent
  from (select question_id from public.question_attempts where user_id = p_user order by created_at desc limit 10) r;

  for pass in 0..4 loop
    continue when pass = 0 and (v_boss = 'guardian' or p_round > 3);
    select q.id into v_id
    from public.questions q
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass in (2, 4) or not (q.id = any (v_recent)))
      and (pass <> 0 or (q.subject_id = any (v_subjects) and q.difficulty >= p_round))
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
    'run_id', r.id, 'boss_id', r.boss_id, 'round', r.round, 'rounds', 4, 'round_progress', r.round_progress, 'per_round', 3,
    'hearts', r.hearts, 'status', r.status,
    'question', case when r.status = 'active' then public.question_payload(r.current_question_id) end)
$$;

drop function public.start_boss();
create function public.start_boss(p_boss text default 'guardian') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_boss is null or p_boss not in ('guardian', 'raja_rafflesia', 'abacus_titan') then
    raise exception 'Unknown boss' using errcode = '22023';
  end if;
  -- An unfinished run (of any boss) resumes, as before.
  select * into v_run from public.boss_runs where user_id = v_uid and status = 'active';
  if found then return public.boss_state(v_run); end if;
  if p_boss <> 'guardian' and coalesce((select level from public.player_xp where user_id = v_uid), 1) < 5 then
    raise exception 'Reach level 5 to challenge this boss' using errcode = 'P0001';
  end if;
  begin
    insert into public.boss_runs (user_id, boss_id, current_question_id, question_served_at)
    values (v_uid, p_boss, public.pick_boss_question(v_uid, 1, p_boss), now())
    returning * into v_run;
  exception when unique_violation then
    select * into v_run from public.boss_runs where user_id = v_uid and status = 'active';
  end;
  return public.boss_state(v_run);
end $$;

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke execute on function public.pick_question(uuid, text), public.pick_boss_question(uuid, int, text), public.boss_island(text)
  from public, anon, authenticated;
revoke execute on function public.start_boss(text) from public, anon;
grant execute on function public.start_boss(text) to authenticated;
