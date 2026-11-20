-- Run: npx supabase db query --remote --yes -f tests/sql/festival-moved.sql  → expect the error text "RESULT moved=t (rolled back)".
-- Test (always rolled back by the final raise): moving a festival's start keeps players' festival-long progress.
do $$
declare
  v_user uuid;
  v_start date;
  v_ps date;
begin
  select starts_on into v_start from public.festivals where id = 'raya_2027';
  select w.user_id into v_user from public.player_wallets w
  where not exists (select 1 from public.player_missions m where m.user_id = w.user_id and m.template_id = 'f_raya_answers')
  limit 1;
  insert into public.player_missions (user_id, template_id, period_start, target, progress) values (v_user, 'f_raya_answers', v_start, 40, 7);
  update public.festivals set starts_on = v_start - 1 where id = 'raya_2027';
  select period_start into v_ps from public.player_missions where user_id = v_user and template_id = 'f_raya_answers';
  raise exception 'RESULT moved=% (rolled back)', v_ps = v_start - 1;
end $$;
