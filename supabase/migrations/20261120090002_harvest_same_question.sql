-- Asking again for the same node (a page reload, or two overlapping asks) keeps the pending question instead of
-- picking a new one: the question shown is always the one marked, and restarting cannot swap a hard question away.
-- From 20261120090000_harvest_craft.sql, with the pending row kept for 10 minutes per node.
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
  select id into v_monster from public.monsters where island_id = p_place order by id limit 1;
  v_q := public.pick_question(v_uid, v_monster, false);
  -- A pending harvest of this node wins; an overlapping ask waits on the row and then keeps it.
  insert into public.harvests as h (user_id, place, x, y, material, question_id, served_at)
  values (v_uid, p_place, p_x, p_y, v_node.material, v_q, now())
  on conflict (user_id) do update set place = excluded.place, x = excluded.x, y = excluded.y, material = excluded.material,
    question_id = excluded.question_id, served_at = excluded.served_at
  where (h.place, h.x, h.y) is distinct from (excluded.place, excluded.x, excluded.y) or h.served_at < now() - interval '10 minutes';
  select question_id into v_q from public.harvests where user_id = v_uid;
  return jsonb_build_object('material', v_node.material, 'question', public.question_payload(v_q));
end $$;
