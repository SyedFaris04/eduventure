-- The Code Academy gains Data Structures, AI and Machine Learning (in Python, run in the browser) and C++ (decision
-- #57). Phones can't run C++, so its lessons only read, predict and fix; every one is marked here on the server.
alter table public.courses drop constraint courses_language_check;
alter table public.courses add constraint courses_language_check
  check (language in ('python', 'javascript', 'cpp', 'english', 'malay', 'arabic', 'japanese', 'korean', 'mandarin'));
