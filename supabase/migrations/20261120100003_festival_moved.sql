-- Correcting a festival's start date (Raya and Deepavali depend on the moon) keeps every player's progress:
-- festival-long missions are keyed on the festival's start, so they move with it. Daily ones use the player's day.
create or replace function public.festival_moved() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.starts_on is distinct from old.starts_on then
    update public.player_missions m set period_start = new.starts_on
    from public.mission_templates t
    where t.id = m.template_id and t.festival_kind = old.kind and t.period = 'festival' and m.period_start = old.starts_on;
  end if;
  return new;
end $$;

create trigger festival_moved after update of starts_on on public.festivals
  for each row execute function public.festival_moved();

revoke execute on function public.festival_moved() from public, anon, authenticated;
