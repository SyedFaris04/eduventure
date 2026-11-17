-- Language Kingdom: the fifth island, whose monsters ask English and Malay questions, and the Lexicon Dragon.

insert into public.islands (id, subject_ids, sort) values
  ('language_kingdom', array['english', 'malay_language', 'academic_english'], 50);

insert into public.monsters (id, max_hp, xp_reward, gold_reward, island_id) values
  ('wordworm', 100, 40, 16, 'language_kingdom'),
  ('alphabat', 120, 48, 19, 'language_kingdom'),
  ('commaleon', 130, 55, 22, 'language_kingdom');

alter table public.boss_runs drop constraint boss_runs_boss_id_check;
alter table public.boss_runs add constraint boss_runs_boss_id_check check (boss_id in ('guardian', 'raja_rafflesia', 'abacus_titan', 'glitch_golem', 'lexicon_dragon'));

create or replace function public.boss_island(p_boss text) returns text
language sql immutable set search_path = '' as $$
  select case p_boss
    when 'raja_rafflesia' then 'science_island'
    when 'abacus_titan' then 'mathematics_mountains'
    when 'glitch_golem' then 'technology_city'
    when 'lexicon_dragon' then 'language_kingdom'
  end
$$;
