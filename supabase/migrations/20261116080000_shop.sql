-- Phase 4: shop items, ownership and purchase. Gold and ownership change only inside buy_item().

create table public.shop_items (
  id text primary key check (id ~ '^[a-z0-9_]{1,24}$'),
  slot text not null check (slot in ('top', 'bottom', 'shoes', 'accessory', 'weapon', 'backpack')),
  rarity text not null check (rarity in ('common', 'rare', 'epic')),
  price int not null check (price > 0),
  sort int not null,
  created_at timestamptz not null default now()
);

-- Keep in step with src/features/shop/catalogue.ts (tests/rls/shop.test.ts checks they match).
insert into public.shop_items (id, slot, rarity, price, sort) values
  ('leaf_crown', 'accessory', 'common', 80, 10),
  ('scholar_coat', 'top', 'common', 120, 20),
  ('owl_pack', 'backpack', 'common', 150, 30),
  ('wizard_hat', 'accessory', 'rare', 500, 40),
  ('knight_tabard', 'top', 'rare', 500, 50),
  ('crystal_wand', 'weapon', 'rare', 550, 60),
  ('steel_sword', 'weapon', 'rare', 600, 70),
  ('winged_boots', 'shoes', 'rare', 600, 80),
  ('star_cloak', 'top', 'epic', 2000, 90),
  ('golden_crown', 'accessory', 'epic', 2000, 100),
  ('golden_quill', 'weapon', 'epic', 2200, 110);

create table public.player_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  item_id text not null references public.shop_items (id),
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create or replace function public.buy_item(p_item text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_price int;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select price into v_price from public.shop_items where id = p_item;
  if v_price is null then raise exception 'No such item' using errcode = '22023'; end if;

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

-- Players may update their own character row, so wearing a shop item is checked here.
create or replace function public.check_items_owned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from jsonb_each_text(new.appearance) e
    join public.shop_items s on s.slot = e.key and s.id = e.value
    where not exists (select 1 from public.player_items p where p.user_id = new.user_id and p.item_id = s.id)
  ) then
    raise exception 'You do not own one of these items' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger characters_items_owned
  before insert or update of appearance on public.characters
  for each row execute function public.check_items_owned();

revoke all on public.shop_items, public.player_items from anon, authenticated;
grant select on public.shop_items, public.player_items to authenticated;
alter table public.shop_items enable row level security;
alter table public.player_items enable row level security;
create policy "catalogue is public" on public.shop_items for select to authenticated using (true);
create policy "own row" on public.player_items for select to authenticated using (user_id = (select auth.uid()));

revoke execute on function public.check_items_owned() from public, anon, authenticated;
revoke execute on function public.buy_item(text) from public, anon;
grant execute on function public.buy_item(text) to authenticated;
