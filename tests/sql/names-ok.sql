-- Run: npx supabase db query --remote --yes -f tests/sql/names-ok.sql  → expect wrong = 0 (and no rows listed in "which").
-- Common names must pass the word filter; rude ones (including leetspeak and spacing tricks) must not.
with cases (name, should_pass) as (values
  ('Nazim', true), ('Nazira', true), ('Mohd Nazif', true), ('Nazihah', true),
  ('Hakim Akmal', true), ('Hakim Akif', true), ('Wan Kamal', true), ('Wan Khairul', true),
  ('Yamashita', true), ('Kinoshita', true), ('Fukuda', true), ('Ababil', true), ('Sialang', true),
  ('Scunthorpe', true), ('Penistone', true), ('Dickens', true), ('Peacock', true), ('Grape Juice', true), ('Sunny Day', true),
  ('nazi', false), ('Shit Head', false), ('sh1t', false), ('f u k', false), ('fuk', false), ('Fucker', false),
  ('Kimak', false), ('pukimak', false), ('B4bi', false), ('wank', false), ('dickhead', false), ('Bodoh', false), ('a55h0l3', false)
)
select count(*) filter (where public.name_ok(name) <> should_pass) as wrong,
       string_agg(case when public.name_ok(name) <> should_pass then name end, ', ') as which
from cases;
