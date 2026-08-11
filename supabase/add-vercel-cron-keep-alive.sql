-- Run this ONCE in Supabase > SQL Editor for an existing deployment.
-- It adds fields used by Admin Settings > System Status.

alter table public.project_settings
  add column if not exists last_keep_alive_at timestamptz,
  add column if not exists last_keep_alive_status text not null default 'pending',
  add column if not exists last_keep_alive_note text;

-- Keep the singleton row available even if an older installation is missing it.
insert into public.project_settings (id, car_target_amount)
values (1, 0)
on conflict (id) do nothing;

update public.project_settings
set last_keep_alive_status = coalesce(nullif(last_keep_alive_status, ''), 'pending')
where id = 1;
