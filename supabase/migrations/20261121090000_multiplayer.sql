-- Multiplayer: random public ids, who is visible to other players, a word filter for names, and the room card
-- the room server reads with the player's own token. Spec: docs/superpowers/specs/2026-11-20-multiplayer-design.md

alter table public.profiles
  add column public_id uuid not null default gen_random_uuid() unique,
  add column multiplayer_banned boolean not null default false;
alter table public.user_privacy_settings add column visible_to_others boolean not null default true;
alter table public.guardianships add column hidden_by_parent boolean not null default false;

------------------------------------------------------------------------------------------
-- Word filter (the list is generated from content/blocked-words.txt)
------------------------------------------------------------------------------------------
create table public.blocked_words (word text primary key check (word ~ '^[a-z]+$'));
revoke all on public.blocked_words from anon, authenticated;
alter table public.blocked_words enable row level security;

-- Lower-case, undo common leetspeak, drop everything but letters, then look for any blocked word inside.
create or replace function public.name_ok(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.blocked_words b
    where position(b.word in regexp_replace(translate(lower(coalesce(p_name, '')), '013457@$', 'oieastas'), '[^a-z]', '', 'g')) > 0)
$$;

-- Teens and adults type their names; under-13s (and unknown ages) pick from the safe list, checked elsewhere.
create or replace function public.check_character_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if public.age_band_for((select birth_year from public.profiles where id = new.user_id)) in ('teen', 'adult')
     and not public.name_ok(new.name) then
    raise exception 'Please choose a different name' using errcode = '22023';
  end if;
  return new;
end $$;
create trigger characters_name_ok before insert or update of name on public.characters
  for each row execute function public.check_character_name();

------------------------------------------------------------------------------------------
-- Who other players can see
------------------------------------------------------------------------------------------
-- Visible unless the player or a parent turned it off, a moderator banned them, or they are under 13 (or of unknown
-- age) without an approving parent yet.
create or replace function public.visibility_reason(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when p.multiplayer_banned then 'banned'
    when coalesce(g.hidden_by_parent, false) then 'parent'
    when public.age_band_for(p.birth_year) in ('under13', 'unknown') and g.child_id is null then 'awaiting_parent'
    when not coalesce(s.visible_to_others, true) then 'off'
  end
  from public.profiles p
  left join public.guardianships g on g.child_id = p.id
  left join public.user_privacy_settings s on s.user_id = p.id
  where p.id = p_user
$$;

create or replace function public.my_visibility() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reason text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_reason := public.visibility_reason(v_uid);
  return jsonb_build_object('visible', v_reason is null, 'reason', v_reason);
end $$;

-- What the room server shows of a player. Never the account id, email, age, level or gold.
create or replace function public.my_room_card() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_reason text;
  v_p public.profiles;
  v_c public.characters;
  v_pet public.player_pets;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_p from public.profiles where id = v_uid;
  select * into v_c from public.characters where user_id = v_uid;
  select * into v_pet from public.player_pets where user_id = v_uid;
  v_reason := public.visibility_reason(v_uid);
  return jsonb_build_object(
    'public_id', v_p.public_id,
    'visible', v_reason is null,
    'banned', v_p.multiplayer_banned,
    'can_emote', not (public.age_band_for(v_p.birth_year) in ('under13', 'unknown')
      and coalesce((select chat_mode from public.parental_settings where user_id = v_uid), 'preset') = 'off'),
    'name', case when v_c.name is not null and public.name_ok(v_c.name) then v_c.name end,
    'appearance', v_c.appearance,
    'pet', case when v_pet.user_id is not null then jsonb_build_object('species', v_pet.species, 'stage', v_pet.stage, 'form', v_pet.form, 'look', v_pet.look) end);
end $$;

revoke execute on function public.visibility_reason(uuid), public.check_character_name() from public, anon, authenticated;
revoke execute on function public.name_ok(text), public.my_visibility(), public.my_room_card() from public, anon;
grant execute on function public.name_ok(text), public.my_visibility(), public.my_room_card() to authenticated;
