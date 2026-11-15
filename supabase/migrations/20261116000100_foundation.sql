-- Phase 1 foundation: accounts, age bands, academic profiles, characters, progression rows.
-- Security model: every table has RLS. Players may read their own rows; they may write only
-- academic_profiles, characters, user_settings and user_privacy_settings. XP and gold are
-- read-only to players and change only through future security-definer functions.

------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Youngest possible age for a birth year, so protections lean safe. Mirrors ageBandFromBirthYear() in TS.
create or replace function public.age_band_for(p_birth_year int) returns text
language sql stable set search_path = '' as $$
  select case
    when p_birth_year is null then 'unknown'
    when extract(year from now())::int - p_birth_year - 1 < 13 then 'under13'
    when extract(year from now())::int - p_birth_year - 1 < 18 then 'teen'
    else 'adult'
  end
$$;

-- Character appearance is a flat map of short option ids / hex colours, nothing else.
create or replace function public.appearance_ok(a jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(a) = 'object'
    and (select count(*) from jsonb_object_keys(a)) <= 16
    and not exists (
      select 1 from jsonb_each(a) e
      where e.key !~ '^[a-zA-Z]{1,16}$'
         or jsonb_typeof(e.value) <> 'string'
         or (e.value #>> '{}') !~ '^[a-z0-9_#-]{1,24}$'
    )
$$;

------------------------------------------------------------------------------------------
-- Reference data (seeded; read-only through the API)
------------------------------------------------------------------------------------------
create table public.education_levels (
  id text primary key,
  isced text not null,
  sort int not null unique,
  created_at timestamptz not null default now()
);

create table public.countries (
  code char(2) primary key check (code ~ '^[A-Z]{2}$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.curricula (
  id text primary key,
  country_code char(2) references public.countries (code), -- null = international
  name text not null,
  level_ids text[] not null check (cardinality(level_ids) > 0),
  created_at timestamptz not null default now()
);
create index curricula_country_idx on public.curricula (country_code);

create table public.grades (
  id text primary key,
  curriculum_id text not null references public.curricula (id) on delete cascade,
  level_id text not null references public.education_levels (id),
  name text not null,
  sort int not null,
  created_at timestamptz not null default now(),
  unique (curriculum_id, level_id, sort)
);

create table public.subjects (
  id text primary key,
  name text not null,
  level_ids text[] not null check (cardinality(level_ids) > 0),
  created_at timestamptz not null default now()
);

create table public.safe_name_parts (
  kind text not null check (kind in ('adjective', 'noun')),
  part text not null check (part ~ '^[A-Z][a-z]{1,15}$'),
  primary key (kind, part)
);

------------------------------------------------------------------------------------------
-- Per-player tables (row key = auth.users.id)
------------------------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 3 and 24), -- copied from the character name
  birth_year int check (birth_year between 1900 and 2100),               -- age band is always computed, never stored
  is_guest boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  language text not null default 'en' check (language in ('en', 'ms', 'es', 'ar', 'zh', 'fr', 'ja')),
  sound_on boolean not null default false,
  reduced_motion boolean not null default false,
  low_performance boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_privacy_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'friends', 'public')),
  show_online boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parental_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  guardian_email text not null check (guardian_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  chat_mode text not null default 'preset' check (chat_mode in ('preset', 'off')),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academic_profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  level_id text not null references public.education_levels (id),
  country_code char(2) not null references public.countries (code),
  curriculum_id text not null references public.curricula (id),
  grade_id text references public.grades (id),
  language text not null check (language in ('en', 'ms', 'es', 'ar', 'zh', 'fr', 'ja')),
  subject_ids text[] not null check (cardinality(subject_ids) between 1 and 20),
  goals text[] not null default '{}' check (goals <@ array['exam_prep', 'homework_help', 'catch_up', 'get_ahead', 'curiosity', 'career_skills']),
  difficulty smallint not null check (difficulty between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 3 and 24),
  appearance jsonb not null check (public.appearance_ok(appearance)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_xp (
  user_id uuid primary key references auth.users (id) on delete cascade,
  xp bigint not null default 0 check (xp >= 0),
  level int not null default 1 check (level >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.player_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  gold bigint not null default 0 check (gold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

------------------------------------------------------------------------------------------
-- System tables (no API access at all)
------------------------------------------------------------------------------------------
create table public.admin_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'moderator', 'educator')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  target text,
  data jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

------------------------------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------------------------------
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger user_settings_updated before update on public.user_settings for each row execute function public.set_updated_at();
create trigger user_privacy_settings_updated before update on public.user_privacy_settings for each row execute function public.set_updated_at();
create trigger parental_settings_updated before update on public.parental_settings for each row execute function public.set_updated_at();
create trigger academic_profiles_updated before update on public.academic_profiles for each row execute function public.set_updated_at();
create trigger characters_updated before update on public.characters for each row execute function public.set_updated_at();
create trigger player_xp_updated before update on public.player_xp for each row execute function public.set_updated_at();
create trigger player_wallets_updated before update on public.player_wallets for each row execute function public.set_updated_at();

------------------------------------------------------------------------------------------
-- Account lifecycle
------------------------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_year int;
  v_guardian text;
  v_now_year int := extract(year from now())::int;
begin
  -- Birth year from sign-up metadata; anything malformed is ignored (guests set it later via set_birth_year).
  if (v_meta ->> 'birth_year') ~ '^\d{4}$' then
    v_year := (v_meta ->> 'birth_year')::int;
    if v_year < v_now_year - 120 or v_year > v_now_year - 3 then
      v_year := null;
    end if;
  end if;

  insert into public.profiles (id, birth_year, is_guest) values (new.id, v_year, coalesce(new.is_anonymous, false));
  insert into public.user_settings (user_id) values (new.id);
  insert into public.user_privacy_settings (user_id) values (new.id);
  insert into public.player_xp (user_id) values (new.id);
  insert into public.player_wallets (user_id) values (new.id);

  -- Under-13 sign-ups register with a guardian's email (the account email itself).
  if public.age_band_for(v_year) = 'under13' then
    v_guardian := coalesce(nullif(btrim(v_meta ->> 'guardian_email'), ''), new.email);
    if v_guardian is null then
      raise exception 'A parent or guardian email is required for players under 13' using errcode = '22023';
    end if;
    insert into public.parental_settings (user_id, guardian_email) values (new.id, v_guardian);
  end if;

  insert into public.audit_logs (actor_id, action, target, data)
  values (new.id, 'account.created', new.id::text, jsonb_build_object('guest', coalesce(new.is_anonymous, false)));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- A guest who adds an email becomes a full account; under-13s record that email as the guardian's.
create or replace function public.handle_user_email_set() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.email is null and new.email is not null then
    update public.profiles set is_guest = false where id = new.id;
    if public.age_band_for((select birth_year from public.profiles where id = new.id)) = 'under13' then
      insert into public.parental_settings (user_id, guardian_email) values (new.id, new.email)
      on conflict (user_id) do nothing;
    end if;
    insert into public.audit_logs (actor_id, action, target) values (new.id, 'account.upgraded', new.id::text);
  end if;
  return new;
end $$;

create trigger on_auth_user_email_set
  after update of email on auth.users
  for each row execute function public.handle_user_email_set();

-- Birth year can be set once (guests at onboarding). Changes after that go through support.
create or replace function public.set_birth_year(p_year int) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_now_year int := extract(year from now())::int;
  v_band text;
begin
  if v_uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if p_year is null or p_year < v_now_year - 120 or p_year > v_now_year - 3 then
    raise exception 'Invalid birth year' using errcode = '22023';
  end if;
  update public.profiles set birth_year = p_year where id = v_uid and birth_year is null;
  if not found then
    raise exception 'Birth year is already set' using errcode = 'P0001';
  end if;
  v_band := public.age_band_for(p_year);
  insert into public.audit_logs (actor_id, action, target, data)
  values (v_uid, 'profile.birth_year_set', v_uid::text, jsonb_build_object('age_band', v_band));
  return v_band;
end $$;

------------------------------------------------------------------------------------------
-- Write-time validation
------------------------------------------------------------------------------------------
create or replace function public.check_academic_profile() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_cur public.curricula%rowtype;
begin
  select * into v_cur from public.curricula where id = new.curriculum_id;
  if not (new.level_id = any (v_cur.level_ids)) then
    raise exception 'Curriculum % does not cover level %', new.curriculum_id, new.level_id using errcode = '22023';
  end if;
  if v_cur.country_code is not null and v_cur.country_code <> new.country_code then
    raise exception 'Curriculum % is not offered in %', new.curriculum_id, new.country_code using errcode = '22023';
  end if;
  if new.grade_id is not null and not exists (
    select 1 from public.grades g
    where g.id = new.grade_id and g.curriculum_id = new.curriculum_id and g.level_id = new.level_id
  ) then
    raise exception 'Grade % does not belong to this curriculum and level', new.grade_id using errcode = '22023';
  end if;
  if exists (select unnest(new.subject_ids) except select id from public.subjects) then
    raise exception 'Unknown subject' using errcode = '22023';
  end if;
  return new;
end $$;

create trigger academic_profiles_check
  before insert or update on public.academic_profiles
  for each row execute function public.check_academic_profile();

-- Guests and under-13 players may only use generated names ("<Adjective> <Noun>").
create or replace function public.check_character() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_band text;
  v_words text[];
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  select public.age_band_for(p.birth_year) into v_band from public.profiles p where p.id = new.user_id;

  if v_band in ('under13', 'unknown') then
    v_words := string_to_array(new.name, ' ');
    if cardinality(v_words) <> 2
       or not exists (select 1 from public.safe_name_parts where kind = 'adjective' and part = v_words[1])
       or not exists (select 1 from public.safe_name_parts where kind = 'noun' and part = v_words[2]) then
      raise exception 'This name must come from the name generator' using errcode = '22023';
    end if;
  elsif char_length(new.name) not between 3 and 16 or new.name ~ '[[:cntrl:]<>&"/\\@]' then
    raise exception 'Names are 3 to 16 letters, numbers or spaces' using errcode = '22023';
  end if;

  update public.profiles set display_name = new.name where id = new.user_id;
  return new;
end $$;

create trigger characters_check
  before insert or update on public.characters
  for each row execute function public.check_character();

------------------------------------------------------------------------------------------
-- Privileges: start from nothing, grant exactly what the app needs
------------------------------------------------------------------------------------------
revoke all on
  public.education_levels, public.countries, public.curricula, public.grades, public.subjects, public.safe_name_parts,
  public.profiles, public.user_settings, public.user_privacy_settings, public.parental_settings,
  public.academic_profiles, public.characters, public.player_xp, public.player_wallets,
  public.admin_roles, public.audit_logs
from anon, authenticated;

grant select on public.education_levels, public.countries, public.curricula, public.grades, public.subjects, public.safe_name_parts
  to anon, authenticated;
grant select on public.profiles, public.parental_settings, public.player_xp, public.player_wallets to authenticated;
grant select, update on public.user_settings, public.user_privacy_settings to authenticated;
grant select, insert, update on public.academic_profiles, public.characters to authenticated;

revoke execute on function public.set_birth_year(int) from public, anon;
grant execute on function public.set_birth_year(int) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_set() from public, anon, authenticated;
revoke execute on function public.check_character() from public, anon, authenticated;

------------------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------------------
alter table public.education_levels enable row level security;
alter table public.countries enable row level security;
alter table public.curricula enable row level security;
alter table public.grades enable row level security;
alter table public.subjects enable row level security;
alter table public.safe_name_parts enable row level security;
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_privacy_settings enable row level security;
alter table public.parental_settings enable row level security;
alter table public.academic_profiles enable row level security;
alter table public.characters enable row level security;
alter table public.player_xp enable row level security;
alter table public.player_wallets enable row level security;
alter table public.admin_roles enable row level security;
alter table public.audit_logs enable row level security;

create policy "reference is public" on public.education_levels for select to anon, authenticated using (true);
create policy "reference is public" on public.countries for select to anon, authenticated using (true);
create policy "reference is public" on public.curricula for select to anon, authenticated using (true);
create policy "reference is public" on public.grades for select to anon, authenticated using (true);
create policy "reference is public" on public.subjects for select to anon, authenticated using (true);
create policy "reference is public" on public.safe_name_parts for select to anon, authenticated using (true);

create policy "own row" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own row" on public.parental_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "own row" on public.player_xp for select to authenticated using (user_id = (select auth.uid()));
create policy "own row" on public.player_wallets for select to authenticated using (user_id = (select auth.uid()));

create policy "own row read" on public.user_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "own row write" on public.user_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own row read" on public.user_privacy_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "own row write" on public.user_privacy_settings for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own row read" on public.academic_profiles for select to authenticated using (user_id = (select auth.uid()));
create policy "own row insert" on public.academic_profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own row update" on public.academic_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own row read" on public.characters for select to authenticated using (user_id = (select auth.uid()));
create policy "own row insert" on public.characters for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own row update" on public.characters for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- admin_roles and audit_logs: RLS on, no policies, no grants => unreachable through the API.
