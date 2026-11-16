-- More question types: multiple-select, ordering, matching, short answer.

alter table public.questions drop constraint questions_type_check;
alter table public.questions add constraint questions_type_check
  check (type in ('mcq', 'true_false', 'numeric', 'fill_blank', 'multi_select', 'ordering', 'matching', 'short_answer'));

-- Normalise free text: lower case, letters/digits/spaces only, single spaces.
create or replace function public.norm_text(p text) returns text
language sql immutable set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(lower(coalesce(p, '')), '[^[:alnum:][:space:]]', '', 'g'), '\s+', ' ', 'g'))
$$;

-- Pure function of (type, key, answer): safe to expose, and malformed answers are just wrong.
create or replace function public.is_correct(p_type text, p_key jsonb, p_answer jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
begin
  case p_type
    when 'mcq', 'true_false' then
      return (p_answer ->> 'choice') = (p_key #>> '{}');
    when 'numeric' then
      if coalesce(p_answer ->> 'value', '') !~ '^\s*-?\d+(\.\d+)?\s*$' then return false; end if;
      return abs((p_answer ->> 'value')::numeric - (p_key ->> 'value')::numeric) <= (p_key ->> 'tolerance')::numeric;
    when 'fill_blank' then
      return lower(btrim(coalesce(p_answer ->> 'text', ''))) in (select lower(a) from jsonb_array_elements_text(p_key -> 'accept') a);
    when 'short_answer' then
      return public.norm_text(p_answer ->> 'text') <> ''
        and public.norm_text(p_answer ->> 'text') in (select public.norm_text(a) from jsonb_array_elements_text(p_key -> 'accept') a);
    when 'multi_select' then
      if jsonb_typeof(p_answer -> 'choices') <> 'array' then return false; end if;
      return jsonb_array_length(p_answer -> 'choices') = jsonb_array_length(p_key)
        and (select array_agg(x order by x) from jsonb_array_elements_text(p_answer -> 'choices') x)
          = (select array_agg(x order by x) from jsonb_array_elements_text(p_key) x);
    when 'ordering' then
      return jsonb_typeof(p_answer -> 'order') = 'array' and (p_answer -> 'order') = p_key;
    when 'matching' then
      return jsonb_typeof(p_answer -> 'pairs') = 'object' and (p_answer -> 'pairs') = p_key;
    else
      return false;
  end case;
end $$;

grant execute on function public.is_correct(text, jsonb, jsonb), public.norm_text(text) to authenticated;
