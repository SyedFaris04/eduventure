-- Language Hall: language exercises in the same lesson engine. The server marks every exercise; listening is a
-- bonus (some phones have no voice for a language), so it never blocks the reward.

alter table public.courses add column kind text not null default 'code' check (kind in ('code', 'language'));
alter table public.courses drop constraint courses_language_check;
alter table public.courses add constraint courses_language_check check (language in ('python', 'javascript', 'english', 'malay'));

alter table public.lesson_steps drop constraint lesson_steps_kind_check;
alter table public.lesson_steps add constraint lesson_steps_kind_check
  check (kind in ('learn', 'predict', 'fix', 'write', 'card', 'pick', 'match', 'build', 'gap', 'listen', 'type'));
alter table public.lesson_steps
  add column word text,
  add column meaning text,
  add column emoji text,
  add column say text,
  add column prompt text,
  add column note text,
  add column sentence text,
  add column tiles text[],
  add column pairs jsonb; -- public: {left: [...], right: [...]}, each list shuffled; the pairing itself is in the key

-- Same rule as normAnswer() in src/features/academy/codeText.ts (tests/rls/language.test.ts checks they agree).
create or replace function public.norm_answer(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(btrim(translate(lower(coalesce(p, '')), '''"‘’“”', '')), '\s+', ' ', 'g'), '[.!?]+$', ''))
$$;

-- A list of [left, right] pairs as a sorted set, so pairs can be matched in any order.
create or replace function public.pair_set(p jsonb) returns text[]
language sql immutable set search_path = '' as $$
  select case when jsonb_typeof(p) = 'array'
    then (select coalesce(array_agg((e ->> 0) || chr(31) || (e ->> 1) order by (e ->> 0) || chr(31) || (e ->> 1)), '{}') from jsonb_array_elements(p) e)
  end
$$;

create or replace function public.start_lesson(p_lesson text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_l public.lessons;
  v_a public.lesson_attempts;
  v_missing int;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_l from public.lessons where id = p_lesson;
  if not found or not public.lesson_visible(v_l.status) then raise exception 'Lesson not found' using errcode = 'P0002'; end if;

  -- Units open in order: every lesson of the earlier units must be finished first.
  select min(x.unit_index) into v_missing from public.lessons x
  where x.course_id = v_l.course_id and x.unit_index < v_l.unit_index and public.lesson_visible(x.status)
    and not exists (select 1 from public.lesson_rewards r where r.user_id = v_uid and r.lesson_id = x.id);
  if v_missing is not null then raise exception 'Finish unit % first', v_missing using errcode = 'P0001'; end if;

  select * into v_a from public.lesson_attempts where user_id = v_uid and lesson_id = p_lesson and status = 'active';
  if not found then
    begin
      insert into public.lesson_attempts (user_id, lesson_id) values (v_uid, p_lesson) returning * into v_a;
    exception when unique_violation then
      select * into v_a from public.lesson_attempts where user_id = v_uid and lesson_id = p_lesson and status = 'active';
    end;
  end if;

  return jsonb_build_object(
    'attempt_id', v_a.id,
    'lesson', jsonb_build_object('id', v_l.id, 'title', v_l.title, 'course_id', v_l.course_id, 'unit_index', v_l.unit_index, 'lesson_index', v_l.lesson_index),
    'steps', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id, 'kind', s.kind, 'text', s.text, 'code', s.code, 'options', s.options, 'broken_line', s.broken_line,
        'starter', s.starter, 'expected_output', s.expected_output, 'must_use', to_jsonb(s.must_use), 'hint', s.hint,
        'word', s.word, 'meaning', s.meaning, 'emoji', s.emoji, 'say', s.say, 'prompt', s.prompt, 'note', s.note, 'sentence', s.sentence,
        'tiles', to_jsonb(s.tiles), 'pairs', s.pairs) order by s.step_index), '[]')
      from public.lesson_steps s where s.lesson_id = v_l.id),
    'results', (select coalesce(jsonb_agg(jsonb_build_object('step_id', r.step_id, 'correct', r.correct, 'tries', r.tries)), '[]')
      from public.lesson_step_results r where r.attempt_id = v_a.id));
end $$;

create or replace function public.answer_lesson_step(p_attempt uuid, p_step text, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_a public.lesson_attempts;
  v_s public.lesson_steps;
  v_k public.lesson_step_keys;
  v_correct boolean;
  v_tries int;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  perform 1 from public.lesson_attempts where id = v_a.id for update;
  if v_a.status <> 'active' then raise exception 'This lesson has ended' using errcode = 'P0001'; end if;
  select * into v_s from public.lesson_steps where id = p_step and lesson_id = v_a.lesson_id;
  if not found then raise exception 'Step not found' using errcode = 'P0002'; end if;
  if v_s.kind not in ('predict', 'fix', 'pick', 'match', 'build', 'gap', 'listen', 'type') then
    raise exception 'This step is checked on your device' using errcode = '22023';
  end if;
  if v_a.last_answer_at is not null and now() - v_a.last_answer_at < interval '1 second' then
    raise exception 'Too fast: take a moment to think' using errcode = 'P0001';
  end if;

  select * into v_k from public.lesson_step_keys where step_id = v_s.id;
  v_correct := case
    when v_s.kind = 'fix' then public.norm_code(p_answer ->> 'line') in (select public.norm_code(x) from jsonb_array_elements_text(v_k.answer -> 'accept') x)
    when v_s.kind = 'type' then public.norm_answer(p_answer ->> 'text') in (select public.norm_answer(x) from jsonb_array_elements_text(v_k.answer -> 'accept') x)
    when v_s.kind = 'match' then public.pair_set(p_answer -> 'pairs') = public.pair_set(v_k.answer -> 'pairs')
    when v_s.kind = 'build' then jsonb_typeof(p_answer -> 'order') = 'array' and (p_answer -> 'order') in (select x from jsonb_array_elements(v_k.answer -> 'orders') x)
    when v_k.answer ? 'choice' then (p_answer ->> 'choice') = (v_k.answer ->> 'choice')
    else public.norm_output(p_answer ->> 'text') = public.norm_output(v_k.answer ->> 'text')
  end;
  v_correct := coalesce(v_correct, false);

  insert into public.lesson_step_results (attempt_id, step_id, correct, tries) values (v_a.id, v_s.id, v_correct, 1)
  on conflict (attempt_id, step_id) do update set correct = public.lesson_step_results.correct or excluded.correct, tries = public.lesson_step_results.tries + 1
  returning tries into v_tries;
  update public.lesson_attempts set last_answer_at = now() where id = v_a.id;

  -- The accepted answer is shown once the learner gets it, or after a second wrong try.
  return jsonb_build_object('correct', v_correct, 'explanation', v_k.explanation,
    'accepted', case when v_correct or v_tries >= 2 then coalesce(v_k.answer -> 'choice', v_k.answer -> 'text', v_k.answer -> 'accept' -> 0, v_k.answer -> 'orders' -> 0, v_k.answer -> 'pairs') end);
end $$;

create or replace function public.complete_lesson(p_attempt uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.lesson_attempts;
  v_first boolean;
  v_old int;
  v_level int;
  v_xp bigint;
  v_gold bigint;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  v_a := public.own_attempt(p_attempt);
  perform 1 from public.lesson_attempts where id = v_a.id for update;
  if v_a.status <> 'active' then raise exception 'This lesson has ended' using errcode = 'P0001'; end if;
  if exists (
    select 1 from public.lesson_steps s
    where s.lesson_id = v_a.lesson_id and s.kind in ('predict', 'fix', 'pick', 'match', 'build', 'gap', 'type')
      and not exists (select 1 from public.lesson_step_results r where r.attempt_id = v_a.id and r.step_id = s.id and r.correct)
  ) then
    raise exception 'Answer every question first' using errcode = 'P0001';
  end if;

  insert into public.lesson_rewards (user_id, lesson_id, xp, gold) values (v_uid, v_a.lesson_id, 25, 10) on conflict do nothing;
  v_first := found;
  select level into v_old from public.player_xp where user_id = v_uid;
  if v_first then
    update public.player_xp set xp = xp + 25, level = public.level_for_xp(xp + 25) where user_id = v_uid;
    update public.player_wallets set gold = gold + 10 where user_id = v_uid;
  end if;
  update public.lesson_attempts set status = 'completed' where id = v_a.id;

  select xp, level into v_xp, v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;
  return jsonb_build_object('first_time', v_first, 'xp', case when v_first then 25 else 0 end, 'gold', case when v_first then 10 else 0 end,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold), 'leveled_up', coalesce(v_level > v_old, false));
end $$;

revoke execute on function public.norm_answer(text), public.pair_set(jsonb) from public, anon;
grant execute on function public.norm_answer(text) to authenticated;
revoke execute on function public.pair_set(jsonb) from authenticated;
