-- Level unlocks: one server-side list drives every level reward. Every gate is checked here, never only in the UI.

------------------------------------------------------------------------------------------
-- The unlock list
------------------------------------------------------------------------------------------
create table public.level_unlocks (
  level int not null check (level >= 1),
  kind text not null check (kind in ('helper', 'boss', 'shop_tier', 'boat', 'title')),
  key text not null,
  primary key (kind, key)
);
-- Keep in step with src/game/unlocks.ts (tests/rls/unlocks.test.ts checks they match).
insert into public.level_unlocks (level, kind, key) values
  (3, 'helper', 'second_chance'),
  (4, 'title', 'kampung_hero'),
  (5, 'boss', 'island_bosses'),
  (5, 'shop_tier', 'rare'),
  (7, 'boat', 'swift_perahu'),
  (8, 'helper', 'fifty'),
  (10, 'shop_tier', 'epic'),
  (10, 'title', 'island_explorer'),
  (15, 'title', 'scholar_of_the_seas');

revoke all on public.level_unlocks from anon, authenticated;
grant select on public.level_unlocks to authenticated;
alter table public.level_unlocks enable row level security;
create policy "unlocks are public" on public.level_unlocks for select to authenticated using (true);

-- Pure lookup: common shop items are never gated; unknown keys never unlock.
create or replace function public.unlocked(p_level int, p_kind text, p_key text) returns boolean
language sql stable security definer set search_path = '' as $$
  select (p_kind = 'shop_tier' and p_key = 'common')
    or exists (select 1 from public.level_unlocks u where u.kind = p_kind and u.key = p_key and u.level <= p_level)
$$;

create or replace function public.unlock_level(p_kind text, p_key text) returns int
language sql stable security definer set search_path = '' as $$
  select level from public.level_unlocks where kind = p_kind and key = p_key
$$;

create or replace function public.player_level(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select level from public.player_xp where user_id = p_user), 1)
$$;

------------------------------------------------------------------------------------------
-- Island bosses: the level-5 gate now reads the unlock list
------------------------------------------------------------------------------------------
create or replace function public.start_boss(p_boss text default 'guardian') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_boss is null or p_boss not in ('guardian', 'raja_rafflesia', 'abacus_titan') then
    raise exception 'Unknown boss' using errcode = '22023';
  end if;
  select * into v_run from public.boss_runs where user_id = v_uid and status = 'active';
  if found then return public.boss_state(v_run); end if;
  if p_boss <> 'guardian' and not public.unlocked(public.player_level(v_uid), 'boss', 'island_bosses') then
    raise exception 'Reach level % to challenge this boss', public.unlock_level('boss', 'island_bosses') using errcode = 'P0001';
  end if;
  begin
    insert into public.boss_runs (user_id, boss_id, current_question_id, question_served_at)
    values (v_uid, p_boss, public.pick_boss_question(v_uid, 1, p_boss), now())
    returning * into v_run;
  exception when unique_violation then
    select * into v_run from public.boss_runs where user_id = v_uid and status = 'active';
  end;
  return public.boss_state(v_run);
end $$;

------------------------------------------------------------------------------------------
-- Shop tiers: rare from level 5, epic from level 10. Wearing stays an ownership check only.
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

------------------------------------------------------------------------------------------
-- Battle helpers: Second Chance (automatic, level 3) and 50/50 (level 8)
------------------------------------------------------------------------------------------
alter table public.encounters
  add column second_chance_used boolean not null default false,
  add column fifty_used boolean not null default false,
  add column fifty_question_id text,
  add column hidden_options text[] not null default '{}';
alter table public.boss_runs
  add column second_chance_used boolean not null default false,
  add column fifty_used boolean not null default false,
  add column fifty_question_id text,
  add column hidden_options text[] not null default '{}';

-- Two wrong option ids to hide, or none when the question has fewer than two wrong options.
-- Safe to expose: it only knows the key the caller passes in.
create or replace function public.fifty_hidden(p_type text, p_options jsonb, p_key jsonb) returns text[]
language plpgsql volatile set search_path = '' as $$
declare
  v_wrong text[];
begin
  if p_type not in ('mcq', 'multi_select') or jsonb_typeof(p_options) is distinct from 'array' then return '{}'; end if;
  select coalesce(array_agg(o ->> 'id'), '{}') into v_wrong
  from jsonb_array_elements(p_options) o
  where case when p_type = 'mcq' then (o ->> 'id') is distinct from (p_key #>> '{}')
             else not (coalesce(p_key, '[]'::jsonb) ? (o ->> 'id')) end;
  if cardinality(v_wrong) < 2 then return '{}'; end if;
  return (select array_agg(x) from (select x from unnest(v_wrong) x order by random() limit 2) s);
end $$;

create or replace function public.helpers_state(p_user uuid, p_second_used boolean, p_fifty_used boolean, p_hidden text[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'second_chance_left', public.unlocked(public.player_level(p_user), 'helper', 'second_chance') and not p_second_used,
    'fifty_used', p_fifty_used,
    'hidden', to_jsonb(coalesce(p_hidden, '{}')))
$$;

create or replace function public.encounter_state(e public.encounters) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'encounter_id', e.id, 'monster_id', e.monster_id, 'monster_hp', e.monster_hp,
    'monster_max_hp', (select max_hp from public.monsters where id = e.monster_id),
    'player_hp', e.player_hp, 'combo', e.combo, 'status', e.status,
    'helpers', public.helpers_state(e.user_id, e.second_chance_used, e.fifty_used, e.hidden_options),
    'question', case when e.status = 'active' then public.question_payload(e.current_question_id) end)
$$;

create or replace function public.boss_state(r public.boss_runs) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'run_id', r.id, 'boss_id', r.boss_id, 'round', r.round, 'rounds', 4, 'round_progress', r.round_progress, 'per_round', 3,
    'hearts', r.hearts, 'status', r.status,
    'helpers', public.helpers_state(r.user_id, r.second_chance_used, r.fifty_used, r.hidden_options),
    'question', case when r.status = 'active' then public.question_payload(r.current_question_id) end)
$$;

create or replace function public.use_fifty(p_encounter uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_q public.questions;
  v_hidden text[];
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_enc from public.encounters where id = p_encounter and user_id = v_uid for update;
  if not found then raise exception 'Encounter not found' using errcode = 'P0002'; end if;
  if v_enc.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if not public.unlocked(public.player_level(v_uid), 'helper', 'fifty') then
    raise exception 'Reach level % to use 50/50', public.unlock_level('helper', 'fifty') using errcode = 'P0001';
  end if;
  if v_enc.fifty_used then raise exception '50/50 already used this battle' using errcode = 'P0001'; end if;
  select * into v_q from public.questions where id = v_enc.current_question_id;
  v_hidden := public.fifty_hidden(v_q.type, v_q.options, (select answer from public.question_keys where question_id = v_q.id));
  if cardinality(v_hidden) < 2 then raise exception '50/50 needs at least two wrong options' using errcode = 'P0001'; end if;
  update public.encounters set fifty_used = true, fifty_question_id = v_q.id, hidden_options = v_hidden where id = v_enc.id;
  return jsonb_build_object('hidden', to_jsonb(v_hidden));
end $$;

create or replace function public.use_boss_fifty(p_run uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
  v_q public.questions;
  v_hidden text[];
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_run from public.boss_runs where id = p_run and user_id = v_uid for update;
  if not found then raise exception 'Boss battle not found' using errcode = 'P0002'; end if;
  if v_run.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if not public.unlocked(public.player_level(v_uid), 'helper', 'fifty') then
    raise exception 'Reach level % to use 50/50', public.unlock_level('helper', 'fifty') using errcode = 'P0001';
  end if;
  if v_run.fifty_used then raise exception '50/50 already used this battle' using errcode = 'P0001'; end if;
  select * into v_q from public.questions where id = v_run.current_question_id;
  v_hidden := public.fifty_hidden(v_q.type, v_q.options, (select answer from public.question_keys where question_id = v_q.id));
  if cardinality(v_hidden) < 2 then raise exception '50/50 needs at least two wrong options' using errcode = 'P0001'; end if;
  update public.boss_runs set fifty_used = true, fifty_question_id = v_q.id, hidden_options = v_hidden where id = v_run.id;
  return jsonb_build_object('hidden', to_jsonb(v_hidden));
end $$;

-- answer_question / answer_boss: Second Chance, 50/50 half XP, hidden options cleared with each new question.
create or replace function public.answer_question(p_encounter uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_q public.questions;
  v_key public.question_keys;
  v_mon public.monsters;
  v_correct boolean;
  v_farmed boolean;
  v_damage int := 0;
  v_xp int := 0;
  v_gold int := 0;
  v_bonus_xp int := 0;
  v_bonus_gold int := 0;
  v_reason text;
  v_old_level int;
  v_new_level int;
  v_total_xp bigint;
  v_total_gold bigint;
  v_missions text[];
  v_second boolean := false;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select * into v_enc from public.encounters where id = p_encounter and user_id = v_uid for update;
  if not found then raise exception 'Encounter not found' using errcode = 'P0002'; end if;
  if v_enc.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if now() - v_enc.question_served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;

  select * into v_q from public.questions where id = v_enc.current_question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  select * into v_mon from public.monsters where id = v_enc.monster_id;

  v_correct := public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb));
  v_second := not v_correct and not v_enc.second_chance_used
    and public.unlocked(public.player_level(v_uid), 'helper', 'second_chance');
  v_farmed := exists (
    select 1 from public.question_attempts
    where user_id = v_uid and question_id = v_q.id and correct and created_at > now() - interval '24 hours');

  if v_correct then
    v_enc.combo := v_enc.combo + 1;
    v_damage := round((12 + 4 * v_q.difficulty) * (1 + least(v_enc.combo - 1, 5) * 0.1));
    v_enc.monster_hp := greatest(0, v_enc.monster_hp - v_damage);
    if not v_farmed then
      v_xp := 5 * v_q.difficulty;
      v_gold := 2 * v_q.difficulty;
      -- 50/50 on this question halves its XP.
      if v_enc.fifty_question_id = v_q.id then v_xp := v_xp / 2; end if;
    end if;
  else
    v_enc.combo := 0;
    if v_second then
      v_enc.second_chance_used := true; -- Second Chance: this wrong answer costs no HP
    else
      v_enc.player_hp := greatest(0, v_enc.player_hp - 10);
    end if;
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;

  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, v_enc.id, v_q.id, p_answer, v_correct, v_xp, v_gold);

  if v_enc.monster_hp = 0 then
    v_enc.status := 'won';
    v_bonus_xp := v_mon.xp_reward;
    v_bonus_gold := v_mon.gold_reward;
  elsif v_enc.player_hp = 0 then
    v_enc.status := 'lost';
  end if;

  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, v_enc.status = 'won');

  select level into v_old_level from public.player_xp where user_id = v_uid;
  update public.player_xp
    set xp = xp + v_xp + v_bonus_xp, level = public.level_for_xp(xp + v_xp + v_bonus_xp)
    where user_id = v_uid
    returning xp, level into v_total_xp, v_new_level;
  update public.player_wallets set gold = gold + v_gold + v_bonus_gold where user_id = v_uid returning gold into v_total_gold;

  if v_enc.status = 'active' then
    v_enc.current_question_id := public.pick_question(v_uid, v_enc.monster_id);
    v_enc.question_served_at := now();
    v_enc.hidden_options := '{}';
  else
    v_enc.ended_at := now();
  end if;

  update public.encounters set
    monster_hp = v_enc.monster_hp, player_hp = v_enc.player_hp, combo = v_enc.combo, status = v_enc.status,
    current_question_id = v_enc.current_question_id, question_served_at = v_enc.question_served_at,
    xp_earned = xp_earned + v_xp + v_bonus_xp, gold_earned = gold_earned + v_gold + v_bonus_gold, ended_at = v_enc.ended_at,
    second_chance_used = v_enc.second_chance_used, hidden_options = v_enc.hidden_options
  where id = v_enc.id
  returning * into v_enc;

  return jsonb_build_object(
    'correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'damage', v_damage, 'farmed', v_correct and v_farmed, 'xp_gained', v_xp + v_bonus_xp, 'gold_gained', v_gold + v_bonus_gold,
    'bonus', jsonb_build_object('xp', v_bonus_xp, 'gold', v_bonus_gold),
    'totals', jsonb_build_object('xp', v_total_xp, 'level', v_new_level, 'gold', v_total_gold),
    'leveled_up', v_new_level > v_old_level,
    'second_chance', v_second,
    'missions_completed', to_jsonb(v_missions),
    'state', public.encounter_state(v_enc));
end $$;

create or replace function public.answer_boss(p_run uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
  v_q public.questions;
  v_key public.question_keys;
  v_correct boolean;
  v_reason text;
  v_missions text[];
  v_reward jsonb := null;
  v_rewarded boolean;
  v_old int;
  v_level int;
  v_xp bigint;
  v_gold bigint;
  v_second boolean := false;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_run from public.boss_runs where id = p_run and user_id = v_uid for update;
  if not found then raise exception 'Boss battle not found' using errcode = 'P0002'; end if;
  if v_run.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if now() - v_run.question_served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;

  select * into v_q from public.questions where id = v_run.current_question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  v_correct := public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb));
  v_second := not v_correct and not v_run.second_chance_used
    and public.unlocked(public.player_level(v_uid), 'helper', 'second_chance');

  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, null, v_q.id, p_answer, v_correct, 0, 0);

  if v_correct then
    v_run.round_progress := v_run.round_progress + 1;
    if v_run.round_progress = 3 then
      if v_run.round = 4 then v_run.status := 'won';
      else
        v_run.round := v_run.round + 1;
        v_run.round_progress := 0;
      end if;
    end if;
  else
    if v_second then
      v_run.second_chance_used := true; -- Second Chance: this wrong answer costs no heart
    else
      v_run.hearts := v_run.hearts - 1;
      if v_run.hearts = 0 then v_run.status := 'lost'; end if;
    end if;
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;

  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, false);

  if v_run.status = 'won' then
    insert into public.boss_rewards (user_id, boss_id, day, xp, gold)
    values (v_uid, v_run.boss_id, public.local_today(v_uid), 150, 80)
    on conflict do nothing;
    v_rewarded := found;
    if v_rewarded then
      select level into v_old from public.player_xp where user_id = v_uid;
      update public.player_xp set xp = xp + 150, level = public.level_for_xp(xp + 150) where user_id = v_uid returning xp, level into v_xp, v_level;
      update public.player_wallets set gold = gold + 80 where user_id = v_uid returning gold into v_gold;
    end if;
    v_reward := jsonb_build_object('xp', case when v_rewarded then 150 else 0 end, 'gold', case when v_rewarded then 80 else 0 end,
      'already_today', not v_rewarded, 'leveled_up', coalesce(v_level > v_old, false));
  end if;

  if v_run.status = 'active' then
    v_run.current_question_id := public.pick_boss_question(v_uid, v_run.round, v_run.boss_id);
    v_run.question_served_at := now();
    v_run.hidden_options := '{}';
  else
    v_run.ended_at := now();
  end if;

  update public.boss_runs set round = v_run.round, round_progress = v_run.round_progress, hearts = v_run.hearts, status = v_run.status,
    current_question_id = v_run.current_question_id, question_served_at = v_run.question_served_at, ended_at = v_run.ended_at,
    second_chance_used = v_run.second_chance_used, hidden_options = v_run.hidden_options
  where id = v_run.id returning * into v_run;

  select xp into v_xp from public.player_xp where user_id = v_uid;
  select level into v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;

  return jsonb_build_object(
    'correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'reward', v_reward, 'missions_completed', to_jsonb(v_missions), 'second_chance', v_second,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold),
    'state', public.boss_state(v_run));
end $$;


------------------------------------------------------------------------------------------
-- Titles
------------------------------------------------------------------------------------------
create table public.player_titles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  title_key text not null,
  updated_at timestamptz not null default now()
);
revoke all on public.player_titles from anon, authenticated;
grant select on public.player_titles to authenticated;
alter table public.player_titles enable row level security;
create policy "own row" on public.player_titles for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.set_title(p_key text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_key is null then
    delete from public.player_titles where user_id = v_uid;
    return;
  end if;
  if not public.unlocked(public.player_level(v_uid), 'title', p_key) then
    raise exception 'Reach level % to use this title', coalesce(public.unlock_level('title', p_key)::text, '?') using errcode = 'P0001';
  end if;
  insert into public.player_titles (user_id, title_key) values (v_uid, p_key)
  on conflict (user_id) do update set title_key = excluded.title_key, updated_at = now();
end $$;

create or replace function public.my_title() returns text
language sql stable security definer set search_path = '' as $$
  select title_key from public.player_titles where user_id = auth.uid()
$$;

------------------------------------------------------------------------------------------
-- Privileges
------------------------------------------------------------------------------------------
revoke execute on function public.unlocked(int, text, text), public.unlock_level(text, text), public.fifty_hidden(text, jsonb, jsonb),
  public.use_fifty(uuid), public.use_boss_fifty(uuid), public.set_title(text), public.my_title() from public, anon;
grant execute on function public.unlocked(int, text, text), public.unlock_level(text, text), public.fifty_hidden(text, jsonb, jsonb),
  public.use_fifty(uuid), public.use_boss_fifty(uuid), public.set_title(text), public.my_title() to authenticated;
revoke execute on function public.player_level(uuid), public.helpers_state(uuid, boolean, boolean, text[]) from public, anon, authenticated;
