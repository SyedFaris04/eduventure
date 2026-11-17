-- Knowledge pet: hatched at level 2, grows only from learning, evolves through gates of pet points + level + an
-- earn-only gold fee, takes its adult form from the subjects studied, and wears pet-corner items from the shop.
-- The player can read their pet; only the functions below change it. Nothing here ever takes points away.

------------------------------------------------------------------------------------------
-- Unlocks and the pet corner
------------------------------------------------------------------------------------------
alter table public.level_unlocks drop constraint level_unlocks_kind_check;
alter table public.level_unlocks add constraint level_unlocks_kind_check check (kind in ('helper', 'boss', 'shop_tier', 'boat', 'title', 'pet'));
-- Keep in step with src/game/unlocks.ts.
insert into public.level_unlocks (level, kind, key) values (2, 'pet', 'pet_egg'), (5, 'pet', 'pet_young'), (10, 'pet', 'pet_adult');

alter table public.shop_items drop constraint shop_items_slot_check;
alter table public.shop_items add constraint shop_items_slot_check
  check (slot in ('top', 'bottom', 'shoes', 'accessory', 'weapon', 'backpack', 'pet_hat', 'pet_neck', 'pet_dye'));
-- Keep in step with src/features/shop/catalogue.ts.
insert into public.shop_items (id, slot, rarity, price, sort) values
  ('pet_songkok', 'pet_hat', 'common', 60, 200),
  ('pet_flower', 'pet_hat', 'common', 60, 210),
  ('pet_tengkolok', 'pet_hat', 'rare', 300, 220),
  ('pet_batik', 'pet_neck', 'common', 80, 230),
  ('pet_bell', 'pet_neck', 'common', 50, 240),
  ('pet_dye_ocean', 'pet_dye', 'common', 100, 250),
  ('pet_dye_rose', 'pet_dye', 'common', 100, 260),
  ('pet_dye_gold', 'pet_dye', 'epic', 900, 270);

------------------------------------------------------------------------------------------
-- The pet
------------------------------------------------------------------------------------------
create table public.player_pets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  species text not null check (species in ('kancil', 'beruang', 'naga')),
  name text not null check (name in ('comel', 'bulat', 'si_pintar', 'tompok', 'bintang', 'kiki', 'mochi', 'ombak')),
  stage text not null default 'baby' check (stage in ('baby', 'young', 'adult')),
  form text check (form in ('science', 'maths', 'technology', 'language', 'seimbang')),
  points int not null default 0 check (points >= 0),
  branches jsonb not null default '{"science": 0, "maths": 0, "technology": 0, "language": 0}',
  answer_day date,
  answer_points int not null default 0,
  look jsonb not null default '{}',
  hatched_at timestamptz not null default now(),
  evolved_at timestamptz
);
revoke all on public.player_pets from anon, authenticated;
grant select on public.player_pets to authenticated;
alter table public.player_pets enable row level security;
create policy "own row" on public.player_pets for select to authenticated using (user_id = (select auth.uid()));

------------------------------------------------------------------------------------------
-- Pure rules (mirrored in src/features/pet/petRules.ts)
------------------------------------------------------------------------------------------
-- Seimbang when every subject has at least a fifth of the points (or none has any), else the strongest subject.
create or replace function public.pet_form(p_branches jsonb) returns text
language sql immutable set search_path = '' as $$
  with b as (
    select k, ord, coalesce((p_branches ->> k)::numeric, 0) as v
    from unnest(array['science', 'maths', 'technology', 'language']) with ordinality as t(k, ord)
  )
  select case
    when (select sum(v) from b) = 0 or (select bool_and(v >= 0.2 * (select sum(v) from b)) from b) then 'seimbang'
    else (select k from b order by v desc, ord limit 1)
  end
$$;

create or replace function public.pet_next(p_stage text, p_points int, p_level int, p_gold bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_next text;
  v_points int;
  v_gold int;
  v_level int;
  v_missing text[] := '{}';
begin
  if p_stage = 'adult' then
    return jsonb_build_object('next', null, 'points', 0, 'level', 0, 'gold', 0, 'missing', '[]'::jsonb);
  end if;
  v_next := case when p_stage = 'baby' then 'young' else 'adult' end;
  v_points := case when v_next = 'young' then 100 else 300 end;
  v_gold := case when v_next = 'young' then 50 else 150 end;
  v_level := public.unlock_level('pet', 'pet_' || v_next);
  if p_points < v_points then v_missing := v_missing || 'points'; end if;
  if p_level < v_level then v_missing := v_missing || 'level'; end if;
  if p_gold < v_gold then v_missing := v_missing || 'gold'; end if;
  return jsonb_build_object('next', v_next, 'points', v_points, 'level', v_level, 'gold', v_gold, 'missing', to_jsonb(v_missing));
end $$;

-- The island branch a subject feeds, or null for subjects outside the four subject islands.
create or replace function public.subject_branch(p_subject text) returns text
language sql stable security definer set search_path = '' as $$
  select case i.id
    when 'science_island' then 'science' when 'mathematics_mountains' then 'maths'
    when 'technology_city' then 'technology' when 'language_kingdom' then 'language' end
  from public.islands i where p_subject = any (i.subject_ids) limit 1
$$;

------------------------------------------------------------------------------------------
-- Points: answer +1 (30 a day at most), lesson +5, day played +3. No pet yet → nothing.
------------------------------------------------------------------------------------------
create or replace function public.pet_award(p_user uuid, p_branch text, p_kind text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pet public.player_pets;
  v_today date := public.local_today(p_user);
  v_n int := case p_kind when 'answer' then 1 when 'lesson' then 5 when 'day' then 3 end;
begin
  if v_n is null then raise exception 'Unknown award' using errcode = '22023'; end if;
  select * into v_pet from public.player_pets where user_id = p_user for update;
  if not found then return; end if;
  if p_kind = 'answer' then
    if v_pet.answer_day is distinct from v_today then
      v_pet.answer_day := v_today;
      v_pet.answer_points := 0;
    end if;
    if v_pet.answer_points >= 30 then return; end if;
    v_pet.answer_points := v_pet.answer_points + 1;
  end if;
  if p_branch in ('science', 'maths', 'technology', 'language') then
    v_pet.branches := jsonb_set(v_pet.branches, array[p_branch], to_jsonb(coalesce((v_pet.branches ->> p_branch)::int, 0) + v_n));
  end if;
  update public.player_pets set points = points + v_n, branches = v_pet.branches,
    answer_day = v_pet.answer_day, answer_points = v_pet.answer_points
  where user_id = p_user;
end $$;

------------------------------------------------------------------------------------------
-- What the player can do
------------------------------------------------------------------------------------------
create or replace function public.hatch_pet(p_species text, p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_pet public.player_pets;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if not public.unlocked(public.player_level(v_uid), 'pet', 'pet_egg') then
    raise exception 'Reach level % to hatch an egg', public.unlock_level('pet', 'pet_egg') using errcode = 'P0001';
  end if;
  if p_species is null or p_species not in ('kancil', 'beruang', 'naga') then raise exception 'Unknown species' using errcode = '22023'; end if;
  if p_name is null or p_name not in ('comel', 'bulat', 'si_pintar', 'tompok', 'bintang', 'kiki', 'mochi', 'ombak') then
    raise exception 'Unknown name' using errcode = '22023';
  end if;
  insert into public.player_pets (user_id, species, name) values (v_uid, p_species, p_name)
  on conflict (user_id) do nothing
  returning * into v_pet;
  if not found then raise exception 'You already have a pet' using errcode = '22023'; end if;
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'hatch_pet', p_species, jsonb_build_object('name', p_name));
  return to_jsonb(v_pet) - 'user_id' - 'answer_day' - 'answer_points';
end $$;

create or replace function public.evolve_pet() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_pet public.player_pets;
  v_gold bigint;
  v_next jsonb;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  -- Lock the pet, then the wallet, so a double tap evolves once and pays once.
  select * into v_pet from public.player_pets where user_id = v_uid for update;
  if not found then raise exception 'No pet yet' using errcode = 'P0002'; end if;
  select gold into v_gold from public.player_wallets where user_id = v_uid for update;
  v_next := public.pet_next(v_pet.stage, v_pet.points, public.player_level(v_uid), coalesce(v_gold, 0));
  if v_next ->> 'next' is null then raise exception 'Your pet is fully grown' using errcode = 'P0001'; end if;
  if v_next -> 'missing' ? 'points' then raise exception 'Needs more pet points' using errcode = 'P0001'; end if;
  if v_next -> 'missing' ? 'level' then raise exception 'Reach level % to evolve', v_next ->> 'level' using errcode = 'P0001'; end if;
  if v_next -> 'missing' ? 'gold' then raise exception 'Not enough gold' using errcode = 'P0001'; end if;

  update public.player_wallets set gold = gold - (v_next ->> 'gold')::int where user_id = v_uid returning gold into v_gold;
  update public.player_pets set stage = v_next ->> 'next', evolved_at = now(),
    form = case when v_next ->> 'next' = 'adult' then public.pet_form(branches) end
  where user_id = v_uid returning * into v_pet;
  insert into public.audit_logs (actor_id, action, target, data)
  values (v_uid, 'evolve_pet', v_pet.stage, jsonb_build_object('fee', (v_next ->> 'gold')::int, 'form', v_pet.form));
  return jsonb_build_object('pet', to_jsonb(v_pet) - 'user_id' - 'answer_day' - 'answer_points', 'gold', v_gold);
end $$;

create or replace function public.dress_pet(p_slot text, p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_look jsonb;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_slot is null or p_slot not in ('hat', 'neck', 'dye') then raise exception 'Unknown pet slot' using errcode = '22023'; end if;
  if not exists (select 1 from public.player_pets where user_id = v_uid) then raise exception 'No pet yet' using errcode = 'P0002'; end if;
  if p_item is not null and not exists (
    select 1 from public.player_items p join public.shop_items s on s.id = p.item_id
    where p.user_id = v_uid and p.item_id = p_item and s.slot = 'pet_' || p_slot
  ) then
    raise exception 'You do not own this item' using errcode = '42501';
  end if;
  update public.player_pets
    set look = case when p_item is null then look - p_slot else jsonb_set(look, array[p_slot], to_jsonb(p_item)) end
  where user_id = v_uid returning look into v_look;
  return v_look;
end $$;

------------------------------------------------------------------------------------------
-- Hooks: answers and lessons feed the pet; a finished lesson now counts as a day played
------------------------------------------------------------------------------------------
create or replace function public.after_answer(p_user uuid, p_subject text, p_topic text, p_correct boolean, p_won boolean) returns text[]
language plpgsql security definer set search_path = '' as $$
declare
  v_done text[] := '{}';
begin
  perform public.record_mastery(p_user, p_subject, p_topic, p_correct);
  insert into public.learning_days (user_id, day) values (p_user, public.local_today(p_user)) on conflict do nothing;
  if found then perform public.pet_award(p_user, null, 'day'); end if;
  if p_correct then
    perform public.pet_award(p_user, public.subject_branch(p_subject), 'answer');
    v_done := v_done || public.bump_missions(p_user, 'answer_correct', p_subject);
    v_done := v_done || public.bump_missions(p_user, 'answer_subject', p_subject);
  end if;
  if p_won then v_done := v_done || public.bump_missions(p_user, 'defeat_monsters', null); end if;
  return v_done;
end $$;

create or replace function public.complete_lesson(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.lesson_attempts;
  v_first boolean;
  v_old int;
  v_level int;
  v_xp bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  perform 1 from public.lesson_attempts where id = v_a.id for update;
  if v_a.status <> 'active' then raise exception 'This lesson has ended' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.lesson_steps s
    where s.lesson_id = v_a.lesson_id and s.kind in ('predict', 'fix', 'pick', 'match', 'build', 'gap', 'type')
      and not exists (select 1 from public.lesson_step_results r where r.attempt_id = v_a.id and r.step_id = s.id and r.correct)
  ) then
    raise exception 'Answer every question first' using errcode = 'P0001';
  end if;

  insert into public.lesson_rewards (user_id, lesson_id, xp, gold) values (v_uid, v_a.lesson_id, 25, 10) on conflict do nothing;
  v_first := found;
  select level into v_old from public.player_xp where user_id = v_uid;
  if v_first then
    update public.player_xp set xp = xp + 25, level = public.level_for_xp(xp + 25) where user_id = v_uid;
    update public.player_wallets set gold = gold + 10 where user_id = v_uid;
    perform public.pet_award(v_uid, (
      select case c.kind when 'code' then 'technology' else 'language' end
      from public.lessons l join public.courses c on c.id = l.course_id where l.id = v_a.lesson_id), 'lesson');
  end if;
  insert into public.learning_days (user_id, day) values (v_uid, public.local_today(v_uid)) on conflict do nothing;
  if found then perform public.pet_award(v_uid, null, 'day'); end if;
  update public.lesson_attempts set status = 'completed' where id = v_a.id;

  select xp, level into v_xp, v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;
  return jsonb_build_object('first_time', v_first, 'xp', case when v_first then 25 else 0 end, 'gold', case when v_first then 10 else 0 end,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold), 'leveled_up', coalesce(v_level > v_old, false));
end $$;

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke execute on function public.pet_form(jsonb), public.pet_next(text, int, int, bigint),
  public.hatch_pet(text, text), public.evolve_pet(), public.dress_pet(text, text) from public, anon;
grant execute on function public.pet_form(jsonb), public.pet_next(text, int, int, bigint),
  public.hatch_pet(text, text), public.evolve_pet(), public.dress_pet(text, text) to authenticated;
revoke execute on function public.subject_branch(text), public.pet_award(uuid, text, text) from public, anon, authenticated;
