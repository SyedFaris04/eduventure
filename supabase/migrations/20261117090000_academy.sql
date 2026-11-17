-- Code Academy: lessons whose Predict and Fix steps are marked here, and a reward paid once per lesson.
-- Learn and Write steps run in the learner's browser; faking them can never earn more than the one-time reward.

------------------------------------------------------------------------------------------
-- Content (filled by generated migrations from content/courses/*.json)
------------------------------------------------------------------------------------------
create table public.courses (
  id text primary key,
  language text not null check (language in ('python', 'javascript')),
  title text not null,
  sort int not null
);

create table public.lessons (
  id text primary key,
  course_id text not null references public.courses (id),
  unit_index int not null check (unit_index >= 1),
  unit_title text not null,
  lesson_index int not null check (lesson_index >= 1),
  title text not null,
  objective text not null,
  status text not null check (status in ('draft', 'in_review', 'approved', 'published', 'rejected')),
  version int not null default 1,
  source_name text not null,
  license text not null
);

-- What the browser may see: never a Predict answer, a Fix line, an explanation or a Write solution.
create table public.lesson_steps (
  id text primary key,
  lesson_id text not null references public.lessons (id) on delete cascade,
  step_index int not null,
  kind text not null check (kind in ('learn', 'predict', 'fix', 'write')),
  text text not null,
  code text,
  options jsonb,
  broken_line int,
  starter text,
  expected_output text,
  must_use text[],
  hint text
);
create index lesson_steps_lesson on public.lesson_steps (lesson_id, step_index);

-- Server-only: predict {choice}|{text}, fix {accept: [...]}; explanation; write solution.
create table public.lesson_step_keys (
  step_id text primary key references public.lesson_steps (id) on delete cascade,
  answer jsonb,
  explanation text,
  solution text
);

------------------------------------------------------------------------------------------
-- Play
------------------------------------------------------------------------------------------
create table public.lesson_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed')),
  last_answer_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index lesson_attempts_one_active on public.lesson_attempts (user_id, lesson_id) where status = 'active';

create table public.lesson_step_results (
  attempt_id uuid not null references public.lesson_attempts (id) on delete cascade,
  step_id text not null references public.lesson_steps (id) on delete cascade,
  correct boolean not null default false,
  tries int not null default 0,
  primary key (attempt_id, step_id)
);

create table public.lesson_rewards (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  xp int not null,
  gold int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------
-- Published lessons, plus drafts while the development flag allows them (same flag as questions).
create or replace function public.lesson_visible(p_status text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_status = 'published' or (coalesce((select allow_draft_questions from public.app_settings), false) and p_status in ('in_review', 'approved'))
$$;

-- Same rules as src/features/academy/codeText.ts (tests/rls/academy.test.ts checks they agree).
create or replace function public.norm_code(p text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(regexp_replace(btrim(coalesce(p, '')), '\s+', ' ', 'g'), '\s*([()\[\]{},:;=+*/<>!-])\s*', '\1', 'g')
$$;

create or replace function public.norm_output(p text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(
    array_to_string(array(select regexp_replace(l, '\s+$', '') from unnest(string_to_array(replace(coalesce(p, ''), E'\r', ''), E'\n')) with ordinality t(l, n) order by n), E'\n'),
    E'\n+$', '')
$$;

create or replace function public.own_attempt(p_attempt uuid) returns public.lesson_attempts
language plpgsql stable security definer set search_path = '' as $$
declare
  v public.lesson_attempts;
begin
  select * into v from public.lesson_attempts where id = p_attempt and user_id = auth.uid();
  if not found then raise exception 'Lesson attempt not found' using errcode = 'P0002'; end if;
  return v;
end $$;

------------------------------------------------------------------------------------------
-- Client API
------------------------------------------------------------------------------------------
create or replace function public.start_lesson(p_lesson text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_l public.lessons;
  v_a public.lesson_attempts;
  v_missing int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_l from public.lessons where id = p_lesson;
  if not found or not public.lesson_visible(v_l.status) then raise exception 'Lesson not found' using errcode = 'P0002'; end if;

  -- Units open in order: every lesson of the earlier units must be finished first.
  select min(x.unit_index) into v_missing from public.lessons x
  where x.course_id = v_l.course_id and x.unit_index < v_l.unit_index and public.lesson_visible(x.status)
    and not exists (select 1 from public.lesson_rewards r where r.user_id = v_uid and r.lesson_id = x.id);
  if v_missing is not null then raise exception 'Finish unit % first', v_missing using errcode = 'P0001'; end if;

  select * into v_a from public.lesson_attempts where user_id = v_uid and lesson_id = p_lesson and status = 'active';
  if not found then
    begin
      insert into public.lesson_attempts (user_id, lesson_id) values (v_uid, p_lesson) returning * into v_a;
    exception when unique_violation then
      select * into v_a from public.lesson_attempts where user_id = v_uid and lesson_id = p_lesson and status = 'active';
    end;
  end if;

  return jsonb_build_object(
    'attempt_id', v_a.id,
    'lesson', jsonb_build_object('id', v_l.id, 'title', v_l.title, 'course_id', v_l.course_id, 'unit_index', v_l.unit_index, 'lesson_index', v_l.lesson_index),
    'steps', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'kind', s.kind, 'text', s.text, 'code', s.code, 'options', s.options, 'broken_line', s.broken_line,
        'starter', s.starter, 'expected_output', s.expected_output, 'must_use', to_jsonb(s.must_use), 'hint', s.hint) order by s.step_index), '[]')
      from public.lesson_steps s where s.lesson_id = v_l.id),
    'results', (select coalesce(jsonb_agg(jsonb_build_object('step_id', r.step_id, 'correct', r.correct, 'tries', r.tries)), '[]')
      from public.lesson_step_results r where r.attempt_id = v_a.id));
end $$;

create or replace function public.answer_lesson_step(p_attempt uuid, p_step text, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.lesson_attempts;
  v_s public.lesson_steps;
  v_k public.lesson_step_keys;
  v_correct boolean;
  v_tries int;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  perform 1 from public.lesson_attempts where id = v_a.id for update;
  if v_a.status <> 'active' then raise exception 'This lesson has ended' using errcode = 'P0001'; end if;
  select * into v_s from public.lesson_steps where id = p_step and lesson_id = v_a.lesson_id;
  if not found then raise exception 'Step not found' using errcode = 'P0002'; end if;
  if v_s.kind not in ('predict', 'fix') then raise exception 'This step is checked on your device' using errcode = '22023'; end if;
  if v_a.last_answer_at is not null and now() - v_a.last_answer_at < interval '1 second' then
    raise exception 'Too fast: take a moment to think' using errcode = 'P0001';
  end if;

  select * into v_k from public.lesson_step_keys where step_id = v_s.id;
  v_correct := case
    when v_s.kind = 'fix' then public.norm_code(p_answer ->> 'line') in (select public.norm_code(x) from jsonb_array_elements_text(v_k.answer -> 'accept') x)
    when v_k.answer ? 'choice' then (p_answer ->> 'choice') = (v_k.answer ->> 'choice')
    else public.norm_output(p_answer ->> 'text') = public.norm_output(v_k.answer ->> 'text')
  end;
  v_correct := coalesce(v_correct, false);

  insert into public.lesson_step_results (attempt_id, step_id, correct, tries) values (v_a.id, v_s.id, v_correct, 1)
  on conflict (attempt_id, step_id) do update set correct = public.lesson_step_results.correct or excluded.correct, tries = public.lesson_step_results.tries + 1
  returning tries into v_tries;
  update public.lesson_attempts set last_answer_at = now() where id = v_a.id;

  -- The accepted answer is shown once the learner gets it, or after a second wrong try.
  return jsonb_build_object('correct', v_correct, 'explanation', v_k.explanation,
    'accepted', case when v_correct or v_tries >= 2 then coalesce(v_k.answer -> 'choice', v_k.answer -> 'text', v_k.answer -> 'accept' -> 0) end);
end $$;

create or replace function public.note_write_attempt(p_attempt uuid, p_step text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.lesson_attempts;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  if not exists (select 1 from public.lesson_steps where id = p_step and lesson_id = v_a.lesson_id and kind = 'write') then
    raise exception 'Step not found' using errcode = 'P0002';
  end if;
  insert into public.lesson_step_results (attempt_id, step_id, tries) values (v_a.id, p_step, 1)
  on conflict (attempt_id, step_id) do update set tries = public.lesson_step_results.tries + 1;
end $$;

create or replace function public.lesson_solution(p_attempt uuid, p_step text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.lesson_attempts;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  if coalesce((select tries from public.lesson_step_results where attempt_id = v_a.id and step_id = p_step), 0) < 2 then
    raise exception 'Try twice first' using errcode = 'P0001';
  end if;
  return (select k.solution from public.lesson_step_keys k join public.lesson_steps s on s.id = k.step_id where k.step_id = p_step and s.lesson_id = v_a.lesson_id);
end $$;

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
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  perform 1 from public.lesson_attempts where id = v_a.id for update;
  if v_a.status <> 'active' then raise exception 'This lesson has ended' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.lesson_steps s
    where s.lesson_id = v_a.lesson_id and s.kind in ('predict', 'fix')
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
  end if;
  update public.lesson_attempts set status = 'completed' where id = v_a.id;

  select xp, level into v_xp, v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;
  return jsonb_build_object('first_time', v_first, 'xp', case when v_first then 25 else 0 end, 'gold', case when v_first then 10 else 0 end,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold), 'leveled_up', coalesce(v_level > v_old, false));
end $$;

create or replace function public.my_course_progress(p_course text) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(r.lesson_id order by r.lesson_id), '{}') from public.lesson_rewards r
  join public.lessons l on l.id = r.lesson_id where l.course_id = p_course and r.user_id = auth.uid()
$$;

------------------------------------------------------------------------------------------
-- Review (same transitions and roles as review_question)
------------------------------------------------------------------------------------------
create or replace function public.review_lesson(p_id text, p_action text, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_l public.lessons;
  v_to text;
begin
  if not public.has_role(array['admin', 'educator']) then
    raise exception 'Not allowed: only educators and admins can review lessons' using errcode = '42501';
  end if;
  if p_action in ('publish', 'unpublish') and not public.has_role(array['admin']) then
    raise exception 'Not allowed: only admins can publish' using errcode = '42501';
  end if;
  select * into v_l from public.lessons where id = p_id for update;
  if not found then raise exception 'Lesson % not found', p_id using errcode = 'P0002'; end if;
  v_to := case
    when p_action = 'submit' and v_l.status = 'draft' then 'in_review'
    when p_action = 'approve' and v_l.status = 'in_review' then 'approved'
    when p_action = 'reject' and v_l.status in ('draft', 'in_review', 'approved') then 'rejected'
    when p_action = 'request_changes' and v_l.status in ('in_review', 'approved', 'rejected') then 'draft'
    when p_action = 'publish' and v_l.status = 'approved' then 'published'
    when p_action = 'unpublish' and v_l.status = 'published' then 'approved'
  end;
  if v_to is null then
    raise exception 'Cannot % a lesson that is %', replace(p_action, '_', ' '), replace(v_l.status, '_', ' ') using errcode = 'P0001';
  end if;
  update public.lessons set status = v_to where id = p_id;
  insert into public.audit_logs (actor_id, action, target, data)
  values (auth.uid(), 'lesson.' || p_action, p_id, jsonb_build_object('from', v_l.status, 'to', v_to, 'version', v_l.version, 'note', nullif(btrim(p_note), '')));
  return jsonb_build_object('id', p_id, 'status', v_to);
end $$;

------------------------------------------------------------------------------------------
-- Access
------------------------------------------------------------------------------------------
revoke all on public.courses, public.lessons, public.lesson_steps, public.lesson_step_keys, public.lesson_attempts, public.lesson_step_results, public.lesson_rewards from anon, authenticated;
grant select on public.courses, public.lessons, public.lesson_steps, public.lesson_attempts, public.lesson_step_results, public.lesson_rewards to authenticated;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_steps enable row level security;
alter table public.lesson_step_keys enable row level security;
alter table public.lesson_attempts enable row level security;
alter table public.lesson_step_results enable row level security;
alter table public.lesson_rewards enable row level security;
create policy "courses are public" on public.courses for select to authenticated using (true);
create policy "visible lessons" on public.lessons for select to authenticated using (public.lesson_visible(status));
create policy "steps of visible lessons" on public.lesson_steps for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and public.lesson_visible(l.status)));
create policy "own row" on public.lesson_attempts for select to authenticated using (user_id = (select auth.uid()));
create policy "own row" on public.lesson_step_results for select to authenticated
  using (exists (select 1 from public.lesson_attempts a where a.id = attempt_id and a.user_id = (select auth.uid())));
create policy "own row" on public.lesson_rewards for select to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.lesson_visible(text), public.own_attempt(uuid) from public, anon, authenticated;
revoke execute on function public.start_lesson(text), public.answer_lesson_step(uuid, text, jsonb), public.note_write_attempt(uuid, text),
  public.lesson_solution(uuid, text), public.complete_lesson(uuid), public.my_course_progress(text), public.review_lesson(text, text, text),
  public.norm_code(text), public.norm_output(text) from public, anon;
grant execute on function public.start_lesson(text), public.answer_lesson_step(uuid, text, jsonb), public.note_write_attempt(uuid, text),
  public.lesson_solution(uuid, text), public.complete_lesson(uuid), public.my_course_progress(text), public.review_lesson(text, text, text),
  public.norm_code(text), public.norm_output(text) to authenticated;
