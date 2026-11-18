-- Parent approval for players under 18 (Malaysia PDPA; UK Children's Code): the child shares a code, a parent approves
-- on their own account, sets a daily play limit and reads a weekly report. Play time is counted here and the limit is
-- enforced when a battle, boss run or lesson starts. Learning stays playable while approval is pending.

create table public.guardian_codes (
  child_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null
);
create table public.guardianships (
  child_id uuid primary key references auth.users (id) on delete cascade,
  guardian_id uuid not null references auth.users (id) on delete cascade,
  approved_at timestamptz not null default now(),
  daily_limit int check (daily_limit in (30, 60, 90, 120))
);
create index guardianships_guardian on public.guardianships (guardian_id);
create table public.play_minutes (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  minutes int not null default 0,
  last_ping timestamptz not null default now(),
  primary key (user_id, day)
);
revoke all on public.guardian_codes, public.guardianships, public.play_minutes from anon, authenticated;
alter table public.guardian_codes enable row level security;
alter table public.guardianships enable row level security;
alter table public.play_minutes enable row level security;

------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------
create or replace function public.needs_guardian(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select public.age_band_for((select birth_year from public.profiles where id = p_user)) in ('under13', 'teen')
$$;

-- Minutes left today, or null when there is no limit.
create or replace function public.play_left(p_minutes int, p_limit int) returns int
language sql immutable set search_path = '' as $$
  select case when p_limit is null then null else greatest(p_limit - coalesce(p_minutes, 0), 0) end
$$;

create or replace function public.minutes_today(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select minutes from public.play_minutes where user_id = p_user and day = public.local_today(p_user)), 0)
$$;

create or replace function public.daily_limit_of(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select daily_limit from public.guardianships where child_id = p_user
$$;

------------------------------------------------------------------------------------------
-- Child side
------------------------------------------------------------------------------------------
create or replace function public.request_guardian_code() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_code text;
  v_expires timestamptz := now() + interval '7 days';
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not public.needs_guardian(v_uid) then raise exception 'Only players under 18 need a parent' using errcode = 'P0001'; end if;
  if exists (select 1 from public.guardianships where child_id = v_uid) then
    raise exception 'A parent has already approved this account' using errcode = 'P0001';
  end if;
  loop
    v_code := (select string_agg(substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1), '') from generate_series(1, 8));
    v_code := substr(v_code, 1, 4) || '-' || substr(v_code, 5, 4);
    exit when not exists (select 1 from public.guardian_codes where code = v_code);
  end loop;
  insert into public.guardian_codes (child_id, code, expires_at) values (v_uid, v_code, v_expires)
  on conflict (child_id) do update set code = excluded.code, expires_at = excluded.expires_at;
  return jsonb_build_object('code', v_code, 'expires_at', v_expires);
end $$;

create or replace function public.my_guardian() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code public.guardian_codes;
  v_limit int;
  v_minutes int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_minutes := public.minutes_today(v_uid);
  if not public.needs_guardian(v_uid) then
    return jsonb_build_object('status', 'not_needed', 'minutes_today', v_minutes);
  end if;
  if exists (select 1 from public.guardianships where child_id = v_uid) then
    v_limit := public.daily_limit_of(v_uid);
    return jsonb_build_object('status', 'approved', 'daily_limit', v_limit, 'minutes_today', v_minutes,
      'minutes_left', public.play_left(v_minutes, v_limit));
  end if;
  select * into v_code from public.guardian_codes where child_id = v_uid and expires_at > now();
  if found then
    return jsonb_build_object('status', 'pending', 'code', v_code.code, 'expires_at', v_code.expires_at, 'minutes_today', v_minutes);
  end if;
  return jsonb_build_object('status', 'none', 'minutes_today', v_minutes);
end $$;

-- Counts at most one minute per 50 seconds, in the player's own day.
create or replace function public.note_play() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_minutes int;
  v_limit int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_today := public.local_today(v_uid);
  insert into public.play_minutes (user_id, day, minutes, last_ping) values (v_uid, v_today, 1, now())
  on conflict (user_id, day) do update set
    minutes = public.play_minutes.minutes + case when public.play_minutes.last_ping <= now() - interval '50 seconds' then 1 else 0 end,
    last_ping = case when public.play_minutes.last_ping <= now() - interval '50 seconds' then now() else public.play_minutes.last_ping end
  returning minutes into v_minutes;
  v_limit := public.daily_limit_of(v_uid);
  return jsonb_build_object('minutes_today', v_minutes, 'daily_limit', v_limit, 'minutes_left', public.play_left(v_minutes, v_limit));
end $$;

-- New battles, boss runs and lessons wait for tomorrow once the parent's limit is reached (resuming is allowed).
create or replace function public.check_play_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.play_left(public.minutes_today(new.user_id), public.daily_limit_of(new.user_id)) = 0 then
    raise exception 'Time''s up for today — see you tomorrow!' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger encounters_play_limit before insert on public.encounters for each row execute function public.check_play_limit();
create trigger boss_runs_play_limit before insert on public.boss_runs for each row execute function public.check_play_limit();
create trigger lesson_attempts_play_limit before insert on public.lesson_attempts for each row execute function public.check_play_limit();

------------------------------------------------------------------------------------------
-- Parent side
------------------------------------------------------------------------------------------
create or replace function public.approve_child(p_code text, p_confirm boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_code text := upper(replace(btrim(coalesce(p_code, '')), '-', ''));
  v_child uuid;
begin
  if v_uid is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Sign in with a parent account' using errcode = '42501';
  end if;
  if public.age_band_for((select birth_year from public.profiles where id = v_uid)) <> 'adult' then
    raise exception 'Parents must be 18 or older' using errcode = 'P0001';
  end if;
  if not coalesce(p_confirm, false) then raise exception 'Please confirm you are the parent or guardian' using errcode = 'P0001'; end if;
  select child_id into v_child from public.guardian_codes where replace(code, '-', '') = v_code and expires_at > now();
  if v_child is null then raise exception 'That code is not valid or has expired' using errcode = 'P0001'; end if;
  if v_child = v_uid then raise exception 'You cannot approve your own account' using errcode = 'P0001'; end if;
  if exists (select 1 from public.guardianships where child_id = v_child) then
    raise exception 'This child already has a parent' using errcode = 'P0001';
  end if;
  insert into public.guardianships (child_id, guardian_id) values (v_child, v_uid);
  delete from public.guardian_codes where child_id = v_child;
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'approve_child', v_child::text, '{}'::jsonb);
  return jsonb_build_object('child_name', (select name from public.characters where user_id = v_child));
end $$;

create or replace function public.own_child(p_child uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.guardianships where child_id = p_child and guardian_id = auth.uid()) then
    raise exception 'Not your child' using errcode = '42501';
  end if;
end $$;

create or replace function public.my_children() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('child_id', g.child_id, 'name', c.name, 'approved_at', g.approved_at,
    'daily_limit', g.daily_limit) order by g.approved_at), '[]'::jsonb)
  from public.guardianships g left join public.characters c on c.user_id = g.child_id
  where g.guardian_id = auth.uid()
$$;

create or replace function public.set_child_limit(p_child uuid, p_minutes int) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_child(p_child);
  if p_minutes is not null and p_minutes not in (30, 60, 90, 120) then raise exception 'Choose 30, 60, 90 or 120 minutes' using errcode = '22023'; end if;
  update public.guardianships set daily_limit = p_minutes where child_id = p_child;
  insert into public.audit_logs (actor_id, action, target, data) values (auth.uid(), 'set_child_limit', p_child::text, jsonb_build_object('minutes', p_minutes));
end $$;

create or replace function public.remove_child(p_child uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_child(p_child);
  delete from public.guardianships where child_id = p_child;
  insert into public.audit_logs (actor_id, action, target, data) values (auth.uid(), 'remove_child', p_child::text, '{}'::jsonb);
end $$;

-- This week (Monday to Sunday in the child's own time zone): play, answers, lessons, topics, streak.
create or replace function public.child_report(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date;
  v_monday date;
  v_tz text;
  v_since timestamptz;
  v_days date[];
begin
  perform public.own_child(p_child);
  v_today := public.local_today(p_child);
  v_monday := date_trunc('week', v_today)::date;
  v_tz := coalesce((select timezone from public.user_settings where user_id = p_child), 'UTC');
  v_since := v_monday::timestamp at time zone v_tz;
  select coalesce(array_agg(day), '{}') into v_days from public.learning_days where user_id = p_child;
  return jsonb_build_object(
    'week', (select jsonb_agg(jsonb_build_object('day', v_monday + i,
               'minutes', coalesce((select minutes from public.play_minutes where user_id = p_child and day = v_monday + i), 0),
               'played', (v_monday + i) = any (v_days)) order by i) from generate_series(0, 6) i),
    'questions', (select count(*) from public.question_attempts where user_id = p_child and created_at >= v_since),
    'correct', (select count(*) from public.question_attempts where user_id = p_child and created_at >= v_since and correct),
    'lessons', (select count(*) from public.lesson_rewards where user_id = p_child and created_at >= v_since),
    'strong', (select coalesce(jsonb_agg(topic), '[]'::jsonb) from (select topic from public.topic_mastery
               where user_id = p_child and attempts >= 3 and mastery >= 0.75 order by mastery desc, attempts desc limit 3) s),
    'practise', (select coalesce(jsonb_agg(topic), '[]'::jsonb) from (select topic from public.topic_mastery
               where user_id = p_child and attempts >= 2 and mastery < 0.5 order by mastery, attempts desc limit 3) p),
    'streak', (public.streak_from_days(v_days, v_today) ->> 'current')::int);
end $$;

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke execute on function public.request_guardian_code(), public.my_guardian(), public.note_play(), public.play_left(int, int),
  public.approve_child(text, boolean), public.my_children(), public.set_child_limit(uuid, int), public.remove_child(uuid),
  public.child_report(uuid) from public, anon;
grant execute on function public.request_guardian_code(), public.my_guardian(), public.note_play(), public.play_left(int, int),
  public.approve_child(text, boolean), public.my_children(), public.set_child_limit(uuid, int), public.remove_child(uuid),
  public.child_report(uuid) to authenticated;
revoke execute on function public.needs_guardian(uuid), public.minutes_today(uuid), public.daily_limit_of(uuid),
  public.check_play_limit(), public.own_child(uuid) from public, anon, authenticated;
