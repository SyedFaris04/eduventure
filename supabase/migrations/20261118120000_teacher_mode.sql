-- Teacher mode: classes with a join code, class quests on a topic, and a class report. Players under 18 join only after
-- a parent has approved their account. Teachers see members' learning data only (never email or age).

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40),
  school text check (school is null or char_length(btrim(school)) between 2 and 80),
  code text not null unique,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);
create index classes_teacher on public.classes (teacher_id);
create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);
create index class_members_student on public.class_members (student_id);
create table public.class_quests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  subject_id text not null references public.subjects (id),
  topic text not null,
  tp int check (tp between 1 and 6),
  target int not null check (target between 5 and 30),
  due_on date not null,
  created_at timestamptz not null default now()
);
create index class_quests_class on public.class_quests (class_id);
revoke all on public.classes, public.class_members, public.class_quests from anon, authenticated;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;
alter table public.class_quests enable row level security;

------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------
create or replace function public.is_teacher_account(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user is not null and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
    and public.age_band_for((select birth_year from public.profiles where id = p_user)) = 'adult'
$$;

create or replace function public.own_class(p_class uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.classes where id = p_class and teacher_id = auth.uid() and archived_at is null) then
    raise exception 'Not your class' using errcode = '42501';
  end if;
end $$;

-- Right battle answers on the quest's topic since it was set (at its TP or above when it has one).
create or replace function public.quest_progress(p_student uuid, p_quest uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.class_quests cq
  join public.question_attempts a on a.user_id = p_student and a.correct and a.created_at >= cq.created_at
  join public.questions q on q.id = a.question_id and q.subject_id = cq.subject_id and q.topic = cq.topic and (cq.tp is null or q.tp >= cq.tp)
  where cq.id = p_quest
$$;

-- Open quest topics come up four times as often in this player's battles.
create or replace function public.quest_boost(p_user uuid, p_subject text, p_topic text) returns numeric
language sql stable security definer set search_path = '' as $$
  select case when exists (
    select 1 from public.class_members m
    join public.classes c on c.id = m.class_id and c.archived_at is null
    join public.class_quests cq on cq.class_id = m.class_id
    where m.student_id = p_user and cq.subject_id = p_subject and cq.topic = p_topic
      and cq.due_on >= public.local_today(p_user)
      and public.quest_progress(p_user, cq.id) < cq.target
  ) then 4 else 1 end
$$;

------------------------------------------------------------------------------------------
-- Teacher side
------------------------------------------------------------------------------------------
create or replace function public.create_class(p_name text, p_school text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_id uuid;
begin
  if not public.is_teacher_account(v_uid) then raise exception 'Sign in with a teacher account (18 or older, not a guest)' using errcode = '42501'; end if;
  loop
    v_code := (select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '') from generate_series(1, 8));
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    exit when not exists (select 1 from public.classes where code = v_code);
  end loop;
  insert into public.classes (teacher_id, name, school, code) values (v_uid, btrim(p_name), nullif(btrim(coalesce(p_school, '')), ''), v_code)
  returning id into v_id;
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'create_class', v_id::text, '{}'::jsonb);
  return jsonb_build_object('id', v_id, 'code', v_code);
end $$;

create or replace function public.my_classes() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'school', c.school, 'code', c.code,
    'members', (select count(*) from public.class_members m where m.class_id = c.id)) order by c.created_at desc), '[]'::jsonb)
  from public.classes c where c.teacher_id = auth.uid() and c.archived_at is null
$$;

create or replace function public.archive_class(p_class uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_class(p_class);
  update public.classes set archived_at = now() where id = p_class;
  delete from public.class_members where class_id = p_class;
end $$;

create or replace function public.remove_student(p_class uuid, p_student uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_class(p_class);
  delete from public.class_members where class_id = p_class and student_id = p_student;
end $$;

-- Topics a quest can be set on: every topic with an askable question, with its curriculum tag.
create or replace function public.quest_catalog() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('subject', subject_id, 'topic', topic, 'questions', n, 'curriculum', curriculum)
    order by subject_id, topic), '[]'::jsonb)
  from (
    select q.subject_id, q.topic, count(*) as n, (array_agg(q.curriculum) filter (where q.curriculum is not null))[1] as curriculum
    from public.questions q
    where q.status = 'published' or (coalesce((select allow_draft_questions from public.app_settings), false) and q.status in ('in_review', 'approved'))
    group by q.subject_id, q.topic
  ) t
$$;

create or replace function public.create_quest(p_class uuid, p_subject text, p_topic text, p_tp int, p_target int, p_due date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  perform public.own_class(p_class);
  if p_target is null or p_target not between 5 and 30 then raise exception 'Choose between 5 and 30 right answers' using errcode = '22023'; end if;
  if p_tp is not null and p_tp not between 1 and 6 then raise exception 'TP must be 1 to 6' using errcode = '22023'; end if;
  if p_due is null or p_due < current_date then raise exception 'The due date has passed' using errcode = '22023'; end if;
  if not exists (select 1 from public.questions where subject_id = p_subject and topic = p_topic and (p_tp is null or tp >= p_tp)) then
    raise exception 'No questions for that topic' using errcode = '22023';
  end if;
  insert into public.class_quests (class_id, subject_id, topic, tp, target, due_on) values (p_class, p_subject, p_topic, p_tp, p_target, p_due)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.delete_quest(p_quest uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_class((select class_id from public.class_quests where id = p_quest));
  delete from public.class_quests where id = p_quest;
end $$;

create or replace function public.class_report(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_since timestamptz := date_trunc('week', now());
begin
  perform public.own_class(p_class);
  return jsonb_build_object(
    'quests', (select coalesce(jsonb_agg(jsonb_build_object('id', cq.id, 'subject', cq.subject_id, 'topic', cq.topic, 'tp', cq.tp,
                 'target', cq.target, 'due_on', cq.due_on,
                 'finished', (select count(*) from public.class_members m where m.class_id = p_class and public.quest_progress(m.student_id, cq.id) >= cq.target))
               order by cq.due_on), '[]'::jsonb)
               from public.class_quests cq where cq.class_id = p_class and cq.due_on >= current_date - 7),
    'students', (select coalesce(jsonb_agg(jsonb_build_object('student_id', m.student_id, 'name', ch.name,
                 'days', (select count(*) from public.learning_days d where d.user_id = m.student_id and d.day >= v_since::date),
                 'questions', (select count(*) from public.question_attempts a where a.user_id = m.student_id and a.created_at >= v_since),
                 'correct', (select count(*) from public.question_attempts a where a.user_id = m.student_id and a.created_at >= v_since and a.correct),
                 'quests', (select coalesce(jsonb_agg(jsonb_build_object('quest_id', cq.id, 'progress', public.quest_progress(m.student_id, cq.id))), '[]'::jsonb)
                            from public.class_quests cq where cq.class_id = p_class and cq.due_on >= current_date - 7))
               order by ch.name nulls last), '[]'::jsonb)
               from public.class_members m left join public.characters ch on ch.user_id = m.student_id where m.class_id = p_class));
end $$;

------------------------------------------------------------------------------------------
-- Student side
------------------------------------------------------------------------------------------
create or replace function public.join_class(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_class public.classes;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_class from public.classes
  where replace(code, '-', '') = upper(replace(btrim(coalesce(p_code, '')), '-', '')) and archived_at is null;
  if not found then raise exception 'That class code is not valid' using errcode = 'P0001'; end if;
  if v_class.teacher_id = v_uid then raise exception 'This is your own class' using errcode = 'P0001'; end if;
  if public.needs_guardian(v_uid) and not exists (select 1 from public.guardianships where child_id = v_uid) then
    raise exception 'A parent must approve your account before you join a class' using errcode = 'P0001';
  end if;
  insert into public.class_members (class_id, student_id) values (v_class.id, v_uid) on conflict do nothing;
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'join_class', v_class.id::text, '{}'::jsonb);
  return jsonb_build_object('class_id', v_class.id, 'name', v_class.name);
end $$;

create or replace function public.leave_class(p_class uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.class_members where class_id = p_class and student_id = auth.uid()
$$;

create or replace function public.my_student_classes() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('class_id', c.id, 'name', c.name, 'school', c.school,
    'quests', (select coalesce(jsonb_agg(jsonb_build_object('id', cq.id, 'subject', cq.subject_id, 'topic', cq.topic, 'tp', cq.tp,
                 'target', cq.target, 'due_on', cq.due_on, 'island', public.topic_island(cq.subject_id),
                 'progress', public.quest_progress(auth.uid(), cq.id)) order by cq.due_on), '[]'::jsonb)
               from public.class_quests cq where cq.class_id = c.id and cq.due_on >= public.local_today(auth.uid())))
    order by m.joined_at), '[]'::jsonb)
  from public.class_members m join public.classes c on c.id = m.class_id and c.archived_at is null
  where m.student_id = auth.uid()
$$;

------------------------------------------------------------------------------------------
-- Parent side
------------------------------------------------------------------------------------------
create or replace function public.child_classes(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.own_child(p_child);
  return (select coalesce(jsonb_agg(jsonb_build_object('class_id', c.id, 'name', c.name, 'school', c.school) order by m.joined_at), '[]'::jsonb)
          from public.class_members m join public.classes c on c.id = m.class_id and c.archived_at is null where m.student_id = p_child);
end $$;

create or replace function public.guardian_remove_class(p_child uuid, p_class uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_child(p_child);
  delete from public.class_members where class_id = p_class and student_id = p_child;
  insert into public.audit_logs (actor_id, action, target, data) values (auth.uid(), 'guardian_remove_class', p_child::text, jsonb_build_object('class', p_class));
end $$;

-- A parent removing their approval also takes the child out of every class.
create or replace function public.leave_classes_on_unlink() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.class_members where student_id = old.child_id;
  return old;
end $$;
create trigger guardianships_unlink after delete on public.guardianships for each row execute function public.leave_classes_on_unlink();

------------------------------------------------------------------------------------------
-- Question picking: open quest topics weighted up (from 20261118100000_adaptive_difficulty.sql)
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
    order by -ln(1 - random()) / (public.question_weight(m.mastery) * public.quest_boost(p_user, q.subject_id, q.topic) * public.difficulty_fit(public.elo_p(coalesce(s.rating, 0), coalesce(r.rating, public.base_rating(q.difficulty))), v_target))
    limit 1;
    exit when v_id is not null;
  end loop;

  if v_id is null then
    raise exception 'No questions are available yet' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

revoke execute on function public.create_class(text, text), public.my_classes(), public.archive_class(uuid), public.remove_student(uuid, uuid),
  public.quest_catalog(), public.create_quest(uuid, text, text, int, int, date), public.delete_quest(uuid), public.class_report(uuid),
  public.join_class(text), public.leave_class(uuid), public.my_student_classes(), public.child_classes(uuid),
  public.guardian_remove_class(uuid, uuid) from public, anon;
grant execute on function public.create_class(text, text), public.my_classes(), public.archive_class(uuid), public.remove_student(uuid, uuid),
  public.quest_catalog(), public.create_quest(uuid, text, text, int, int, date), public.delete_quest(uuid), public.class_report(uuid),
  public.join_class(text), public.leave_class(uuid), public.my_student_classes(), public.child_classes(uuid),
  public.guardian_remove_class(uuid, uuid) to authenticated;
revoke execute on function public.is_teacher_account(uuid), public.own_class(uuid), public.quest_progress(uuid, uuid),
  public.quest_boost(uuid, text, text), public.leave_classes_on_unlink() from public, anon, authenticated;
