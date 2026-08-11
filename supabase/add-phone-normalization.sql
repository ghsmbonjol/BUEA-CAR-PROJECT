-- PHONE NORMALIZATION UPDATE
-- Run once in Supabase > SQL Editor for an already-deployed Buea Regional Car Project database.
-- It cleans existing phone values and automatically strips non-digits from future inserts/updates.

update public.members
set phone = nullif(regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'), '')
where phone is not null;

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
