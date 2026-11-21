-- Harvest by slashing (owner's choice, 2026-11-21): no question. Three swings in the client, then one call here.
-- Same rules as start_harvest/answer_harvest (from 20261120090002 and 20261120100001): a real node, not regrowing,
-- a pickaxe for crystal, the daily play limit; plus at most one completed harvest every 1.5 seconds per player.
-- Harvests still count for the festival "harvest" missions but no longer as learning answers. The old question
-- functions stay for older clients.

create or replace function public.slash_harvest(p_place text, p_x int, p_y int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_node public.harvest_nodes;
  v_gain int;
  v_missions text[];
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_node from public.harvest_nodes where place = p_place and x = p_x and y = p_y;
  if not found then raise exception 'Nothing to harvest there' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('slash:' || v_uid::text));
  if exists (select 1 from public.harvest_cooldowns where user_id = v_uid and place = p_place and x = p_x and y = p_y and ready_at > now()) then
    raise exception 'Still regrowing' using errcode = 'P0001';
  end if;
  if v_node.material = 'crystal' and public.tool_bonus(v_uid, 'crystal') = 0 then
    raise exception 'You need a pickaxe for crystal' using errcode = 'P0001';
  end if;
  if public.play_left(public.minutes_today(v_uid), public.daily_limit_of(v_uid)) = 0 then
    raise exception 'Time''s up for today — see you tomorrow!' using errcode = 'P0001';
  end if;
  -- Every harvest sets a 3-minute regrowth, so the newest regrowth tells when the last harvest was.
  if exists (select 1 from public.harvest_cooldowns where user_id = v_uid and ready_at > now() + interval '3 minutes' - interval '1.5 seconds') then
    raise exception 'Too fast' using errcode = 'P0001';
  end if;
  v_gain := 2 + public.tool_bonus(v_uid, v_node.material);
  insert into public.player_materials (user_id, material, amount) values (v_uid, v_node.material, v_gain)
  on conflict (user_id, material) do update set amount = public.player_materials.amount + v_gain;
  insert into public.harvest_cooldowns (user_id, place, x, y, ready_at) values (v_uid, p_place, p_x, p_y, now() + interval '3 minutes')
  on conflict (user_id, place, x, y) do update set ready_at = excluded.ready_at;
  v_missions := public.bump_missions(v_uid, 'harvest', null);
  return jsonb_build_object('material', v_node.material, 'gained', v_gain, 'materials', public.materials_of(v_uid),
    'missions_completed', to_jsonb(v_missions));
end $$;

revoke execute on function public.slash_harvest(text, int, int) from public, anon;
grant execute on function public.slash_harvest(text, int, int) to authenticated;

-- Materials now come faster: recipes cost half as much again (rounded up), unfinished camp builds twice as much.
update public.recipes
set cost = (select jsonb_object_agg(k, ceil((v #>> '{}')::numeric * 1.5)::int) from jsonb_each(cost) e(k, v));
update public.camp_projects
set cost = (select jsonb_object_agg(k, ((v #>> '{}')::int) * 2) from jsonb_each(cost) e(k, v))
where built_at is null and cost <> '{}'::jsonb;
