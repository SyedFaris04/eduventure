-- Whiteboard camps: a lasting board at each island's built whiteboard stand. Notes are stickers, ready-made phrases
-- and (13 and over) filtered text. Spec: docs/superpowers/specs/2026-11-20-whiteboard-camps-design.md

create table public.board_notes (
  id bigint generated always as identity primary key,
  place text not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  sticker text check (sticker in ('star', 'heart', 'thumbs_up', 'clap', 'idea', 'book', 'rocket', 'trophy', 'smile', 'party', 'plant', 'question')),
  phrase text check (phrase ~ '^p(0[1-9]|1[0-9]|20)$'),
  body text check (char_length(body) between 1 and 120),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  check (sticker is not null or phrase is not null or body is not null)
);
create index board_notes_place on public.board_notes (place, created_at desc);
create index board_notes_author on public.board_notes (author_id, created_at desc);

create table public.note_reports (
  note_id bigint not null references public.board_notes (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('rude', 'personal_info', 'unkind', 'other')),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  primary key (note_id, reporter_id)
);
create index note_reports_reporter on public.note_reports (reporter_id, created_at desc);

revoke all on public.board_notes, public.note_reports from anon, authenticated;
alter table public.board_notes enable row level security;
alter table public.note_reports enable row level security;

alter table public.guardianships add column board_writing boolean not null default true;

-- A hidden board that is always built, for the live tests (the test database is production; no map reaches it).
insert into public.camp_projects (place, project, cost, built_at) values ('qa_camp', 'whiteboard', '{}', now());

------------------------------------------------------------------------------------------
-- Who may write
------------------------------------------------------------------------------------------
-- Null when the player may write; otherwise the first reason they can't. Writing shows your name, so it follows the
-- visibility rules. Under-18s need an approving parent (a parent vouches even for a guest); adult guests only read,
-- because anyone can claim to be an adult as a guest.
create or replace function public.board_reason(p_user uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_p public.profiles;
  v_g public.guardianships;
  v_band text;
begin
  select * into v_p from public.profiles where id = p_user;
  if not found then return 'guest'; end if;
  select * into v_g from public.guardianships where child_id = p_user;
  v_band := public.age_band_for(v_p.birth_year);
  if v_band = 'unknown' then return 'no_age'; end if;
  case public.visibility_reason(p_user)
    when 'banned' then return 'banned';
    when 'parent' then return 'hidden_parent';
    when 'off' then return 'hidden_self';
    when 'awaiting_parent' then return 'awaiting_parent';
    else null;
  end case;
  if v_band = 'adult' and v_p.is_guest then return 'guest'; end if;
  if v_band = 'teen' and v_g.child_id is null then return 'needs_parent'; end if;
  if v_g.child_id is not null and not v_g.board_writing then return 'parent_off'; end if;
  if v_band = 'under13' and coalesce((select chat_mode from public.parental_settings where user_id = p_user), 'preset') = 'off' then
    return 'chat_off';
  end if;
  return null;
end $$;

create or replace function public.board_rights() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reason text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_reason := public.board_reason(v_uid);
  return jsonb_build_object('can_write', v_reason is null,
    'can_type', v_reason is null and public.age_band_for((select birth_year from public.profiles where id = v_uid)) in ('teen', 'adult'),
    'reason', v_reason);
end $$;

------------------------------------------------------------------------------------------
-- Reading and writing
------------------------------------------------------------------------------------------
create or replace function public.board_open(p_place text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.camp_projects where place = p_place and project = 'whiteboard' and built_at is not null)
$$;

-- The newest 50 notes of the last 3 days. Left out: hidden notes, players I hid, writers who are not visible now
-- (banned, hidden by a parent or themselves), and for under-13 or unknown-age readers every note with typed text.
create or replace function public.island_board(p_place text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_kid boolean;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not public.board_open(p_place) then return jsonb_build_object('open', false, 'notes', '[]'::jsonb); end if;
  v_kid := public.age_band_for((select birth_year from public.profiles where id = v_uid)) in ('under13', 'unknown');
  return jsonb_build_object('open', true, 'notes', (
    select coalesce(jsonb_agg(jsonb_build_object('id', n.id, 'public_id', n.public_id,
      'name', case when n.name is not null and public.name_ok(n.name) then n.name end,
      'sticker', n.sticker, 'phrase', n.phrase, 'body', n.body, 'created_at', n.created_at, 'mine', n.author_id = v_uid)
      order by n.created_at desc), '[]'::jsonb)
    from (
      select b.*, p.public_id, c.name
      from public.board_notes b
      join public.profiles p on p.id = b.author_id
      left join public.characters c on c.user_id = b.author_id
      where b.place = p_place and not b.hidden and b.created_at > now() - interval '3 days'
        and not (v_kid and b.body is not null)
        and not exists (select 1 from public.player_blocks k where k.user_id = v_uid and k.blocked_public_id = p.public_id)
        and (b.author_id = v_uid or public.visibility_reason(b.author_id) is null)
      order by b.created_at desc
      limit 50) n));
end $$;

create or replace function public.post_note(p_place text, p_sticker text, p_phrase text, p_body text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reason text;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_problem text;
  v_id bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_reason := public.board_reason(v_uid);
  if v_reason is not null then raise exception 'You cannot write here: %', v_reason using errcode = '42501'; end if;
  if not public.board_open(p_place) then raise exception 'The board is not built yet' using errcode = 'P0001'; end if;
  if p_sticker is null and p_phrase is null and v_body is null then raise exception 'Empty note' using errcode = '22023'; end if;
  if p_sticker is not null and p_sticker <> all (array['star', 'heart', 'thumbs_up', 'clap', 'idea', 'book', 'rocket', 'trophy', 'smile', 'party', 'plant', 'question']) then
    raise exception 'Unknown sticker' using errcode = '22023';
  end if;
  if p_phrase is not null and p_phrase !~ '^p(0[1-9]|1[0-9]|20)$' then raise exception 'Unknown phrase' using errcode = '22023'; end if;
  if v_body is not null then
    if public.age_band_for((select birth_year from public.profiles where id = v_uid)) not in ('teen', 'adult') then
      raise exception 'Stickers and phrases only' using errcode = '42501';
    end if;
    if char_length(v_body) > 120 then raise exception 'Too long' using errcode = '22023'; end if;
    v_problem := public.text_ok(v_body);
    if v_problem is not null then raise exception 'Not allowed: %', v_problem using errcode = '22023'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtext('board_note:' || v_uid::text));
  if (select count(*) from public.board_notes where author_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many notes' using errcode = 'P0001';
  end if;
  -- Notes show for 3 days and are kept 30 for moderators.
  delete from public.board_notes where place = p_place and created_at < now() - interval '30 days';
  insert into public.board_notes (place, author_id, sticker, phrase, body) values (p_place, v_uid, p_sticker, p_phrase, v_body)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.delete_my_note(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  delete from public.board_notes where id = p_id and author_id = auth.uid()
$$;

create or replace function public.report_note(p_id bigint, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_author uuid;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select author_id into v_author from public.board_notes where id = p_id;
  if not found then raise exception 'No such note' using errcode = '22023'; end if;
  if v_author = v_uid then raise exception 'You cannot report your own note' using errcode = '22023'; end if;
  if (select count(*) from public.note_reports where reporter_id = v_uid and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Too many reports today' using errcode = 'P0001';
  end if;
  insert into public.note_reports (note_id, reporter_id, reason) values (p_id, v_uid, p_reason) on conflict do nothing;
  if (select count(*) from public.note_reports where note_id = p_id and status = 'open') >= 3 then
    update public.board_notes set hidden = true where id = p_id;
  end if;
end $$;

------------------------------------------------------------------------------------------
-- Moderators (admins and moderators)
------------------------------------------------------------------------------------------
create or replace function public.reported_notes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin', 'moderator']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(x.note order by x.last desc), '[]'::jsonb)
    from (
      select jsonb_build_object('id', b.id, 'place', b.place, 'sticker', b.sticker, 'phrase', b.phrase, 'body', b.body,
        'public_id', p.public_id, 'name', c.name, 'hidden', b.hidden, 'reports', count(*),
        'reasons', jsonb_agg(distinct r.reason), 'created_at', b.created_at) as note,
        max(r.created_at) as last
      from public.note_reports r
      join public.board_notes b on b.id = r.note_id
      join public.profiles p on p.id = b.author_id
      left join public.characters c on c.user_id = b.author_id
      where r.status = 'open'
      group by b.id, p.public_id, c.name) x);
end $$;

-- Remove the note, or keep it: show it again and close its reports.
create or replace function public.resolve_note(p_id bigint, p_remove boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_note public.board_notes;
begin
  if not public.has_role(array['admin', 'moderator']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into v_note from public.board_notes where id = p_id;
  if not found then raise exception 'No such note' using errcode = '22023'; end if;
  if p_remove then
    delete from public.board_notes where id = p_id;
  else
    update public.board_notes set hidden = false where id = p_id;
    update public.note_reports set status = 'closed' where note_id = p_id and status = 'open';
  end if;
  insert into public.audit_logs (actor_id, action, target, data)
  values (auth.uid(), case when p_remove then 'board.remove' else 'board.keep' end, p_id::text,
    jsonb_build_object('place', v_note.place, 'author', (select public_id from public.profiles where id = v_note.author_id),
      'sticker', v_note.sticker, 'phrase', v_note.phrase, 'body', v_note.body));
end $$;

------------------------------------------------------------------------------------------
-- Parents (my_children from 20261121090002_multiplayer_safety.sql gains "board_writing")
------------------------------------------------------------------------------------------
create or replace function public.set_child_board_writing(p_child uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform public.own_child(p_child);
  update public.guardianships set board_writing = coalesce(p_on, true) where child_id = p_child;
end $$;

create or replace function public.my_children() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('child_id', g.child_id, 'name', c.name, 'approved_at', g.approved_at,
    'daily_limit', g.daily_limit, 'visible', not g.hidden_by_parent, 'board_writing', g.board_writing) order by g.approved_at), '[]'::jsonb)
  from public.guardianships g left join public.characters c on c.user_id = g.child_id
  where g.guardian_id = auth.uid()
$$;

revoke execute on function public.board_reason(uuid), public.board_open(text) from public, anon, authenticated;
revoke execute on function public.board_rights(), public.island_board(text), public.post_note(text, text, text, text), public.delete_my_note(bigint),
  public.report_note(bigint, text), public.reported_notes(), public.resolve_note(bigint, boolean), public.set_child_board_writing(uuid, boolean) from public, anon;
grant execute on function public.board_rights(), public.island_board(text), public.post_note(text, text, text, text), public.delete_my_note(bigint),
  public.report_note(bigint, text), public.reported_notes(), public.resolve_note(bigint, boolean), public.set_child_board_writing(uuid, boolean) to authenticated;
