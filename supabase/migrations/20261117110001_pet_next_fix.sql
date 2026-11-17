-- pet_next: append to the missing list with array_append (|| read 'points' as an array literal).

create or replace function public.pet_next(p_stage text, p_points int, p_level int, p_gold bigint) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_next text;
  v_points int;
  v_gold int;
  v_level int;
  v_missing text[] := '{}';
begin
  if p_stage = 'adult' then
    return jsonb_build_object('next', null, 'points', 0, 'level', 0, 'gold', 0, 'missing', '[]'::jsonb);
  end if;
  v_next := case when p_stage = 'baby' then 'young' else 'adult' end;
  v_points := case when v_next = 'young' then 100 else 300 end;
  v_gold := case when v_next = 'young' then 50 else 150 end;
  v_level := public.unlock_level('pet', 'pet_' || v_next);
  if p_points < v_points then v_missing := array_append(v_missing, 'points'); end if;
  if p_level < v_level then v_missing := array_append(v_missing, 'level'); end if;
  if p_gold < v_gold then v_missing := array_append(v_missing, 'gold'); end if;
  return jsonb_build_object('next', v_next, 'points', v_points, 'level', v_level, 'gold', v_gold, 'missing', to_jsonb(v_missing));
end $$;
