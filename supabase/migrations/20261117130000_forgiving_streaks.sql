-- Forgiving streaks: shields earned by playing (one per 7 days played, at most 2), used automatically after the weekly
-- rest day; week dots; and a choice to show the streak as a number or only as dots (week view for under-13 by default).

alter table public.user_settings add column streak_view text check (streak_view in ('count', 'week'));

-- Everything is worked out from the days played, so there is no stored state to drift or game.
-- A missed past day uses its ISO week's rest day, then a shield, else the streak restarts. Today is never "missed".
-- Rest and shield days keep the streak alive without adding to it.
create or replace function public.streak_from_days(p_days date[], p_today date) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare
  v_days date[] := (select coalesce(array_agg(distinct x order by x), '{}') from unnest(p_days) x where x <= p_today);
  v_day date;
  v_current int := 0;
  v_best int := 0;
  v_shields int := 0;
  v_played int := 0;
  v_rest_weeks date[] := '{}';
  v_week date;
begin
  if cardinality(v_days) = 0 then
    return jsonb_build_object('current', 0, 'best', 0, 'shields', 0, 'rest_available', true, 'today_done', false);
  end if;
  v_day := v_days[1];
  while v_day <= p_today loop
    if v_day = any (v_days) then
      v_current := v_current + 1;
      v_played := v_played + 1;
      if v_played % 7 = 0 and v_shields < 2 then v_shields := v_shields + 1; end if;
      v_best := greatest(v_best, v_current);
    elsif v_day < p_today then
      v_week := date_trunc('week', v_day)::date;
      if not (v_week = any (v_rest_weeks)) then
        v_rest_weeks := v_rest_weeks || v_week;
      elsif v_shields > 0 then
        v_shields := v_shields - 1;
      else
        v_current := 0;
      end if;
    end if;
    v_day := v_day + 1;
  end loop;
  return jsonb_build_object('current', v_current, 'best', v_best, 'shields', v_shields,
    'rest_available', not (date_trunc('week', p_today)::date = any (v_rest_weeks)),
    'today_done', p_today = any (v_days));
end $$;

create or replace function public.my_streak() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_days date[];
  v_monday date;
  v_view text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_today := public.local_today(v_uid);
  v_monday := date_trunc('week', v_today)::date;
  select coalesce(array_agg(day), '{}') into v_days from public.learning_days where user_id = v_uid;
  select coalesce(s.streak_view, case when public.age_band_for(p.birth_year) = 'under13' then 'week' else 'count' end)
    into v_view
  from public.profiles p left join public.user_settings s on s.user_id = p.id where p.id = v_uid;
  return public.streak_from_days(v_days, v_today) || jsonb_build_object(
    'week', (select jsonb_agg((v_monday + i) = any (v_days) order by i) from generate_series(0, 6) i),
    'month_days', (select count(*) from unnest(v_days) x where date_trunc('month', x) = date_trunc('month', v_today)),
    'view', coalesce(v_view, 'count'));
end $$;

revoke execute on function public.streak_from_days(date[], date) from public, anon;
grant execute on function public.streak_from_days(date[], date) to authenticated;
