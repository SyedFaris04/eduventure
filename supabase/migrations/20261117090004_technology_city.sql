-- Technology City: a fourth island whose monsters ask programming questions, and the Glitch Golem.

insert into public.islands (id, subject_ids, sort) values
  ('technology_city', array['programming', 'computer_science', 'artificial_intelligence', 'cybersecurity'], 40);

insert into public.monsters (id, max_hp, xp_reward, gold_reward, island_id) values
  ('bugsy', 100, 40, 16, 'technology_city'),
  ('bytebot', 120, 48, 19, 'technology_city'),
  ('loopy', 130, 55, 22, 'technology_city');

alter table public.boss_runs drop constraint boss_runs_boss_id_check;
alter table public.boss_runs add constraint boss_runs_boss_id_check check (boss_id in ('guardian', 'raja_rafflesia', 'abacus_titan', 'glitch_golem'));

create or replace function public.boss_island(p_boss text) returns text
language sql immutable set search_path = '' as $$
  select case p_boss
    when 'raja_rafflesia' then 'science_island'
    when 'abacus_titan' then 'mathematics_mountains'
    when 'glitch_golem' then 'technology_city'
  end
$$;

-- Any island boss is known through boss_island(), so a new island only has to add its line there.
create or replace function public.start_boss(p_boss text default 'guardian') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_run public.boss_runs;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_boss is null or (p_boss <> 'guardian' and public.boss_island(p_boss) is null) then
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
