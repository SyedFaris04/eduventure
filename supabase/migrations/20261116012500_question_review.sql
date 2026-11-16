-- Question review workflow: draft -> in_review -> approved -> published (plus rejected).
-- Only educators and admins review; only admins publish. Every action is recorded.

create or replace function public.has_role(p_roles text[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_roles where user_id = auth.uid() and role = any (p_roles))
$$;

-- Lets the app decide whether to show the admin area; it only ever reveals your own roles.
create or replace function public.my_roles() returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(role order by role), '{}') from public.admin_roles where user_id = auth.uid()
$$;

create table public.question_reviews (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id) on delete cascade,
  reviewer_id uuid references auth.users (id) on delete set null,
  action text not null check (action in ('submit', 'approve', 'reject', 'request_changes', 'publish', 'unpublish')),
  from_status text not null,
  to_status text not null,
  version int not null,
  note text check (char_length(note) <= 2000),
  created_at timestamptz not null default now()
);
create index question_reviews_question_idx on public.question_reviews (question_id, created_at desc);

-- Allowed transitions. Publishing and unpublishing are admin-only.
create or replace function public.review_question(p_id text, p_action text, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_q public.questions;
  v_to text;
begin
  if not public.has_role(array['admin', 'educator']) then
    raise exception 'Not allowed: only educators and admins can review questions' using errcode = '42501';
  end if;
  if p_action in ('publish', 'unpublish') and not public.has_role(array['admin']) then
    raise exception 'Not allowed: only admins can publish' using errcode = '42501';
  end if;

  select * into v_q from public.questions where id = p_id for update;
  if not found then raise exception 'Question % not found', p_id using errcode = 'P0002'; end if;

  v_to := case
    when p_action = 'submit' and v_q.status = 'draft' then 'in_review'
    when p_action = 'approve' and v_q.status = 'in_review' then 'approved'
    when p_action = 'reject' and v_q.status in ('draft', 'in_review', 'approved') then 'rejected'
    when p_action = 'request_changes' and v_q.status in ('in_review', 'approved', 'rejected') then 'draft'
    when p_action = 'publish' and v_q.status = 'approved' then 'published'
    when p_action = 'unpublish' and v_q.status = 'published' then 'approved'
  end;
  if v_to is null then
    raise exception 'Cannot % a question that is %', replace(p_action, '_', ' '), replace(v_q.status, '_', ' ') using errcode = 'P0001';
  end if;

  update public.questions set status = v_to where id = p_id;
  insert into public.question_reviews (question_id, reviewer_id, action, from_status, to_status, version, note)
  values (p_id, auth.uid(), p_action, v_q.status, v_to, v_q.version, nullif(btrim(p_note), ''));
  insert into public.audit_logs (actor_id, action, target, data)
  values (auth.uid(), 'question.' || p_action, p_id, jsonb_build_object('from', v_q.status, 'to', v_to));
  return jsonb_build_object('id', p_id, 'status', v_to);
end $$;

-- Batch approvals: does what it can and reports what it skipped and why.
create or replace function public.bulk_review(p_ids text[], p_action text, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_id text;
  v_done int := 0;
  v_skipped jsonb := '[]'::jsonb;
begin
  if not public.has_role(array['admin', 'educator']) then
    raise exception 'Not allowed: only educators and admins can review questions' using errcode = '42501';
  end if;
  if cardinality(p_ids) > 200 then raise exception 'At most 200 questions per batch' using errcode = '22023'; end if;
  foreach v_id in array p_ids loop
    begin
      perform public.review_question(v_id, p_action, p_note);
      v_done := v_done + 1;
    exception when others then
      v_skipped := v_skipped || jsonb_build_object('id', v_id, 'reason', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('done', v_done, 'skipped', v_skipped);
end $$;

-- Aggregated only: reviewers see how a question performs, never who answered it.
create or replace function public.question_stats() returns table (question_id text, attempts bigint, correct bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.has_role(array['admin', 'educator']) then
    raise exception 'Not allowed: only educators and admins can see statistics' using errcode = '42501';
  end if;
  return query select a.question_id, count(*), count(*) filter (where a.correct) from public.question_attempts a group by a.question_id;
end $$;

-- Reviewers can read the bank, keys and history; players still see nothing (RLS returns no rows).
grant select on public.questions, public.question_keys, public.question_reviews to authenticated;
alter table public.question_reviews enable row level security;
create policy "reviewers read" on public.questions for select to authenticated using (public.has_role(array['admin', 'educator']));
create policy "reviewers read" on public.question_keys for select to authenticated using (public.has_role(array['admin', 'educator']));
create policy "reviewers read" on public.question_reviews for select to authenticated using (public.has_role(array['admin', 'educator']));

-- has_role is used inside RLS policies, so signed-in users must be able to execute it (it only checks their own roles).
revoke execute on function public.has_role(text[]) from public, anon;
grant execute on function public.has_role(text[]) to authenticated;
revoke execute on function public.review_question(text, text, text), public.bulk_review(text[], text, text), public.question_stats(), public.my_roles() from public, anon;
grant execute on function public.review_question(text, text, text), public.bulk_review(text[], text, text), public.question_stats(), public.my_roles() to authenticated;
