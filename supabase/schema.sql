-- BUEA REGIONAL CAR PROJECT — SUPABASE DATABASE
-- Paste this entire file into Supabase > SQL Editor > New query > Run.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into public.groups(name) values
  ('Molyko Group'),
  ('Buea Town Group'),
  ('Bolifamba Group'),
  ('Muea Group')
on conflict (name) do nothing;

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  group_id uuid not null references public.groups(id),
  is_stakeholder boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Keep every member phone number digits-only, even if an admin pastes spaces, +, dashes or brackets.
create or replace function public.normalize_member_phone()
returns trigger language plpgsql as $$
begin
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), '');
  return new;
end $$;

drop trigger if exists trg_normalize_member_phone on public.members;
create trigger trg_normalize_member_phone
before insert or update of phone on public.members
for each row execute function public.normalize_member_phone();

-- Initial Bolifamba Group directory supplied for the project.
-- Safe to re-run: it only inserts a name when that same name is not already in Bolifamba Group.
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

create table if not exists public.vows (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  vow_sequence integer not null default 1 check (vow_sequence >= 1),
  amount_pledged numeric(14,2) not null check (amount_pledged > 0),
  notes text,
  created_at timestamptz not null default now(),
  unique(member_id, vow_sequence)
);

create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id),
  vow_id uuid not null references public.vows(id),
  amount numeric(14,2) not null check (amount > 0),
  payment_date date not null default current_date,
  method text not null default 'Cash',
  notes text,
  receipt_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  amount numeric(14,2) not null check (amount > 0),
  expense_date date not null default current_date,
  expense_type text not null check (expense_type in ('car_project','other_purpose')),
  purpose text not null,
  approved_by text not null,
  receipt_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);


-- Singleton project settings record. The administrator can update the car fundraising target.
create table if not exists public.project_settings (
  id integer primary key default 1 check (id = 1),
  car_target_amount numeric(14,2) not null default 0 check (car_target_amount >= 0),
  carryover_amount numeric(14,2) not null default 0 check (carryover_amount >= 0),
  carryover_label text not null default 'Congregation contribution / First vow total',
  last_keep_alive_at timestamptz,
  last_keep_alive_status text not null default 'pending' check (last_keep_alive_status in ('pending','online','error')),
  last_keep_alive_note text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

insert into public.project_settings(id, car_target_amount)
values (1, 0)
on conflict (id) do nothing;

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members(id),
  kind text not null default 'reminder',
  draft text not null,
  status text not null default 'draft' check (status in ('draft','sent','failed')),
  sent_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.stakeholder_letters (
  id uuid primary key default gen_random_uuid(),
  stakeholder_name text not null,
  title text,
  purpose text not null,
  details text,
  signatory text,
  draft text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  actor uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

create or replace view public.vow_status
with (security_invoker = true)
as
select
  v.id, v.member_id, v.vow_sequence, v.amount_pledged, v.notes, v.created_at,
  m.full_name as member_name,
  g.name as group_name,
  coalesce(sum(c.amount),0)::numeric(14,2) as amount_paid,
  greatest(v.amount_pledged - coalesce(sum(c.amount),0),0)::numeric(14,2) as balance,
  case when coalesce(sum(c.amount),0) >= v.amount_pledged then 'fulfilled' else 'outstanding' end as status
from public.vows v
join public.members m on m.id=v.member_id
join public.groups g on g.id=m.group_id
left join public.contributions c on c.vow_id=v.id
group by v.id,m.full_name,g.name;

-- Basic integrity: contribution member must match vow member.
create or replace function public.check_contribution_member()
returns trigger language plpgsql as $$
begin
  if not exists(select 1 from public.vows v where v.id=new.vow_id and v.member_id=new.member_id) then
    raise exception 'Contribution member must match vow member';
  end if;
  return new;
end $$;

drop trigger if exists trg_contribution_member on public.contributions;
create trigger trg_contribution_member before insert or update on public.contributions
for each row execute function public.check_contribution_member();

-- Enforce sequential vows: a new vow can only start after the previous one is fulfilled.
create or replace function public.check_vow_sequence()
returns trigger language plpgsql as $$
declare
  expected_sequence integer;
  prev_pledged numeric;
  prev_paid numeric;
begin
  select coalesce(max(vow_sequence),0)+1 into expected_sequence
  from public.vows
  where member_id=new.member_id and (tg_op='INSERT' or id<>new.id);

  if tg_op='INSERT' and new.vow_sequence <> expected_sequence then
    raise exception 'Next vow for this member must be vow %', expected_sequence;
  end if;

  if new.vow_sequence > 1 then
    select v.amount_pledged, coalesce(sum(c.amount),0)
      into prev_pledged, prev_paid
    from public.vows v
    left join public.contributions c on c.vow_id=v.id
    where v.member_id=new.member_id and v.vow_sequence=new.vow_sequence-1
    group by v.id;
    if prev_pledged is null or prev_paid < prev_pledged then
      raise exception 'Previous vow must be fulfilled before starting another vow';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_vow_sequence on public.vows;
create trigger trg_vow_sequence before insert on public.vows
for each row execute function public.check_vow_sequence();

-- Keep a contribution from silently exceeding its vow balance.
create or replace function public.check_contribution_balance()
returns trigger language plpgsql as $$
declare
  pledged numeric;
  already_paid numeric;
begin
  select v.amount_pledged into pledged from public.vows v where v.id=new.vow_id;
  select coalesce(sum(c.amount),0) into already_paid
  from public.contributions c
  where c.vow_id=new.vow_id and (tg_op='INSERT' or c.id<>new.id);
  if already_paid + new.amount > pledged then
    raise exception 'Contribution exceeds the remaining balance on this vow';
  end if;
  return new;
end $$;

drop trigger if exists trg_contribution_balance on public.contributions;
create trigger trg_contribution_balance before insert or update on public.contributions
for each row execute function public.check_contribution_balance();

-- Admin helper used by RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles p where p.user_id=auth.uid() and p.role='admin');
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.vows enable row level security;
alter table public.contributions enable row level security;
alter table public.expenses enable row level security;
alter table public.project_settings enable row level security;
alter table public.ai_messages enable row level security;
alter table public.stakeholder_letters enable row level security;
alter table public.audit_log enable row level security;

-- Admin-only MVP policies. You can later add group-level viewers.
do $$ declare t text; begin
  foreach t in array array['profiles','groups','members','vows','contributions','expenses','project_settings','ai_messages','stakeholder_letters','audit_log'] loop
    execute format('drop policy if exists admin_all on public.%I',t);
    execute format('create policy admin_all on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',t);
  end loop;
end $$;

-- IMPORTANT FIRST ADMIN STEP:
-- 1. Create an admin user in Supabase > Authentication > Users.
-- 2. Copy that user's UUID and run:
-- insert into public.profiles(user_id, full_name, role)
-- values ('PASTE-USER-UUID-HERE', 'Regional Administrator', 'admin');
