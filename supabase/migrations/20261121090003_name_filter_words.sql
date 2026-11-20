-- The word filter matched every word anywhere in a name, which blocked common names: Nazim (nazi), Hakim Akmal
-- (kimak), Wan Kamal (wank), Yamashita (shit), Fukuda (fuk), Scunthorpe (cunt). Short words now match whole words only.
-- Also: the name check runs only when the name is new or changed, so a player whose name is fine today can always
-- save a new look. From 20261121090000_multiplayer.sql.

alter table public.blocked_words add column whole_word boolean not null default false;

-- Lower-case and undo common leetspeak; then
--   whole-word entries must equal a word of the name (single spaced-out letters are joined first: "f u k" → "fuk"),
--   other entries may appear anywhere once spaces and symbols are removed.
create or replace function public.name_ok(p_name text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_text text := translate(lower(coalesce(p_name, '')), '013457@$', 'oieastas');
  v_flat text := regexp_replace(v_text, '[^a-z]', '', 'g');
  v_words text[];
begin
  -- Words of the name, with runs of single letters joined ("f u k off" → {fuk, off}).
  v_words := regexp_split_to_array(
    regexp_replace(regexp_replace(' ' || regexp_replace(v_text, '[^a-z]+', ' ', 'g') || ' ', '(?<= [a-z]) (?=[a-z] )', '', 'g'), '^ +| +$', '', 'g'),
    ' +');
  return not exists (
    select 1 from public.blocked_words b
    where (b.whole_word and b.word = any (v_words))
       or (not b.whole_word and position(b.word in v_flat) > 0));
end $$;

create or replace function public.check_character_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (tg_op = 'INSERT' or new.name is distinct from old.name)
     and public.age_band_for((select birth_year from public.profiles where id = new.user_id)) in ('teen', 'adult')
     and not public.name_ok(new.name) then
    raise exception 'Please choose a different name' using errcode = '22023';
  end if;
  return new;
end $$;
