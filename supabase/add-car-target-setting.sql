-- ADD CAR TARGET AMOUNT SETTING TO AN EXISTING BUEA REGIONAL CAR PROJECT DATABASE
-- Run this once in Supabase > SQL Editor if you already deployed the earlier schema.

create table if not exists public.project_settings (
  id integer primary key default 1 check (id = 1),
  car_target_amount numeric(14,2) not null default 0 check (car_target_amount >= 0),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.project_settings(id, car_target_amount)
values (1, 0)
on conflict (id) do nothing;

alter table public.project_settings enable row level security;

drop policy if exists admin_all on public.project_settings;
create policy admin_all on public.project_settings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
