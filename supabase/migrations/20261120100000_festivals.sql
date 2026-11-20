-- Festival and school-holiday events: dates (Malaysia time), festival tokens, and an admin-only preview.
-- Spec: docs/superpowers/specs/2026-11-20-festival-events-design.md

create table public.festivals (
  id text primary key check (id ~ '^[a-z0-9_]{1,32}$'),
  kind text not null check (kind in ('school_holiday', 'cny', 'raya', 'merdeka', 'deepavali')),
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on)
);

-- Dates marked "provisional" are estimates the owner confirms (edit them in the Supabase table editor).
insert into public.festivals (id, kind, starts_on, ends_on) values
  ('year_end_2026', 'school_holiday', '2026-12-05', '2027-01-03'),
  ('cny_2027', 'cny', '2027-01-30', '2027-02-20'),
  ('raya_2027', 'raya', '2027-02-09', '2027-03-17'),       -- provisional: Ramadan start
  ('merdeka_2027', 'merdeka', '2027-08-24', '2027-09-16'),
  ('deepavali_2027', 'deepavali', '2027-10-20', '2027-11-03'), -- provisional: Deepavali 27 or 28 Oct
  ('year_end_2027', 'school_holiday', '2027-12-04', '2028-01-02'); -- provisional: KPM 2027 calendar

-- One preview per admin. No client access at all; only set_festival_preview writes it.
create table public.festival_previews (
  user_id uuid primary key references auth.users (id) on delete cascade,
  festival_id text not null references public.festivals (id) on delete cascade
);

alter table public.player_wallets add column festival_tokens int not null default 0 check (festival_tokens >= 0);

revoke all on public.festivals, public.festival_previews from anon, authenticated;
grant select on public.festivals to authenticated;
alter table public.festivals enable row level security;
alter table public.festival_previews enable row level security;
create policy "festivals are public" on public.festivals for select to authenticated using (true);

-- The festivals on for a player: by today's Malaysia date, plus an admin's preview. One per kind, the preview winning.
create or replace function public.active_festivals(p_user uuid) returns setof public.festivals
language sql stable security definer set search_path = '' as $$
  select distinct on (f.kind) f.id, f.kind, f.starts_on, f.ends_on
  from (
    select f.*, 0 as rank from public.festival_previews p join public.festivals f on f.id = p.festival_id
    where p.user_id = p_user and exists (select 1 from public.admin_roles r where r.user_id = p_user and r.role = 'admin')
    union all
    select f.*, 1 from public.festivals f
    where (now() at time zone 'Asia/Kuala_Lumpur')::date between f.starts_on and f.ends_on
  ) f
  order by f.kind, f.rank, f.starts_on
$$;

create or replace function public.my_festivals() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  return jsonb_build_object(
    'festivals', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'starts_on', a.starts_on, 'ends_on', a.ends_on,
        'preview', exists (select 1 from public.festival_previews p where p.user_id = v_uid and p.festival_id = a.id))
        order by a.starts_on, a.kind)
      from public.active_festivals(v_uid) a), '[]'::jsonb),
    'tokens', coalesce((select festival_tokens from public.player_wallets where user_id = v_uid), 0));
end $$;

-- Admins only. A reset wipes the caller's own progress for that festival (here: tokens to 50), so previews and live
-- tests can be repeated on the production database.
create or replace function public.set_festival_preview(p_id text, p_reset boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or not public.has_role(array['admin']) then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_id is null then
    delete from public.festival_previews where user_id = v_uid;
  else
    if not exists (select 1 from public.festivals where id = p_id) then raise exception 'No such festival' using errcode = '22023'; end if;
    insert into public.festival_previews (user_id, festival_id) values (v_uid, p_id)
      on conflict (user_id) do update set festival_id = excluded.festival_id;
    if p_reset then
      update public.player_wallets set festival_tokens = 50 where user_id = v_uid;
    end if;
  end if;
  return public.my_festivals();
end $$;

revoke execute on function public.active_festivals(uuid) from public, anon, authenticated;
revoke execute on function public.my_festivals(), public.set_festival_preview(text, boolean) from public, anon;
grant execute on function public.my_festivals(), public.set_festival_preview(text, boolean) to authenticated;
