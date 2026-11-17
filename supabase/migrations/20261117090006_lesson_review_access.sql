-- Reviewers (admins and educators) read every lesson, step and answer key in /admin, whatever its status.
-- Players still see only visible lessons and never the keys.
grant select on public.lesson_step_keys to authenticated;
create policy "reviewers read" on public.lessons for select to authenticated using (public.has_role(array['admin', 'educator']));
create policy "reviewers read" on public.lesson_steps for select to authenticated using (public.has_role(array['admin', 'educator']));
create policy "reviewers read" on public.lesson_step_keys for select to authenticated using (public.has_role(array['admin', 'educator']));
