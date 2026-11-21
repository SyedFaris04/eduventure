-- My island: a private island per player, decorated with items paid for in harvested materials (some unlocked by
-- level). Spec: docs/superpowers/specs/2026-11-21-my-island-design.md. The catalogue rows come from
-- content/island-items.json (scripts/gen-island-items.mjs writes the next migration).

create table public.island_catalog (
  id text primary key check (id ~ '^[a-z][a-z0-9_]*$'),
  category text not null check (category in ('house', 'garden', 'trees', 'paths', 'lights', 'furniture', 'malaysian', 'water')),
  cost jsonb not null,
  w int not null check (w between 1 and 6),
  h int not null check (h between 1 and 6),
  blocks boolean not null,
  sort int not null
);
create table public.island_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item text not null references public.island_catalog (id),
  x int not null,
  y int not null,
  rot smallint not null check (rot between 0 and 3),
  created_at timestamptz not null default now()
);
create index island_items_user on public.island_items (user_id);

revoke all on public.island_catalog, public.island_items from anon, authenticated;
grant select on public.island_catalog to authenticated;
alter table public.island_catalog enable row level security;
alter table public.island_items enable row level security;
create policy "the catalogue is public" on public.island_catalog for select to authenticated using (true);

-- Level-locked items join the shared unlock list (from 20261117110000_knowledge_pet.sql).
alter table public.level_unlocks drop constraint level_unlocks_kind_check;
alter table public.level_unlocks add constraint level_unlocks_kind_check check (kind in ('helper', 'boss', 'shop_tier', 'boat', 'title', 'pet', 'island_item'));

------------------------------------------------------------------------------------------
-- Rules (the client predicts with the same ones: src/features/island/rules.ts)
------------------------------------------------------------------------------------------
-- An item at (x, y) turned r covers [x, x + w') × [y, y + h'), with w' and h' swapped on odd turns. It must lie inside
-- the build area (x and y 4–27) and overlap none of the player's other items (p_ignore: the item being moved).
create or replace function public.island_fits(p_user uuid, p_item text, p_x int, p_y int, p_rot int, p_ignore bigint) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_c public.island_catalog;
  v_w int;
  v_h int;
begin
  select * into v_c from public.island_catalog where id = p_item;
  if not found then return false; end if;
  v_w := case when p_rot % 2 = 0 then v_c.w else v_c.h end;
  v_h := case when p_rot % 2 = 0 then v_c.h else v_c.w end;
  if p_x < 4 or p_y < 4 or p_x + v_w - 1 > 27 or p_y + v_h - 1 > 27 then return false; end if;
  return not exists (
    select 1 from public.island_items i join public.island_catalog c on c.id = i.item
    where i.user_id = p_user and i.id is distinct from p_ignore
      and i.x < p_x + v_w and p_x < i.x + (case when i.rot % 2 = 0 then c.w else c.h end)
      and i.y < p_y + v_h and p_y < i.y + (case when i.rot % 2 = 0 then c.h else c.w end));
end $$;

create or replace function public.island_item_json(p_i public.island_items) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', p_i.id, 'item', p_i.item, 'x', p_i.x, 'y', p_i.y, 'rot', p_i.rot)
$$;

create or replace function public.my_island() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.island_item_json(i) order by i.id), '[]'::jsonb) from public.island_items i where i.user_id = auth.uid()
$$;

-- Shared start of place and move: signed in, one at a time per player, a real turn, and the daily play limit.
create or replace function public.island_begin(p_rot int) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('island:' || v_uid::text));
  if p_rot is null or p_rot not between 0 and 3 then raise exception 'Bad turn' using errcode = '22023'; end if;
  if public.play_left(public.minutes_today(v_uid), public.daily_limit_of(v_uid)) = 0 then
    raise exception 'Time''s up for today — see you tomorrow!' using errcode = 'P0001';
  end if;
  return v_uid;
end $$;

create or replace function public.place_island_item(p_item text, p_x int, p_y int, p_rot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.island_begin(p_rot);
  v_c public.island_catalog;
  v_level int;
  v_row public.island_items;
  v_m record;
begin
  select * into v_c from public.island_catalog where id = p_item;
  if not found then raise exception 'No such item' using errcode = '22023'; end if;
  v_level := coalesce(public.unlock_level('island_item', p_item), 1);
  if public.player_level(v_uid) < v_level then raise exception 'Unlocks at level %', v_level using errcode = 'P0001'; end if;
  if (select count(*) from public.island_items where user_id = v_uid) >= 400 then raise exception 'Too many items' using errcode = 'P0001'; end if;
  if not public.island_fits(v_uid, p_item, p_x, p_y, p_rot, null) then raise exception 'Doesn''t fit there' using errcode = 'P0001'; end if;
  for v_m in select key as material, (value #>> '{}')::int as amount from jsonb_each(v_c.cost) loop
    if coalesce((select amount from public.player_materials where user_id = v_uid and material = v_m.material), 0) < v_m.amount then
      raise exception 'Not enough materials' using errcode = 'P0001';
    end if;
  end loop;
  update public.player_materials p set amount = p.amount - (v_c.cost ->> p.material)::int
  where p.user_id = v_uid and v_c.cost ? p.material;
  insert into public.island_items (user_id, item, x, y, rot) values (v_uid, p_item, p_x, p_y, p_rot) returning * into v_row;
  return jsonb_build_object('item', public.island_item_json(v_row), 'materials', public.materials_of(v_uid));
end $$;

create or replace function public.move_island_item(p_id bigint, p_x int, p_y int, p_rot int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := public.island_begin(p_rot);
  v_row public.island_items;
begin
  select * into v_row from public.island_items where id = p_id and user_id = v_uid;
  if not found then raise exception 'No such item' using errcode = '22023'; end if;
  if not public.island_fits(v_uid, v_row.item, p_x, p_y, p_rot, p_id) then raise exception 'Doesn''t fit there' using errcode = 'P0001'; end if;
  update public.island_items set x = p_x, y = p_y, rot = p_rot where id = p_id returning * into v_row;
  return jsonb_build_object('item', public.island_item_json(v_row));
end $$;

-- Removing gives every material back (and is allowed after the daily limit: it is tidying, not play).
create or replace function public.remove_island_item(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('island:' || v_uid::text));
  delete from public.island_items where id = p_id and user_id = v_uid returning item into v_item;
  if v_item is null then raise exception 'No such item' using errcode = '22023'; end if;
  insert into public.player_materials (user_id, material, amount)
  select v_uid, key, (value #>> '{}')::int from jsonb_each((select cost from public.island_catalog where id = v_item))
  on conflict (user_id, material) do update set amount = public.player_materials.amount + excluded.amount;
  return jsonb_build_object('materials', public.materials_of(v_uid));
end $$;

revoke execute on function public.island_fits(uuid, text, int, int, int, bigint), public.island_item_json(public.island_items),
  public.island_begin(int) from public, anon, authenticated;
revoke execute on function public.my_island(), public.place_island_item(text, int, int, int), public.move_island_item(bigint, int, int, int),
  public.remove_island_item(bigint) from public, anon;
grant execute on function public.my_island(), public.place_island_item(text, int, int, int), public.move_island_item(bigint, int, int, int),
  public.remove_island_item(bigint) to authenticated;
