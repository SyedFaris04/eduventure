-- The Language Hall gains Arabic, Japanese, Korean and Mandarin (decision #56). Their lessons come in generated
-- migrations after this one.
alter table public.courses drop constraint courses_language_check;
alter table public.courses add constraint courses_language_check
  check (language in ('python', 'javascript', 'english', 'malay', 'arabic', 'japanese', 'korean', 'mandarin'));

-- Answers typed in Japanese, Chinese or Arabic end with their own full stops and question marks (。！？؟): ignore them
-- like ".!?". Mirrors normAnswer in src/features/academy/codeText.ts. Replacing keeps the function's grants.
create or replace function public.norm_answer(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(btrim(translate(lower(coalesce(p, '')), '''"‘’“”', '')), '\s+', ' ', 'g'), '[.!?。！？؟]+$', ''))
$$;
