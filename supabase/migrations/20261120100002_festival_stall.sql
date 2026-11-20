-- The festival stall: each festival's two items, bought with festival tokens while that festival is on.
-- They come back every year at the same price. The gold shop never sells them.

alter table public.shop_items
  add column festival_kind text check (festival_kind in ('school_holiday', 'cny', 'raya', 'merdeka', 'deepavali')),
  add column token_price int check (token_price > 0),
  add constraint shop_items_festival_price check ((festival_kind is null) = (token_price is null));

-- Keep in step with src/features/shop/catalogue.ts (tests/rls/shop.test.ts checks they match). The gold price is a placeholder.
insert into public.shop_items (id, slot, rarity, price, sort, festival_kind, token_price) values
  ('holiday_sunhat', 'accessory', 'common', 1, 400, 'school_holiday', 30),
  ('pet_shades', 'pet_hat', 'common', 1, 405, 'school_holiday', 20),
  ('lion_dance_hat', 'accessory', 'common', 1, 410, 'cny', 30),
  ('pet_lantern', 'pet_neck', 'common', 1, 415, 'cny', 20),
  ('songket_top', 'top', 'common', 1, 420, 'raya', 30),
  ('pet_ketupat', 'pet_neck', 'common', 1, 425, 'raya', 20),
  ('sparkler_wand', 'weapon', 'common', 1, 430, 'merdeka', 30),
  ('pet_bunting', 'pet_neck', 'common', 1, 435, 'merdeka', 20),
  ('kolam_shawl', 'top', 'common', 1, 440, 'deepavali', 30),
  ('pet_marigold', 'pet_neck', 'common', 1, 445, 'deepavali', 20);

------------------------------------------------------------------------------------------
-- The gold shop refuses festival items (from 20261120090000_harvest_craft.sql, plus that check)
------------------------------------------------------------------------------------------
create or replace function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
  v_rarity text;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select price, rarity into v_price, v_rarity from public.shop_items where id = p_item;
  if v_price is null then raise exception 'No such item' using errcode = '22023'; end if;
  if (select craft_only from public.shop_items where id = p_item) then
    raise exception 'This item is crafted at a camp workbench' using errcode = '22023';
  end if;
  if (select festival_kind is not null from public.shop_items where id = p_item) then
    raise exception 'This item is sold at the festival stall' using errcode = '22023';
  end if;
  if not public.unlocked(public.player_level(v_uid), 'shop_tier', v_rarity) then
    raise exception 'Reach level % to buy this item', public.unlock_level('shop_tier', v_rarity) using errcode = '22023';
  end if;

  -- Lock the wallet so two purchases at once cannot both spend the same gold.
  select gold into v_gold from public.player_wallets where user_id = v_uid for update;
  if exists (select 1 from public.player_items where user_id = v_uid and item_id = p_item) then
    raise exception 'You already own this item' using errcode = '22023';
  end if;
  if coalesce(v_gold, 0) < v_price then
    raise exception 'Not enough gold' using errcode = '22023';
  end if;

  update public.player_wallets set gold = gold - v_price where user_id = v_uid returning gold into v_gold;
  insert into public.player_items (user_id, item_id) values (v_uid, p_item);
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'buy_item', p_item, jsonb_build_object('price', v_price));
  return jsonb_build_object('item_id', p_item, 'gold', v_gold);
end $$;

create or replace function public.buy_festival_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_item public.shop_items;
  v_tokens int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_item from public.shop_items where id = p_item and festival_kind is not null;
  if not found then raise exception 'No such festival item' using errcode = '22023'; end if;
  if not exists (select 1 from public.active_festivals(v_uid) a where a.kind = v_item.festival_kind) then
    raise exception 'This festival is not on right now' using errcode = '22023';
  end if;
  -- Lock the wallet so two purchases at once cannot both spend the same tokens.
  select festival_tokens into v_tokens from public.player_wallets where user_id = v_uid for update;
  if exists (select 1 from public.player_items where user_id = v_uid and item_id = p_item) then
    raise exception 'You already own this item' using errcode = '22023';
  end if;
  if coalesce(v_tokens, 0) < v_item.token_price then
    raise exception 'Not enough festival tokens' using errcode = '22023';
  end if;
  update public.player_wallets set festival_tokens = festival_tokens - v_item.token_price where user_id = v_uid returning festival_tokens into v_tokens;
  insert into public.player_items (user_id, item_id) values (v_uid, p_item);
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'buy_festival_item', p_item, jsonb_build_object('tokens', v_item.token_price));
  return jsonb_build_object('item_id', p_item, 'tokens', v_tokens);
end $$;

------------------------------------------------------------------------------------------
-- Admin preview (from 20261120100001_festival_missions.sql): a reset also takes back that festival's items
------------------------------------------------------------------------------------------
create or replace function public.set_festival_preview(p_id text, p_reset boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_kind text;
begin
  if v_uid is null or not public.has_role(array['admin']) then raise exception 'Admins only' using errcode = '42501'; end if;
  if p_id is null then
    delete from public.festival_previews where user_id = v_uid;
  else
    select kind into v_kind from public.festivals where id = p_id;
    if v_kind is null then raise exception 'No such festival' using errcode = '22023'; end if;
    insert into public.festival_previews (user_id, festival_id) values (v_uid, p_id)
      on conflict (user_id) do update set festival_id = excluded.festival_id;
    if p_reset then
      update public.player_wallets set festival_tokens = 50 where user_id = v_uid;
      delete from public.player_missions m using public.mission_templates t
        where t.id = m.template_id and m.user_id = v_uid and t.festival_kind = v_kind;
      delete from public.player_items i using public.shop_items s
        where s.id = i.item_id and i.user_id = v_uid and s.festival_kind = v_kind;
    end if;
  end if;
  return public.my_festivals();
end $$;

revoke execute on function public.buy_festival_item(text) from public, anon;
grant execute on function public.buy_festival_item(text) to authenticated;
