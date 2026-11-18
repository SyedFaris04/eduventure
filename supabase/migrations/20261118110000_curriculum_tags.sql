-- Curriculum tags (KSSR/KSSM subject and years, from content files) and a TP level per question from its Bloom level;
-- the parent report gains an estimated TP per topic. Estimates come from EDUVENTURE practice, not the school's PBD.

alter table public.questions add column curriculum jsonb;
alter table public.questions add column tp int generated always as (
  case bloom when 'remember' then 1 when 'understand' then 2 when 'apply' then 3 when 'analyze' then 4
             when 'evaluate' then 5 when 'create' then 6 end) stored;

-- The highest TP level t with at least two right answers at t or above, and at least 60% right there.
create or replace function public.estimate_tp(p_tps int[], p_correct boolean[]) returns int
language sql immutable set search_path = '' as $$
  select max(t) from generate_series(1, 6) t
  where (select count(*) from unnest(p_tps, p_correct) a(tp, ok) where a.tp >= t and a.ok) >= 2
    and (select avg(case when a.ok then 1 else 0 end) from unnest(p_tps, p_correct) a(tp, ok) where a.tp >= t) >= 0.6
$$;

-- A question's tag and TP level (metadata only; never the answer).
create or replace function public.question_curriculum(p_id text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('curriculum', curriculum, 'tp', tp) from public.questions where id = p_id
$$;

-- A child's topics: answers, and the estimated TP once there are at least three answers.
create or replace function public.child_topics(p_child uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('subject', subject_id, 'topic', topic, 'answers', n,
           'tp', case when n >= 3 then public.estimate_tp(tps, oks) end) order by n desc, subject_id, topic), '[]'::jsonb)
  from (
    select q.subject_id, q.topic, count(*) as n, array_agg(q.tp) as tps, array_agg(a.correct) as oks
    from public.question_attempts a join public.questions q on q.id = a.question_id
    where a.user_id = p_child and q.tp is not null
    group by q.subject_id, q.topic
    order by count(*) desc
    limit 12
  ) t
$$;

-- From 20261118090000_parent_consent.sql, plus the topics.
create or replace function public.child_report(p_child uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date;
  v_monday date;
  v_tz text;
  v_since timestamptz;
  v_days date[];
begin
  perform public.own_child(p_child);
  v_today := public.local_today(p_child);
  v_monday := date_trunc('week', v_today)::date;
  v_tz := coalesce((select timezone from public.user_settings where user_id = p_child), 'UTC');
  v_since := v_monday::timestamp at time zone v_tz;
  select coalesce(array_agg(day), '{}') into v_days from public.learning_days where user_id = p_child;
  return jsonb_build_object(
    'week', (select jsonb_agg(jsonb_build_object('day', v_monday + i,
               'minutes', coalesce((select minutes from public.play_minutes where user_id = p_child and day = v_monday + i), 0),
               'played', (v_monday + i) = any (v_days)) order by i) from generate_series(0, 6) i),
    'questions', (select count(*) from public.question_attempts where user_id = p_child and created_at >= v_since),
    'correct', (select count(*) from public.question_attempts where user_id = p_child and created_at >= v_since and correct),
    'lessons', (select count(*) from public.lesson_rewards where user_id = p_child and created_at >= v_since),
    'strong', (select coalesce(jsonb_agg(topic), '[]'::jsonb) from (select topic from public.topic_mastery
               where user_id = p_child and attempts >= 3 and mastery >= 0.75 order by mastery desc, attempts desc limit 3) s),
    'practise', (select coalesce(jsonb_agg(topic), '[]'::jsonb) from (select topic from public.topic_mastery
               where user_id = p_child and attempts >= 2 and mastery < 0.5 order by mastery, attempts desc limit 3) p),
    'streak', (public.streak_from_days(v_days, v_today) ->> 'current')::int,
    'topics', public.child_topics(p_child));
end $$;

revoke execute on function public.estimate_tp(int[], boolean[]), public.question_curriculum(text) from public, anon;
grant execute on function public.estimate_tp(int[], boolean[]), public.question_curriculum(text) to authenticated;
revoke execute on function public.child_topics(uuid) from public, anon, authenticated;
