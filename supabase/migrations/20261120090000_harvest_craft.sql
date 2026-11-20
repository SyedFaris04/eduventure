-- Harvesting and crafting (bigger islands): materials from harvest nodes (one quick question each), tools, craft-only
-- cosmetics and shared camp builds. Everything is decided here; the client only asks.

create table public.harvest_nodes (
  place text not null,
  x int not null,
  y int not null,
  kind text not null check (kind in ('harvest_tree', 'harvest_rock', 'crystal', 'herb')),
  material text not null check (material in ('wood', 'stone', 'herbs', 'crystal')),
  primary key (place, x, y)
);
create table public.player_materials (
  user_id uuid not null references auth.users (id) on delete cascade,
  material text not null check (material in ('wood', 'stone', 'herbs', 'crystal')),
  amount int not null default 0 check (amount >= 0),
  primary key (user_id, material)
);
create table public.harvest_cooldowns (
  user_id uuid not null references auth.users (id) on delete cascade,
  place text not null,
  x int not null,
  y int not null,
  ready_at timestamptz not null,
  primary key (user_id, place, x, y)
);
create table public.harvests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  place text not null,
  x int not null,
  y int not null,
  material text not null,
  question_id text not null references public.questions (id),
  served_at timestamptz not null default now()
);
create table public.player_tools (
  user_id uuid not null references auth.users (id) on delete cascade,
  tool text not null check (tool in ('stone_axe', 'stone_pickaxe', 'crystal_axe', 'crystal_pickaxe')),
  primary key (user_id, tool)
);
create table public.recipes (
  id text primary key,
  kind text not null check (kind in ('tool', 'cosmetic')),
  cost jsonb not null,
  sort int not null
);
create table public.camp_projects (
  place text not null,
  project text not null check (project in ('camp_bench', 'camp_lantern', 'camp_flag', 'whiteboard')),
  cost jsonb not null,
  built_at timestamptz,
  primary key (place, project)
);
create table public.camp_contributions (
  id bigint generated always as identity primary key,
  place text not null,
  project text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  material text not null,
  amount int not null check (amount > 0),
  created_at timestamptz not null default now(),
  foreign key (place, project) references public.camp_projects (place, project)
);
create index camp_contributions_project on public.camp_contributions (place, project);

revoke all on public.harvest_nodes, public.player_materials, public.harvest_cooldowns, public.harvests, public.player_tools,
  public.recipes, public.camp_projects, public.camp_contributions from anon, authenticated;
grant select on public.recipes, public.camp_projects to authenticated;
alter table public.harvest_nodes enable row level security;
alter table public.player_materials enable row level security;
alter table public.harvest_cooldowns enable row level security;
alter table public.harvests enable row level security;
alter table public.player_tools enable row level security;
alter table public.recipes enable row level security;
alter table public.camp_projects enable row level security;
alter table public.camp_contributions enable row level security;
create policy "recipes are public" on public.recipes for select to authenticated using (true);
create policy "camps are public" on public.camp_projects for select to authenticated using (true);

-- Recipes (tools and craft-only cosmetics); camp projects for every island.
insert into public.recipes (id, kind, cost, sort) values
  ('stone_axe', 'tool', '{"wood": 4, "stone": 3}', 10),
  ('stone_pickaxe', 'tool', '{"wood": 3, "stone": 4}', 20),
  ('crystal_axe', 'tool', '{"wood": 6, "crystal": 4}', 30),
  ('crystal_pickaxe', 'tool', '{"stone": 4, "crystal": 6}', 40),
  ('woodcutter_hat', 'cosmetic', '{"wood": 6, "herbs": 2}', 50),
  ('herb_crown', 'cosmetic', '{"herbs": 8}', 60),
  ('crystal_staff', 'cosmetic', '{"wood": 4, "crystal": 5}', 70),
  ('rattan_pack', 'cosmetic', '{"wood": 8, "herbs": 4}', 80),
  ('pet_leaf_hat', 'cosmetic', '{"herbs": 5}', 90),
  ('pet_crystal_collar', 'cosmetic', '{"stone": 3, "crystal": 3}', 100),
  ('pet_dye_forest', 'cosmetic', '{"herbs": 6}', 110);
insert into public.camp_projects (place, project, cost)
select p, j.project, j.cost::jsonb
from unnest(array['greenhaven', 'science_island', 'mathematics_mountains', 'technology_city', 'language_kingdom']) p,
  (values ('camp_bench', '{"wood": 40}'), ('camp_lantern', '{"wood": 20, "crystal": 6}'),
          ('camp_flag', '{"wood": 15, "herbs": 25}'), ('whiteboard', '{"wood": 50, "stone": 30}')) j(project, cost);

-- Craft-only cosmetics live with the shop items (so wearing them reuses ownership checks) but are never sold.
alter table public.shop_items add column craft_only boolean not null default false;
insert into public.shop_items (id, slot, rarity, price, sort, craft_only) values
  ('woodcutter_hat', 'accessory', 'common', 1, 300, true),
  ('herb_crown', 'accessory', 'common', 1, 310, true),
  ('crystal_staff', 'weapon', 'rare', 1, 320, true),
  ('rattan_pack', 'backpack', 'common', 1, 330, true),
  ('pet_leaf_hat', 'pet_hat', 'common', 1, 340, true),
  ('pet_crystal_collar', 'pet_neck', 'rare', 1, 350, true),
  ('pet_dye_forest', 'pet_dye', 'common', 1, 360, true);

------------------------------------------------------------------------------------------
-- Helpers
------------------------------------------------------------------------------------------
create or replace function public.materials_of(p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'wood', coalesce((select amount from public.player_materials where user_id = p_user and material = 'wood'), 0),
    'stone', coalesce((select amount from public.player_materials where user_id = p_user and material = 'stone'), 0),
    'herbs', coalesce((select amount from public.player_materials where user_id = p_user and material = 'herbs'), 0),
    'crystal', coalesce((select amount from public.player_materials where user_id = p_user and material = 'crystal'), 0))
$$;

-- Extra pieces per harvest from the player's best tool for that material (herbs need no tool).
create or replace function public.tool_bonus(p_user uuid, p_material text) returns int
language sql stable security definer set search_path = '' as $$
  select case
    when p_material = 'wood' then case when exists (select 1 from public.player_tools where user_id = p_user and tool = 'crystal_axe') then 2
                                       when exists (select 1 from public.player_tools where user_id = p_user and tool = 'stone_axe') then 1 else 0 end
    when p_material in ('stone', 'crystal') then case when exists (select 1 from public.player_tools where user_id = p_user and tool = 'crystal_pickaxe') then 2
                                       when exists (select 1 from public.player_tools where user_id = p_user and tool = 'stone_pickaxe') then 1 else 0 end
    else 0 end
$$;

-- Takes materials (all or nothing) using a {material: amount} cost.
create or replace function public.spend_materials(p_user uuid, p_cost jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_m text;
  v_n int;
  v_have int;
begin
  for v_m, v_n in select key, value::int from jsonb_each_text(p_cost) loop
    select amount into v_have from public.player_materials where user_id = p_user and material = v_m for update;
    if coalesce(v_have, 0) < v_n then raise exception 'Not enough %', v_m using errcode = 'P0001'; end if;
  end loop;
  for v_m, v_n in select key, value::int from jsonb_each_text(p_cost) loop
    update public.player_materials set amount = amount - v_n where user_id = p_user and material = v_m;
  end loop;
end $$;

------------------------------------------------------------------------------------------
-- Harvesting
------------------------------------------------------------------------------------------
create or replace function public.my_materials() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('materials', public.materials_of(auth.uid()),
    'tools', coalesce((select jsonb_agg(tool order by tool) from public.player_tools where user_id = auth.uid()), '[]'::jsonb))
$$;

create or replace function public.my_harvest_cooldowns(p_place text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('x', x, 'y', y, 'ready_at', ready_at)), '[]'::jsonb)
  from public.harvest_cooldowns where user_id = auth.uid() and place = p_place and ready_at > now()
$$;

create or replace function public.start_harvest(p_place text, p_x int, p_y int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_node public.harvest_nodes;
  v_monster text;
  v_q text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_node from public.harvest_nodes where place = p_place and x = p_x and y = p_y;
  if not found then raise exception 'Nothing to harvest there' using errcode = '22023'; end if;
  if exists (select 1 from public.harvest_cooldowns where user_id = v_uid and place = p_place and x = p_x and y = p_y and ready_at > now()) then
    raise exception 'Still regrowing' using errcode = 'P0001';
  end if;
  if v_node.material = 'crystal' and public.tool_bonus(v_uid, 'crystal') = 0 then
    raise exception 'You need a pickaxe for crystal' using errcode = 'P0001';
  end if;
  if public.play_left(public.minutes_today(v_uid), public.daily_limit_of(v_uid)) = 0 then
    raise exception 'Time''s up for today — see you tomorrow!' using errcode = 'P0001';
  end if;
  -- A question from the island's subjects, picked like a battle question.
  select id into v_monster from public.monsters where island_id = p_place order by id limit 1;
  v_q := public.pick_question(v_uid, v_monster, false);
  insert into public.harvests (user_id, place, x, y, material, question_id, served_at)
  values (v_uid, p_place, p_x, p_y, v_node.material, v_q, now())
  on conflict (user_id) do update set place = excluded.place, x = excluded.x, y = excluded.y, material = excluded.material,
    question_id = excluded.question_id, served_at = excluded.served_at;
  return jsonb_build_object('material', v_node.material, 'question', public.question_payload(v_q));
end $$;

create or replace function public.answer_harvest(p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_h public.harvests;
  v_q public.questions;
  v_key public.question_keys;
  v_correct boolean;
  v_reason text;
  v_gain int;
  v_missions text[];
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_h from public.harvests where user_id = v_uid for update;
  if not found then raise exception 'No harvest in progress' using errcode = 'P0002'; end if;
  if now() - v_h.served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;
  select * into v_q from public.questions where id = v_h.question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  v_correct := coalesce(public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb)), false);
  if not v_correct then
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;
  -- Recorded like a battle answer (mastery, ratings, missions, streak, pet), without XP or gold.
  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, null, v_q.id, p_answer, v_correct, 0, 0);
  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, false);
  v_gain := case when v_correct then 2 else 1 end + public.tool_bonus(v_uid, v_h.material);
  insert into public.player_materials (user_id, material, amount) values (v_uid, v_h.material, v_gain)
  on conflict (user_id, material) do update set amount = public.player_materials.amount + v_gain;
  insert into public.harvest_cooldowns (user_id, place, x, y, ready_at) values (v_uid, v_h.place, v_h.x, v_h.y, now() + interval '3 minutes')
  on conflict (user_id, place, x, y) do update set ready_at = excluded.ready_at;
  delete from public.harvests where user_id = v_uid;
  return jsonb_build_object('correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'material', v_h.material, 'gained', v_gain, 'materials', public.materials_of(v_uid), 'missions_completed', to_jsonb(v_missions));
end $$;

------------------------------------------------------------------------------------------
-- Crafting and camp builds
------------------------------------------------------------------------------------------
create or replace function public.craft(p_recipe text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_r public.recipes;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_r from public.recipes where id = p_recipe;
  if not found then raise exception 'No such recipe' using errcode = '22023'; end if;
  if (v_r.kind = 'tool' and exists (select 1 from public.player_tools where user_id = v_uid and tool = v_r.id))
     or (v_r.kind = 'cosmetic' and exists (select 1 from public.player_items where user_id = v_uid and item_id = v_r.id)) then
    raise exception 'You already have this' using errcode = '22023';
  end if;
  perform public.spend_materials(v_uid, v_r.cost);
  if v_r.kind = 'tool' then
    insert into public.player_tools (user_id, tool) values (v_uid, v_r.id);
  else
    insert into public.player_items (user_id, item_id) values (v_uid, v_r.id);
  end if;
  insert into public.audit_logs (actor_id, action, target, data) values (v_uid, 'craft', v_r.id, v_r.cost);
  return public.my_materials();
end $$;

create or replace function public.camp_state(p_place text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('project', p.project, 'cost', p.cost, 'built', p.built_at is not null,
    'given', (select coalesce(jsonb_object_agg(material, total), '{}'::jsonb) from (
               select material, sum(amount) as total from public.camp_contributions c where c.place = p.place and c.project = p.project group by material) g),
    'mine', (select coalesce(sum(amount), 0) from public.camp_contributions c where c.place = p.place and c.project = p.project and c.user_id = auth.uid()))
    order by p.project), '[]'::jsonb)
  from public.camp_projects p where p.place = p_place
$$;

create or replace function public.contribute(p_place text, p_project text, p_material text, p_amount int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_p public.camp_projects;
  v_need int;
  v_given int;
  v_put int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_p from public.camp_projects where place = p_place and project = p_project for update;
  if not found then raise exception 'No such camp project' using errcode = '22023'; end if;
  if v_p.built_at is not null then raise exception 'Already built' using errcode = 'P0001'; end if;
  v_need := (v_p.cost ->> p_material)::int;
  if v_need is null then raise exception 'This project does not need %', p_material using errcode = '22023'; end if;
  select coalesce(sum(amount), 0) into v_given from public.camp_contributions where place = p_place and project = p_project and material = p_material;
  v_put := least(coalesce(p_amount, 0), v_need - v_given);
  if v_put <= 0 then raise exception 'Enough % has been given already', p_material using errcode = 'P0001'; end if;
  perform public.spend_materials(v_uid, jsonb_build_object(p_material, v_put));
  insert into public.camp_contributions (place, project, user_id, material, amount) values (p_place, p_project, v_uid, p_material, v_put);
  -- Built once every material in the cost has been given in full.
  if not exists (
    select 1 from jsonb_each_text(v_p.cost) c
    where c.value::int > (select coalesce(sum(amount), 0) from public.camp_contributions x where x.place = p_place and x.project = p_project and x.material = c.key)
  ) then
    update public.camp_projects set built_at = now() where place = p_place and project = p_project;
  end if;
  return jsonb_build_object('given', v_put, 'materials', public.materials_of(v_uid), 'camp', public.camp_state(p_place));
end $$;

------------------------------------------------------------------------------------------
-- The shop never sells craft-only items (from 20261116090100_unlocks.sql, plus that check)
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

revoke execute on function public.my_materials(), public.my_harvest_cooldowns(text), public.start_harvest(text, int, int), public.answer_harvest(jsonb),
  public.craft(text), public.camp_state(text), public.contribute(text, text, text, int) from public, anon;
grant execute on function public.my_materials(), public.my_harvest_cooldowns(text), public.start_harvest(text, int, int), public.answer_harvest(jsonb),
  public.craft(text), public.camp_state(text), public.contribute(text, text, text, int) to authenticated;
revoke execute on function public.materials_of(uuid), public.tool_bonus(uuid, text), public.spend_materials(uuid, jsonb) from public, anon, authenticated;
