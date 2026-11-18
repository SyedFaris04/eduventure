-- Teach your pet (the pet guesses some battle questions; a right answer over a wrong guess teaches it) and pet
-- adventures (every third new lesson the pet explores an island for 6 hours and brings back a fun fact).

create table public.pet_facts (
  id text primary key,
  en text not null,
  ms text not null
);
-- From content/pet-facts.json (needs a reviewer, like the questions).
insert into public.pet_facts (id, en, ms) values
  ('kinabalu', 'Mount Kinabalu in Sabah is Malaysia''s highest mountain, about 4,095 metres tall.', 'Gunung Kinabalu di Sabah ialah gunung tertinggi di Malaysia, kira-kira 4,095 meter tinggi.'),
  ('rafflesia', 'The Rafflesia, found in Malaysia''s rainforests, has the biggest single flower in the world: up to about 1 metre across.', 'Rafflesia yang tumbuh di hutan hujan Malaysia mempunyai bunga tunggal terbesar di dunia, selebar kira-kira 1 meter.'),
  ('states', 'Malaysia has 13 states and 3 federal territories.', 'Malaysia mempunyai 13 negeri dan 3 wilayah persekutuan.'),
  ('bunga_raya', 'The bunga raya (hibiscus) is Malaysia''s national flower.', 'Bunga raya ialah bunga kebangsaan Malaysia.'),
  ('tiger', 'The Malayan tiger is Malaysia''s national animal.', 'Harimau Malaya ialah haiwan kebangsaan Malaysia.'),
  ('merdeka', 'Malaysia became independent on 31 August 1957. We celebrate it as Hari Merdeka.', 'Malaysia mencapai kemerdekaan pada 31 Ogos 1957. Kita menyambutnya sebagai Hari Merdeka.'),
  ('hari_malaysia', 'Malaysia was formed on 16 September 1963, the day we call Hari Malaysia.', 'Malaysia dibentuk pada 16 September 1963, hari yang kita panggil Hari Malaysia.'),
  ('twin_towers', 'The Petronas Twin Towers in Kuala Lumpur are 452 metres tall. They were the world''s tallest buildings from 1998 to 2004.', 'Menara Berkembar Petronas di Kuala Lumpur setinggi 452 meter. Ia bangunan tertinggi di dunia dari 1998 hingga 2004.'),
  ('kancil', 'The kancil (mouse-deer) is one of the smallest hoofed animals in the world.', 'Kancil ialah antara haiwan berkuku yang paling kecil di dunia.'),
  ('hornbill', 'The rhinoceros hornbill is Sarawak''s state bird. Sarawak is called the Land of the Hornbills.', 'Burung kenyalang ialah burung negeri Sarawak. Sarawak digelar Bumi Kenyalang.'),
  ('taman_negara', 'The rainforest of Taman Negara is often said to be about 130 million years old, one of the oldest in the world.', 'Hutan hujan Taman Negara sering dikatakan berusia kira-kira 130 juta tahun, antara yang tertua di dunia.'),
  ('rajang', 'The Rajang River in Sarawak is the longest river in Malaysia.', 'Sungai Rajang di Sarawak ialah sungai terpanjang di Malaysia.'),
  ('mulu', 'The Sarawak Chamber in Gunung Mulu National Park is one of the largest known cave chambers in the world.', 'Sarawak Chamber di Taman Negara Gunung Mulu ialah antara ruang gua terbesar yang diketahui di dunia.'),
  ('orangutan', 'Wild orangutans live only on the islands of Borneo and Sumatra, including Sabah and Sarawak.', 'Orang utan liar hanya hidup di Pulau Borneo dan Sumatera, termasuk Sabah dan Sarawak.'),
  ('penang_bridge', 'The Penang Bridge, opened in 1985, links Penang Island to the mainland.', 'Jambatan Pulau Pinang yang dibuka pada tahun 1985 menghubungkan Pulau Pinang dengan tanah besar.'),
  ('equator', 'Malaysia lies close to the equator, so it is warm all year round.', 'Malaysia terletak berhampiran garisan khatulistiwa, jadi cuacanya panas sepanjang tahun.'),
  ('wau', 'The wau bulan is a traditional moon-shaped kite from Kelantan.', 'Wau bulan ialah layang-layang tradisional berbentuk bulan dari Kelantan.'),
  ('congkak', 'Congkak is a traditional board game where players move seeds or shells from hole to hole.', 'Congkak ialah permainan papan tradisional di mana pemain memindahkan biji atau cengkerang dari lubang ke lubang.'),
  ('batik', 'Batik is a way of decorating cloth with wax and dye. Malaysian batik often shows flowers and leaves.', 'Batik ialah cara menghias kain dengan lilin dan pewarna. Batik Malaysia selalunya bercorak bunga dan daun.'),
  ('proboscis', 'The proboscis monkey, with its big nose, lives only on the island of Borneo.', 'Monyet belanda yang berhidung besar hanya hidup di Pulau Borneo.')
on conflict (id) do update set en = excluded.en, ms = excluded.ms;
revoke all on public.pet_facts from anon, authenticated;
grant select on public.pet_facts to authenticated;
alter table public.pet_facts enable row level security;
create policy "facts are public" on public.pet_facts for select to authenticated using (true);

create table public.pet_adventures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  returns_at timestamptz not null,
  island text not null,
  fact_id text not null references public.pet_facts (id),
  claimed_at timestamptz
);
create index pet_adventures_user on public.pet_adventures (user_id, started_at desc);
revoke all on public.pet_adventures from anon, authenticated;
alter table public.pet_adventures enable row level security;

alter table public.encounters add column pet_guess text;

------------------------------------------------------------------------------------------
-- Pure rules
------------------------------------------------------------------------------------------
-- About one choice question in five gets a guess, uniformly at random (so it tells the player nothing).
create or replace function public.pet_guess_pick(p_type text, p_options jsonb, p_roll double precision, p_pick double precision) returns text
language sql immutable set search_path = '' as $$
  select case
    when p_roll >= 0.2 then null
    when p_type = 'true_false' then case when p_pick < 0.5 then 'false' else 'true' end
    when p_type = 'mcq' and jsonb_typeof(p_options) = 'array' and jsonb_array_length(p_options) > 0
      then p_options -> least(floor(p_pick * jsonb_array_length(p_options))::int, jsonb_array_length(p_options) - 1) ->> 'id'
  end
$$;

create or replace function public.pet_taught(p_guess text, p_answer text, p_correct boolean) returns text
language sql immutable set search_path = '' as $$
  select case when p_guess is null or not coalesce(p_correct, false) then null when p_guess = p_answer then 'both' else 'taught' end
$$;

create or replace function public.adventure_status(p_returns_at timestamptz, p_claimed_at timestamptz, p_now timestamptz) returns text
language sql immutable set search_path = '' as $$
  select case when p_claimed_at is not null then 'none' when p_now < p_returns_at then 'away' else 'back' end
$$;

create or replace function public.pet_guess_for(p_user uuid, p_question text) returns text
language sql volatile security definer set search_path = '' as $$
  select case when exists (select 1 from public.player_pets where user_id = p_user)
    then (select public.pet_guess_pick(type, options, random(), random()) from public.questions where id = p_question) end
$$;

create or replace function public.pet_award(p_user uuid, p_branch text, p_kind text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pet public.player_pets;
  v_today date := public.local_today(p_user);
  v_n int := case p_kind when 'answer' then 1 when 'teach' then 2 when 'lesson' then 5 when 'day' then 3 when 'souvenir' then 10 end;
begin
  if v_n is null then raise exception 'Unknown award' using errcode = '22023'; end if;
  select * into v_pet from public.player_pets where user_id = p_user for update;
  if not found then return; end if;
  -- Answers and teaching share the 30-points-a-day cap.
  if p_kind in ('answer', 'teach') then
    if v_pet.answer_day is distinct from v_today then
      v_pet.answer_day := v_today;
      v_pet.answer_points := 0;
    end if;
    v_n := least(v_n, 30 - v_pet.answer_points);
    if v_n <= 0 then return; end if;
    v_pet.answer_points := v_pet.answer_points + v_n;
  end if;
  if p_branch in ('science', 'maths', 'technology', 'language') then
    v_pet.branches := jsonb_set(v_pet.branches, array[p_branch], to_jsonb(coalesce((v_pet.branches ->> p_branch)::int, 0) + v_n));
  end if;
  update public.player_pets set points = points + v_n, branches = v_pet.branches,
    answer_day = v_pet.answer_day, answer_points = v_pet.answer_points
  where user_id = p_user;
end $$;

------------------------------------------------------------------------------------------
-- Adventures
------------------------------------------------------------------------------------------
-- Every third first-time lesson since the egg hatched (or since the last adventure) sends the pet exploring.
create or replace function public.maybe_start_adventure(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_pet public.player_pets;
  v_since timestamptz;
begin
  select * into v_pet from public.player_pets where user_id = p_user;
  if not found then return; end if;
  if exists (select 1 from public.pet_adventures where user_id = p_user and claimed_at is null) then return; end if;
  v_since := greatest(v_pet.hatched_at, coalesce((select max(started_at) from public.pet_adventures where user_id = p_user), v_pet.hatched_at));
  if (select count(*) from public.lesson_rewards where user_id = p_user and created_at > v_since) < 3 then return; end if;
  insert into public.pet_adventures (user_id, returns_at, island, fact_id)
  values (p_user, now() + interval '6 hours',
    (array['greenhaven', 'science_island', 'mathematics_mountains', 'technology_city', 'language_kingdom'])[1 + floor(random() * 5)::int],
    coalesce((select id from public.pet_facts f where not exists (select 1 from public.pet_adventures a where a.user_id = p_user and a.fact_id = f.id) order by random() limit 1),
             (select id from public.pet_facts order by random() limit 1)));
end $$;

create or replace function public.my_adventure() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_a public.pet_adventures;
  v_status text;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_a from public.pet_adventures where user_id = auth.uid() and claimed_at is null order by started_at desc limit 1;
  if not found then return jsonb_build_object('status', 'none'); end if;
  v_status := public.adventure_status(v_a.returns_at, v_a.claimed_at, now());
  return jsonb_build_object('status', v_status, 'island', v_a.island, 'returns_at', v_a.returns_at);
end $$;

create or replace function public.claim_souvenir() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_a public.pet_adventures;
  v_f public.pet_facts;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_a from public.pet_adventures where user_id = v_uid and claimed_at is null order by started_at desc limit 1 for update;
  if not found or public.adventure_status(v_a.returns_at, v_a.claimed_at, now()) <> 'back' then
    raise exception 'Your pet is not back yet' using errcode = 'P0001';
  end if;
  update public.pet_adventures set claimed_at = now() where id = v_a.id;
  perform public.pet_award(v_uid, null, 'souvenir');
  select * into v_f from public.pet_facts where id = v_a.fact_id;
  return jsonb_build_object('id', v_f.id, 'en', v_f.en, 'ms', v_f.ms, 'island', v_a.island, 'points', 10);
end $$;

create or replace function public.my_souvenirs() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', f.id, 'en', f.en, 'ms', f.ms, 'island', a.island, 'claimed_at', a.claimed_at) order by a.claimed_at desc), '[]'::jsonb)
  from public.pet_adventures a join public.pet_facts f on f.id = a.fact_id
  where a.user_id = auth.uid() and a.claimed_at is not null
$$;

------------------------------------------------------------------------------------------
-- Battles and lessons (latest versions from 20261117120000_returning_monsters.sql and 20261117110000_knowledge_pet.sql)
------------------------------------------------------------------------------------------
create or replace function public.encounter_state(e public.encounters) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'encounter_id', e.id, 'monster_id', e.monster_id, 'monster_hp', e.monster_hp,
    'monster_max_hp', (select max_hp from public.monsters where id = e.monster_id),
    'player_hp', e.player_hp, 'combo', e.combo, 'status', e.status, 'returning', e.is_returning, 'pet_guess', e.pet_guess,
    'helpers', public.helpers_state(e.user_id, e.second_chance_used, e.fifty_used, e.hidden_options),
    'question', case when e.status = 'active' then public.question_payload(e.current_question_id) end)
$$;

create or replace function public.start_encounter(p_monster text, p_returning boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_hp int;
  v_question text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  if found then return public.encounter_state(v_enc); end if;

  select max_hp into v_hp from public.monsters where id = p_monster;
  if v_hp is null then raise exception 'Unknown monster' using errcode = '22023'; end if;
  if coalesce(p_returning, false) and not exists (
    select 1 from public.due_topics(v_uid) d join public.monsters m on m.island_id = d.island_id where m.id = p_monster
  ) then
    raise exception 'Nothing is due on this island' using errcode = 'P0001';
  end if;

  begin
    v_question := public.pick_question(v_uid, p_monster, coalesce(p_returning, false));
    insert into public.encounters (user_id, monster_id, monster_hp, current_question_id, question_served_at, is_returning, pet_guess)
    values (v_uid, p_monster, v_hp, v_question, now(), coalesce(p_returning, false), public.pet_guess_for(v_uid, v_question))
    returning * into v_enc;
  exception when unique_violation then
    select * into v_enc from public.encounters where user_id = v_uid and status = 'active';
  end;
  return public.encounter_state(v_enc);
end $$;

create or replace function public.answer_question(p_encounter uuid, p_answer jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_enc public.encounters;
  v_q public.questions;
  v_key public.question_keys;
  v_mon public.monsters;
  v_correct boolean;
  v_farmed boolean;
  v_damage int := 0;
  v_xp int := 0;
  v_gold int := 0;
  v_bonus_xp int := 0;
  v_bonus_gold int := 0;
  v_reason text;
  v_old_level int;
  v_new_level int;
  v_total_xp bigint;
  v_total_gold bigint;
  v_missions text[];
  v_second boolean := false;
  v_comeback jsonb := null;
  v_pet text;
begin
  if v_uid is null then raise exception 'Not signed in' using errcode = '42501'; end if;

  select * into v_enc from public.encounters where id = p_encounter and user_id = v_uid for update;
  if not found then raise exception 'Encounter not found' using errcode = 'P0002'; end if;
  if v_enc.status <> 'active' then raise exception 'This battle has already ended' using errcode = 'P0001'; end if;
  if now() - v_enc.question_served_at < interval '1.5 seconds' then
    raise exception 'Too fast: take a moment to read the question' using errcode = 'P0001';
  end if;

  select * into v_q from public.questions where id = v_enc.current_question_id;
  select * into v_key from public.question_keys where question_id = v_q.id;
  select * into v_mon from public.monsters where id = v_enc.monster_id;

  v_correct := public.is_correct(v_q.type, v_key.answer, coalesce(p_answer, '{}'::jsonb));
  -- The pet guessed this one: a right answer over a wrong guess teaches the pet.
  v_pet := public.pet_taught(v_enc.pet_guess, v_key.answer #>> '{}', v_correct);
  if v_pet = 'taught' then perform public.pet_award(v_uid, public.subject_branch(v_q.subject_id), 'teach'); end if;
  v_second := not v_correct and not v_enc.second_chance_used
    and public.unlocked(public.player_level(v_uid), 'helper', 'second_chance');
  v_farmed := exists (
    select 1 from public.question_attempts
    where user_id = v_uid and question_id = v_q.id and correct and created_at > now() - interval '24 hours');

  if v_correct then
    v_enc.combo := v_enc.combo + 1;
    v_damage := round((12 + 4 * v_q.difficulty) * (1 + least(v_enc.combo - 1, 5) * 0.1));
    v_enc.monster_hp := greatest(0, v_enc.monster_hp - v_damage);
    if not v_farmed then
      v_xp := 5 * v_q.difficulty;
      v_gold := 2 * v_q.difficulty;
      -- 50/50 on this question halves its XP.
      if v_enc.fifty_question_id = v_q.id then v_xp := v_xp / 2; end if;
    end if;
  else
    v_enc.combo := 0;
    if v_second then
      v_enc.second_chance_used := true; -- Second Chance: this wrong answer costs no HP
    else
      v_enc.player_hp := greatest(0, v_enc.player_hp - 10);
    end if;
    v_reason := case
      when v_q.type in ('mcq', 'true_false') then v_key.wrong ->> (p_answer ->> 'choice')
      when v_q.type = 'numeric' then (
        select m ->> 'why' from jsonb_array_elements(coalesce(v_key.mistakes, '[]'::jsonb)) m
        where coalesce(p_answer ->> 'value', '') ~ '^\s*-?\d+(\.\d+)?\s*$'
          and abs((m ->> 'value')::numeric - (p_answer ->> 'value')::numeric) <= greatest((v_key.answer ->> 'tolerance')::numeric, 0.0001)
        limit 1)
    end;
  end if;

  insert into public.question_attempts (user_id, encounter_id, question_id, answer, correct, xp_awarded, gold_awarded)
  values (v_uid, v_enc.id, v_q.id, p_answer, v_correct, v_xp, v_gold);

  if v_enc.monster_hp = 0 then
    v_enc.status := 'won';
    v_bonus_xp := v_mon.xp_reward;
    v_bonus_gold := v_mon.gold_reward;
    if v_enc.is_returning then
      -- Comeback bonus for beating a Returning monster.
      v_bonus_xp := v_bonus_xp + 20;
      v_bonus_gold := v_bonus_gold + 10;
      v_comeback := jsonb_build_object('xp', 20, 'gold', 10);
    end if;
  elsif v_enc.player_hp = 0 then
    v_enc.status := 'lost';
  end if;

  v_missions := public.after_answer(v_uid, v_q.subject_id, v_q.topic, v_correct, v_enc.status = 'won');
  if v_comeback is not null then v_missions := v_missions || public.bump_missions(v_uid, 'defeat_returning', null); end if;

  select level into v_old_level from public.player_xp where user_id = v_uid;
  update public.player_xp
    set xp = xp + v_xp + v_bonus_xp, level = public.level_for_xp(xp + v_xp + v_bonus_xp)
    where user_id = v_uid
    returning xp, level into v_total_xp, v_new_level;
  update public.player_wallets set gold = gold + v_gold + v_bonus_gold where user_id = v_uid returning gold into v_total_gold;

  if v_enc.status = 'active' then
    v_enc.current_question_id := public.pick_question(v_uid, v_enc.monster_id);
    v_enc.question_served_at := now();
    v_enc.hidden_options := '{}';
    v_enc.pet_guess := public.pet_guess_for(v_uid, v_enc.current_question_id);
  else
    v_enc.ended_at := now();
  end if;

  update public.encounters set
    monster_hp = v_enc.monster_hp, player_hp = v_enc.player_hp, combo = v_enc.combo, status = v_enc.status,
    current_question_id = v_enc.current_question_id, question_served_at = v_enc.question_served_at,
    xp_earned = xp_earned + v_xp + v_bonus_xp, gold_earned = gold_earned + v_gold + v_bonus_gold, ended_at = v_enc.ended_at,
    second_chance_used = v_enc.second_chance_used, hidden_options = v_enc.hidden_options,
    pet_guess = case when v_enc.status = 'active' then v_enc.pet_guess end
  where id = v_enc.id
  returning * into v_enc;

  return jsonb_build_object(
    'correct', v_correct, 'correct_answer', v_key.answer, 'explanation', v_key.explanation, 'wrong_reason', v_reason,
    'damage', v_damage, 'farmed', v_correct and v_farmed, 'xp_gained', v_xp + v_bonus_xp, 'gold_gained', v_gold + v_bonus_gold,
    'bonus', jsonb_build_object('xp', v_bonus_xp, 'gold', v_bonus_gold),
    'totals', jsonb_build_object('xp', v_total_xp, 'level', v_new_level, 'gold', v_total_gold),
    'leveled_up', v_new_level > v_old_level,
    'second_chance', v_second,
    'returning_bonus', v_comeback,
    'pet', v_pet,
    'missions_completed', to_jsonb(v_missions),
    'state', public.encounter_state(v_enc));
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
    perform public.pet_award(v_uid, (
      select case c.kind when 'code' then 'technology' else 'language' end
      from public.lessons l join public.courses c on c.id = l.course_id where l.id = v_a.lesson_id), 'lesson');
    perform public.maybe_start_adventure(v_uid);
  end if;
  insert into public.learning_days (user_id, day) values (v_uid, public.local_today(v_uid)) on conflict do nothing;
  if found then perform public.pet_award(v_uid, null, 'day'); end if;
  update public.lesson_attempts set status = 'completed' where id = v_a.id;

  select xp, level into v_xp, v_level from public.player_xp where user_id = v_uid;
  select gold into v_gold from public.player_wallets where user_id = v_uid;
  return jsonb_build_object('first_time', v_first, 'xp', case when v_first then 25 else 0 end, 'gold', case when v_first then 10 else 0 end,
    'totals', jsonb_build_object('xp', v_xp, 'level', v_level, 'gold', v_gold), 'leveled_up', coalesce(v_level > v_old, false));
end $$;

revoke execute on function public.pet_guess_pick(text, jsonb, double precision, double precision), public.pet_taught(text, text, boolean),
  public.adventure_status(timestamptz, timestamptz, timestamptz), public.my_adventure(), public.claim_souvenir(), public.my_souvenirs(),
  public.start_encounter(text, boolean) from public, anon;
grant execute on function public.pet_guess_pick(text, jsonb, double precision, double precision), public.pet_taught(text, text, boolean),
  public.adventure_status(timestamptz, timestamptz, timestamptz), public.my_adventure(), public.claim_souvenir(), public.my_souvenirs(),
  public.start_encounter(text, boolean) to authenticated;
revoke execute on function public.pet_guess_for(uuid, text), public.maybe_start_adventure(uuid) from public, anon, authenticated;
