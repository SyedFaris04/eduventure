-- A node never pays twice: answer_harvest re-checks the regrowth after locking the pending row, because an ask that
-- raced the previous answer could pass start_harvest's check and leave a fresh pending row. From 20261120090000.
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
  -- An ask that raced an earlier answer for this node left a pending row behind the regrowth: it pays nothing.
  if exists (select 1 from public.harvest_cooldowns where user_id = v_uid and place = v_h.place and x = v_h.x and y = v_h.y and ready_at > now()) then
    raise exception 'Still regrowing' using errcode = 'P0001';
  end if;
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
