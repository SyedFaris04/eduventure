-- Multiplayer safety: hide a player for yourself, report a player, moderator bans, and the parent's switch.

create table public.player_blocks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_public_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_public_id)
);

create table public.player_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid references auth.users (id) on delete set null,
  reported_public_id uuid not null,
  reason text not null check (reason in ('rude_name', 'bad_behaviour', 'other')),
  place text check (char_length(place) <= 40),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);
create index player_reports_open on public.player_reports (reported_public_id) where status = 'open';
create index player_reports_reporter on public.player_reports (reporter_id, created_at desc);

revoke all on public.player_blocks, public.player_reports from anon, authenticated;
alter table public.player_blocks enable row level security;
alter table public.player_reports enable row level security;

create or replace function public.my_public_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select public_id from public.profiles where id = auth.uid()
$$;

create or replace function public.block_player(p_public_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_public_id = public.my_public_id() then raise exception 'You cannot block yourself' using errcode = '22023'; end if;
  insert into public.player_blocks (user_id, blocked_public_id) values (auth.uid(), p_public_id) on conflict do nothing;
end $$;

create or replace function public.unblock_player(p_public_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.player_blocks where user_id = auth.uid() and blocked_public_id = p_public_id
$$;

create or replace function public.my_blocks() returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(blocked_public_id), '{}') from public.player_blocks where user_id = auth.uid()
$$;

create or replace function public.report_player(p_public_id uuid, p_reason text, p_place text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_public_id = public.my_public_id() then raise exception 'You cannot report yourself' using errcode = '22023'; end if;
  if not exists (select 1 from public.profiles where public_id = p_public_id) then raise exception 'No such player' using errcode = '22023'; end if;
  if (select count(*) from public.player_reports where reporter_id = v_uid and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Too many reports today' using errcode = 'P0001';
  end if;
  insert into public.player_reports (reporter_id, reported_public_id, reason, place) values (v_uid, p_public_id, p_reason, p_place);
end $$;

------------------------------------------------------------------------------------------
-- Moderators (admins and moderators)
------------------------------------------------------------------------------------------
create or replace function public.open_reports() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin', 'moderator']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'reported_public_id', r.reported_public_id, 'name', c.name,
      'reason', r.reason, 'place', r.place, 'created_at', r.created_at,
      'open_count', (select count(*) from public.player_reports o where o.reported_public_id = r.reported_public_id and o.status = 'open'))
      order by r.created_at desc), '[]'::jsonb)
    from public.player_reports r
    left join public.profiles p on p.public_id = r.reported_public_id
    left join public.characters c on c.user_id = p.id
    where r.status = 'open');
end $$;

create or replace function public.close_report(p_id bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin', 'moderator']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.player_reports set status = 'closed' where id = p_id;
end $$;

create or replace function public.ban_from_multiplayer(p_public_id uuid, p_banned boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin', 'moderator']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  update public.profiles set multiplayer_banned = p_banned where public_id = p_public_id;
  if not found then raise exception 'No such player' using errcode = '22023'; end if;
  if p_banned then
    update public.player_reports set status = 'closed' where reported_public_id = p_public_id and status = 'open';
  end if;
  insert into public.audit_logs (actor_id, action, target, data)
  values (auth.uid(), 'multiplayer.ban', p_public_id::text, jsonb_build_object('banned', p_banned));
end $$;

------------------------------------------------------------------------------------------
-- Parents (from 20261118090000_parent_consent.sql: my_children gains "visible")
------------------------------------------------------------------------------------------
create or replace function public.set_child_visible(p_child uuid, p_visible boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_child(p_child);
  update public.guardianships set hidden_by_parent = not p_visible where child_id = p_child;
end $$;

create or replace function public.my_children() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('child_id', g.child_id, 'name', c.name, 'approved_at', g.approved_at,
    'daily_limit', g.daily_limit, 'visible', not g.hidden_by_parent) order by g.approved_at), '[]'::jsonb)
  from public.guardianships g left join public.characters c on c.user_id = g.child_id
  where g.guardian_id = auth.uid()
$$;

revoke execute on function public.my_public_id() from public, anon, authenticated;
revoke execute on function public.block_player(uuid), public.unblock_player(uuid), public.my_blocks(), public.report_player(uuid, text, text),
  public.open_reports(), public.close_report(bigint), public.ban_from_multiplayer(uuid, boolean), public.set_child_visible(uuid, boolean) from public, anon;
grant execute on function public.block_player(uuid), public.unblock_player(uuid), public.my_blocks(), public.report_player(uuid, text, text),
  public.open_reports(), public.close_report(bigint), public.ban_from_multiplayer(uuid, boolean), public.set_child_visible(uuid, boolean) to authenticated;
