-- My island, review fix: an item remembers what was paid for it, and Remove refunds exactly that, so rebalancing the
-- catalogue (npm run gen:island) can never make a refund lose or create materials. From 20261121120000_my_island.sql.

alter table public.island_items add column paid jsonb;
update public.island_items i set paid = c.cost from public.island_catalog c where c.id = i.item and i.paid is null;
alter table public.island_items alter column paid set not null;

create or replace function public.island_item_json(p_i public.island_items) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', p_i.id, 'item', p_i.item, 'x', p_i.x, 'y', p_i.y, 'rot', p_i.rot, 'paid', p_i.paid)
$$;

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
  insert into public.island_items (user_id, item, x, y, rot, paid) values (v_uid, p_item, p_x, p_y, p_rot, v_c.cost) returning * into v_row;
  return jsonb_build_object('item', public.island_item_json(v_row), 'materials', public.materials_of(v_uid));
end $$;

create or replace function public.remove_island_item(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_paid jsonb;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('island:' || v_uid::text));
  delete from public.island_items where id = p_id and user_id = v_uid returning paid into v_paid;
  if v_paid is null then raise exception 'No such item' using errcode = '22023'; end if;
  insert into public.player_materials (user_id, material, amount)
  select v_uid, key, (value #>> '{}')::int from jsonb_each(v_paid)
  on conflict (user_id, material) do update set amount = public.player_materials.amount + excluded.amount;
  return jsonb_build_object('materials', public.materials_of(v_uid));
end $$;

revoke execute on function public.island_item_json(public.island_items) from public, anon, authenticated;
