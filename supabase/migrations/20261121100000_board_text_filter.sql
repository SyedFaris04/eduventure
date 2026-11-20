-- Whiteboard camps: a text filter for whole sentences. Spec: docs/superpowers/specs/2026-11-20-whiteboard-camps-design.md
-- name_ok squashes a name and looks for words anywhere, which is right for names but refuses ordinary sentences
-- ("who reads" squashed holds a rude word). Sentences are checked word by word instead. Both share fold_text and
-- text_words, so the word list and the leetspeak rules can't drift. name_ok's results are unchanged
-- (tests/sql/names-ok.sql), apart from accented letters now counting as their plain letter.

-- Lower-case, undo common leetspeak, and turn accented Latin letters into plain ones.
create or replace function public.fold_text(p_text text) returns text
language sql immutable set search_path = '' as $$
  select translate(lower(coalesce(p_text, '')), '013457@$àáâãäåçèéêëìíîïñòóôõöøùúûüýÿ', 'oieastasaaaaaaceeeeiiiinoooooouuuuyy')
$$;

-- The words of a text (letters only), with runs of single letters joined: "f u k off" and "f.u.k off" → {fuk, off}.
create or replace function public.text_words(p_text text) returns text[]
language sql immutable set search_path = '' as $$
  select coalesce(array_remove(regexp_split_to_array(
    regexp_replace(regexp_replace(' ' || regexp_replace(public.fold_text(p_text), '[^a-z]+', ' ', 'g') || ' ', '(?<= [a-z]) (?=[a-z] )', '', 'g'), '^ +| +$', '', 'g'),
    ' +'), ''), '{}')
$$;

-- From 20261121090003_name_filter_words.sql, now on the shared helpers.
create or replace function public.name_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_flat text := regexp_replace(public.fold_text(p_name), '[^a-z]', '', 'g');
  v_words text[] := public.text_words(p_name);
begin
  return not exists (
    select 1 from public.blocked_words b
    where (b.whole_word and b.word = any (v_words))
       or (not b.whole_word and position(b.word in v_flat) > 0));
end $$;

-- Null when a board note's text is fine, otherwise the first problem found:
-- script (anything but Latin letters, digits and plain punctuation), phone, email, link, handle or word.
create or replace function public.text_ok(p_text text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v_text text := coalesce(p_text, '');
  v_words text[] := public.text_words(p_text);
begin
  if v_text !~ '^[A-Za-z0-9À-ÖØ-öø-ÿĀ-ſ .,!?''"():;+=/%*&#@_’‘“”-]*$' then return 'script'; end if;
  -- 7 or more digits in one run of digits, spaces, dots, dashes and brackets.
  if exists (select 1 from regexp_matches(v_text, '[0-9][0-9 .()-]*[0-9]', 'g') m
             where length(regexp_replace(m[1], '[^0-9]', '', 'g')) >= 7) then return 'phone'; end if;
  if v_text ~ '[^\s@]+@[^\s@]+\.[^\s@]+' then return 'email'; end if;
  if v_text ~* '(https?:|www\.)' or v_text ~* '[a-z0-9]\.(com|my|net|org|io|gg|ly|me)\y' then return 'link'; end if;
  if v_text ~* '@[a-z]' then return 'handle'; end if;
  if exists (
    select 1 from public.blocked_words b
    where (b.whole_word and b.word = any (v_words))
       or (not b.whole_word and exists (select 1 from unnest(v_words) w where position(b.word in w) > 0))) then
    return 'word';
  end if;
  return null;
end $$;

revoke execute on function public.fold_text(text), public.text_words(text) from public, anon, authenticated;
revoke execute on function public.text_ok(text) from public, anon;
grant execute on function public.text_ok(text) to authenticated;
