-- Core Mathematics is also an upper-secondary subject (e.g. SPM Matematik), not only Additional/Advanced.
-- Reference-data fixes ship as migrations: the CLI does not re-run an already-applied seed.
update public.subjects
set level_ids = array['primary', 'lower_secondary', 'upper_secondary', 'pre_university', 'diploma', 'undergraduate', 'postgraduate', 'doctoral', 'vocational', 'lifelong']
where id = 'mathematics';
