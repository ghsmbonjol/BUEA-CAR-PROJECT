-- Run this in Supabase SQL Editor if you already deployed the original schema.
-- It adds the supplied names to Bolifamba Group without duplicating existing matching names.

insert into public.members(full_name, group_id)
select seeded.full_name, g.id
from public.groups g
cross join (values
  ('Ngale Mathias'),
  ('Ngale Geraldine'),
  ('Sylvia Ambe'),
  ('Celestine Ambe'),
  ('Pa Ivo'),
  ('Sister Alice'),
  ('Nwanbo Gladys'),
  ('Charles Atukenye'),
  ('Nehemah'),
  ('Jeremah')
) as seeded(full_name)
where g.name = 'Bolifamba Group'
  and not exists (
    select 1 from public.members m
    where m.group_id = g.id
      and lower(trim(m.full_name)) = lower(trim(seeded.full_name))
  );
