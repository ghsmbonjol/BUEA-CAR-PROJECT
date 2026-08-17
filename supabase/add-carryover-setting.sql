-- ADD CARRYOVER / CONGREGATION CONTRIBUTION SETTING TO AN EXISTING DATABASE
-- Run this once in Supabase > SQL Editor before deploying the updated app.

alter table public.project_settings
  add column if not exists carryover_amount numeric(14,2) not null default 0
  check (carryover_amount >= 0);

alter table public.project_settings
  add column if not exists carryover_label text not null
  default 'Congregation contribution / First vow total';

update public.project_settings
set carryover_label = 'Congregation contribution / First vow total'
where carryover_label is null or btrim(carryover_label) = '';

insert into public.project_settings(id, car_target_amount, carryover_amount, carryover_label)
values (1, 0, 0, 'Congregation contribution / First vow total')
on conflict (id) do nothing;
