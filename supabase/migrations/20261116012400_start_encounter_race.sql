-- Two simultaneous start requests (double tap, React dev double-effects) used to race on the
-- one-active-battle index; the loser now returns the winner's battle instead of an error.
create or replace function public.start_encounter(p_monster text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_hp int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  if found then return public.encounter_state(v_enc); end if;

  select max_hp into v_hp from public.monsters where id = p_monster;
  if v_hp is null then raise exception 'Unknown monster' using errcode = '22023'; end if;

  begin
    insert into public.encounters (user_id, monster_id, monster_hp, current_question_id, question_served_at)
    values (v_uid, p_monster, v_hp, public.pick_question(v_uid), now())
    returning * into v_enc;
  exception when unique_violation then
    select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  end;
  return public.encounter_state(v_enc);
end $$;

revoke execute on function public.start_encounter(text) from public, anon;
grant execute on function public.start_encounter(text) to authenticated;
