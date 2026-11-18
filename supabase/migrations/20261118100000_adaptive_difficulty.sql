-- Adaptive difficulty (Elo): each question has a rating and each player a skill per subject; both move after every
-- battle and boss answer, and questions are picked near a target chance of a right answer (about 3 in 4).

create table public.question_ratings (
  question_id text primary key references public.questions (id) on delete cascade,
  rating numeric not null,
  answers int not null default 0
);
create table public.player_skill (
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id text not null references public.subjects (id),
  rating numeric not null default 0,
  answers int not null default 0,
  primary key (user_id, subject_id)
);
revoke all on public.question_ratings, public.player_skill from anon, authenticated;
grant select on public.question_ratings, public.player_skill to authenticated;
alter table public.question_ratings enable row level security;
alter table public.player_skill enable row level security;
create policy "ratings are public" on public.question_ratings for select to authenticated using (true);
create policy "own row" on public.player_skill for select to authenticated using (user_id = (select auth.uid()));

------------------------------------------------------------------------------------------
-- Pure rules
------------------------------------------------------------------------------------------
-- Chance of a right answer for skill theta against question rating beta (logistic, in logits).
create or replace function public.elo_p(p_theta numeric, p_beta numeric) returns numeric
language sql immutable set search_path = '' as $$ select 1 / (1 + exp(-(p_theta - p_beta))) $$;

-- Step size that shrinks as more answers are seen.
create or replace function public.elo_k(p_n int, p_a numeric) returns numeric
language sql immutable set search_path = '' as $$ select p_a / (1 + 0.05 * greatest(p_n, 0)) $$;

-- How well a predicted chance fits the target (1 at the target, falling off with a 0.12 spread).
create or replace function public.difficulty_fit(p_p numeric, p_target numeric) returns numeric
language sql immutable set search_path = '' as $$ select exp(-power(p_p - p_target, 2) / (2 * 0.0144)) $$;

create or replace function public.base_rating(p_difficulty int) returns numeric
language sql immutable set search_path = '' as $$ select (coalesce(p_difficulty, 3) - 3) * 0.5 $$;

create or replace function public.pick_target(p_kind text, p_young boolean) returns numeric
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'boss' then 0.625
    when 'returning' then case when p_young then 0.9 else 0.875 end
    else case when p_young then 0.85 else 0.775 end
  end
$$;

------------------------------------------------------------------------------------------
-- Every battle and boss answer moves the player's skill and the question's rating
------------------------------------------------------------------------------------------
create or replace function public.rate_attempt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_subject text;
  v_difficulty int;
  v_theta numeric;
  v_n int;
  v_beta numeric;
  v_m int;
  v_p numeric;
  v_r int := case when new.correct then 1 else 0 end;
begin
  -- A repeat of a question answered right in the last day was remembered, not reasoned: it moves nothing.
  if exists (select 1 from public.question_attempts a where a.user_id = new.user_id and a.question_id = new.question_id
             and a.id < new.id and a.correct and a.created_at > new.created_at - interval '24 hours') then
    return null;
  end if;
  select subject_id, difficulty into v_subject, v_difficulty from public.questions where id = new.question_id;
  select rating, answers into v_theta, v_n from public.player_skill where user_id = new.user_id and subject_id = v_subject;
  select rating, answers into v_beta, v_m from public.question_ratings where question_id = new.question_id;
  v_theta := coalesce(v_theta, 0);
  v_n := coalesce(v_n, 0);
  v_beta := coalesce(v_beta, public.base_rating(v_difficulty));
  v_m := coalesce(v_m, 0);
  v_p := public.elo_p(v_theta, v_beta);
  insert into public.player_skill (user_id, subject_id, rating, answers)
  values (new.user_id, v_subject, v_theta + public.elo_k(v_n, 1.8) * (v_r - v_p), 1)
  on conflict (user_id, subject_id) do update set rating = excluded.rating, answers = public.player_skill.answers + 1;
  insert into public.question_ratings (question_id, rating, answers)
  values (new.question_id, v_beta - public.elo_k(v_m, 1.0) * (v_r - v_p), 1)
  on conflict (question_id) do update set rating = excluded.rating, answers = public.question_ratings.answers + 1;
  return null;
end $$;
create trigger question_attempts_rate after insert on public.question_attempts for each row execute function public.rate_attempt();

------------------------------------------------------------------------------------------
-- Picking near the target (from 20261117120000_returning_monsters.sql and 20261116090000_islands.sql)
------------------------------------------------------------------------------------------
create or replace function public.pick_question(p_user uuid, p_monster text default null, p_returning boolean default null) returns text
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
  v_target numeric;
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
  -- Aim for questions this player gets right about three times in four (easier for Returning and young players).
  v_target := public.pick_target(case when coalesce(v_returning, false) then 'returning' else 'normal' end,
    public.age_band_for((select birth_year from public.profiles where id = p_user)) = 'under13');
  select i.subject_ids, i.id into v_island, v_island_id from public.monsters m join public.islands i on i.id = m.island_id where m.id = v_monster;

  -- A Returning battle asks the island's due topics first (a different question than last time when there is one).
  if coalesce(v_returning, false) then
    select q.id into v_id
    from public.questions q join public.due_topics(p_user) d on d.subject_id = q.subject_id and d.topic = q.topic
    left join public.player_skill s on s.user_id = p_user and s.subject_id = q.subject_id
    left join public.question_ratings r on r.question_id = q.id
    where d.island_id = v_island_id and public.question_open_to(p_user, q.status, q.level_ids)
    order by (q.id = any (v_recent)), -ln(1 - random()) / public.difficulty_fit(public.elo_p(coalesce(s.rating, 0), coalesce(r.rating, public.base_rating(q.difficulty))), v_target)
    limit 1;
    if v_id is not null then return v_id; end if;
  end if;

  for pass in 1..5 loop
    continue when pass <= 2 and v_island is null;
    -- Weighted random choice (exponential race): smaller key wins, higher weight gives smaller keys.
    select q.id into v_id
    from public.questions q
    left join public.topic_mastery m on m.user_id = p_user and m.subject_id = q.subject_id and m.topic = q.topic
    left join public.player_skill s on s.user_id = p_user and s.subject_id = q.subject_id
    left join public.question_ratings r on r.question_id = q.id
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass in (2, 5) or not (q.id = any (v_recent)))
      and (pass > 2 or q.subject_id = any (v_island))
      and (pass <> 3 or q.subject_id = any (coalesce(v_subjects, '{}')))
    order by -ln(1 - random()) / (public.question_weight(m.mastery) * public.difficulty_fit(public.elo_p(coalesce(s.rating, 0), coalesce(r.rating, public.base_rating(q.difficulty))), v_target))
    limit 1;
    exit when v_id is not null;
  end loop;

  if v_id is null then
    raise exception 'No questions are available yet' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

create or replace function public.pick_boss_question(p_user uuid, p_round int, p_boss text default null) returns text
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
    left join public.player_skill s on s.user_id = p_user and s.subject_id = q.subject_id
    left join public.question_ratings r on r.question_id = q.id
    where (q.status = 'published' or (coalesce(v_drafts, false) and q.status in ('in_review', 'approved')))
      and (v_level is null or v_level = any (q.level_ids))
      and (pass in (2, 4) or not (q.id = any (v_recent)))
      and (pass <> 0 or (q.subject_id = any (v_subjects) and q.difficulty >= p_round))
      and (pass >= 3 or v_subjects is null or q.subject_id = any (v_subjects) or q.subject_id = 'general_knowledge')
    order by (case when v_subjects is not null and q.subject_id = any (v_subjects) then 0 else 1 end),
      -ln(1 - random()) / public.difficulty_fit(public.elo_p(coalesce(s.rating, 0), coalesce(r.rating, public.base_rating(q.difficulty))), public.pick_target('boss', false))
    limit 1;
    exit when v_id is not null;
  end loop;
  if v_id is null then raise exception 'No questions are available yet' using errcode = 'P0001'; end if;
  return v_id;
end $$;

revoke execute on function public.rate_attempt() from public, anon, authenticated;
revoke execute on function public.elo_p(numeric, numeric), public.elo_k(int, numeric), public.difficulty_fit(numeric, numeric),
  public.base_rating(int), public.pick_target(text, boolean) from public, anon;
grant execute on function public.elo_p(numeric, numeric), public.elo_k(int, numeric), public.difficulty_fit(numeric, numeric),
  public.base_rating(int), public.pick_target(text, boolean) to authenticated;
