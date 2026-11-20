-- Whiteboard camps, review fixes (from 20261121100000_board_text_filter.sql and 20261121100100_board.sql):
-- 1. Letters fold_text can't turn into a-z (ı, ū, ß…) split a word and slipped past the word list: refused as "script".
--    Punctuation inside a word ("fu.ck", "fu2ck") is removed before matching the word list.
-- 2. Contact details: phone numbers split by any non-letters, spaced emails and links, "@ name", and "gmail dot com"
--    or messaging apps (new problem "contact").
-- 3. Phone keyboards type … – —: allowed.
-- 4. Deleting your own note hides it instead: reports and moderators keep the evidence, and it still counts toward
--    5 notes an hour. The 30-day cleanup keeps notes with open reports.

create or replace function public.text_ok(p_text text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_text text := coalesce(p_text, '');
  v_fold text := public.fold_text(p_text);
  v_words text[] := public.text_words(p_text);
  v_tokens text[];
begin
  -- Latin letters that fold to a-z (so "Café" and "Señor" pass), digits and plain punctuation only.
  if v_fold !~ '^[a-z0-9 .,!?''"():;+=/%*&#@_’‘“”…–—-]*$' then return 'script'; end if;
  -- 7 or more digits with nothing but non-letters between them.
  if exists (select 1 from regexp_matches(v_text, '[0-9][^[:alpha:]]*[0-9]', 'g') m
             where length(regexp_replace(m[1], '[^0-9]', '', 'g')) >= 7) then return 'phone'; end if;
  if v_text ~* '[^\s@]+\s*@\s*[^\s@]+\s*\.\s*[a-z]{2,}' then return 'email'; end if;
  if v_text ~* '(https?:|www\.)' or v_text ~* '[a-z0-9]\s*\.(com|my|net|org|io|gg|ly|me|co|tv|be|uk|sg|app|xyz|link)\y' then return 'link'; end if;
  if v_text ~* '@\s*[a-z]' then return 'handle'; end if;
  if v_fold ~ '\y(gmail|yahoo|hotmail|outlook|whatsapp|telegram|instagram|insta|tiktok|discord|snapchat|wechat|facebook)\y'
     or v_fold ~ '\ydot\s+(com|my|net|org|co)\y' then return 'contact'; end if;
  -- Each space-separated piece with its punctuation removed, beside the words (whose single letters are joined).
  v_tokens := array_remove(array(select regexp_replace(t, '[^a-z]', '', 'g') from regexp_split_to_table(v_fold, '\s+') t), '');
  if exists (
    select 1 from public.blocked_words b
    where (b.whole_word and (b.word = any (v_words) or b.word = any (v_tokens)))
       or (not b.whole_word and exists (select 1 from unnest(v_words || v_tokens) w where position(b.word in w) > 0))) then
    return 'word';
  end if;
  return null;
end $$;

alter table public.board_notes add column deleted_at timestamptz;

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
      where b.place = p_place and not b.hidden and b.deleted_at is null and b.created_at > now() - interval '3 days'
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
  -- Deleted notes still count.
  if (select count(*) from public.board_notes where author_id = v_uid and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many notes' using errcode = 'P0001';
  end if;
  -- Notes show for 3 days and are kept 30 for moderators (longer while a report is open).
  delete from public.board_notes b where b.place = p_place and b.created_at < now() - interval '30 days'
    and not exists (select 1 from public.note_reports r where r.note_id = b.id and r.status = 'open');
  insert into public.board_notes (place, author_id, sticker, phrase, body) values (p_place, v_uid, p_sticker, p_phrase, v_body)
  returning id into v_id;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.delete_my_note(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.board_notes set deleted_at = now() where id = p_id and author_id = auth.uid() and deleted_at is null
$$;

create or replace function public.reported_notes() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin', 'moderator']) then raise exception 'Not allowed' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(x.note order by x.last desc), '[]'::jsonb)
    from (
      select jsonb_build_object('id', b.id, 'place', b.place, 'sticker', b.sticker, 'phrase', b.phrase, 'body', b.body,
        'public_id', p.public_id, 'name', c.name, 'hidden', b.hidden, 'deleted', b.deleted_at is not null, 'reports', count(*),
        'reasons', jsonb_agg(distinct r.reason), 'created_at', b.created_at) as note,
        max(r.created_at) as last
      from public.note_reports r
      join public.board_notes b on b.id = r.note_id
      join public.profiles p on p.id = b.author_id
      left join public.characters c on c.user_id = b.author_id
      where r.status = 'open'
      group by b.id, p.public_id, c.name) x);
end $$;
