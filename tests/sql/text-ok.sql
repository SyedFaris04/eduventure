-- Run: npx supabase db query --remote --yes -f tests/sql/text-ok.sql  → expect wrong = 0 (and nothing listed in "which").
-- Ordinary student sentences must pass the board text filter; rude words, contact details and other scripts must not.
with cases (body, expected) as (values
  ('who reads this?', null), ('a bit challenging', null), ('my therapist says hi', null), ('I scored 100 in 2026!', null),
  ('Hakim and Wan Kamal are here', null), ('Jom belajar sains', null), ('Saya suka matematik', null),
  ('class assessment is hard', null), ('Café crème', null), ('Q: what''s 7 x 8?', null),
  ('Plants make oxygen', null), ('Who wants to study maths?', null), ('The mitochondria is the powerhouse of the cell', null),
  ('I passed my SPM trial!', null), ('Good luck everyone, see you at the camp', null), ('Grape juice and peacocks', null),
  ('Hello from Penang', null), ('Shall we build the lantern?', null), ('Let''s grab wood near the river', null),
  ('Analysis of the bass sound', null), ('Scunthorpe is a town', null), ('Dickens wrote books', null),
  ('Cikgu kata esok ada kuiz', null), ('Terima kasih semua!', null), ('Selamat Hari Raya', null),
  ('Pass the assignment by Friday', null), ('Water boils at 100 degrees', null), ('pi is about 3.14159', null),
  ('My favourite subject is history', null), ('Photosynthesis needs sunlight', null), ('I like Shakespeare', null),
  ('Nazim and Fukuda study together', null), ('Bahasa Melayu is fun (really)', null), ('Year 2025 was great', null),
  ('Can someone help me with algebra?', null), ('I am cocky about chess', null), ('Assume x = 5', null),
  ('Mathematics: 12 + 30 = 42', null), ('Read chapter 7, pages 21-35', null), ('Sejarah tingkatan 4', null),
  ('Hancock passed', null), ('Hi; how are you?', null), ('El niño está aquí', null), ('Señor Gómez', null),
  ('f.u.c.k', 'word'), ('you are sh1t', 'word'), ('f u c k off', 'word'), ('bodoh lah', 'word'),
  ('012 345 6789', 'phone'), ('0123456789', 'phone'), ('call 012-345 6789', 'phone'), ('(03) 1234 5678', 'phone'),
  ('mail me a@b.co', 'email'), ('go to www.site.com', 'link'), ('site.my', 'link'), ('http://x', 'link'),
  ('see games.gg', 'link'), ('@cool_kid', 'handle'), ('follow @abc', 'handle'),
  -- Review fixes: letters the filter can't fold, punctuation inside a word, spaced-out contact details, phone keyboards.
  ('you are shıt', 'script'), ('fūck off', 'script'), ('fu.ck', 'word'), ('fu-ck you', 'word'), ('fu2ck', 'word'),
  ('ali@gmail .com', 'email'), ('follow @ cool_kid', 'handle'), ('see youtu.be', 'link'), ('site .co', 'link'),
  ('012/345/6789', 'phone'), ('012,345,6789', 'phone'), ('012_345_6789', 'phone'),
  ('ali at gmail dot com', 'contact'), ('add me on instagram', 'contact'), ('whatsapp me', 'contact'),
  ('fire retardant', null), ('you are retarded', 'word'),
  -- The owner decides these (school topics that hit the word list); refused until then.
  ('Nazi Germany invaded Poland', 'word'), ('Anjing saya comel', 'word'), ('babi hutan', 'word'),
  ('Hmm… ok', null), ('great — thanks', null), ('pages 21–35', null), ('Great job. My turn', null), ('École is fun', null),
  ('你好', 'script'), ('１２３４５６７', 'script'), ('привет', 'script'), ('مرحبا', 'script'), ('hi 😀', 'script')
)
select count(*) filter (where public.text_ok(body) is distinct from expected) as wrong,
       string_agg(case when public.text_ok(body) is distinct from expected then body || ' → ' || coalesce(public.text_ok(body), 'ok') end, ' | ') as which
from cases;
