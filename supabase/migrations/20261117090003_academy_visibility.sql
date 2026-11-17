-- Row policies on lessons and steps call lesson_visible(), so signed-in players must be able to execute it.
-- It only answers "is a lesson with this status visible?" and reveals nothing else.
grant execute on function public.lesson_visible(text) to authenticated;
