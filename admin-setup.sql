-- Ruta SV Admin Dashboard Setup
-- Run this in Supabase SQL Editor after you deploy/open v3.

-- 1) Create admin registry table.
create table if not exists admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text default 'admin',
  created_at timestamp with time zone default now()
);

alter table admin_users enable row level security;

-- Let a signed-in user check whether their own account is an admin.
drop policy if exists "Admins can read own admin record" on admin_users;
create policy "Admins can read own admin record"
on admin_users
for select
to authenticated
using (id = auth.uid());

-- 2) Places admin policies.
-- Public read policy should already exist from v2. These add private admin write access.
grant select, insert, update on table places to authenticated;

drop policy if exists "Admins can insert places" on places;
create policy "Admins can insert places"
on places
for insert
to authenticated
with check (exists (select 1 from admin_users where id = auth.uid()));

drop policy if exists "Admins can update places" on places;
create policy "Admins can update places"
on places
for update
to authenticated
using (exists (select 1 from admin_users where id = auth.uid()))
with check (exists (select 1 from admin_users where id = auth.uid()));

-- Allow admins to read all places, including draft/hidden records.
drop policy if exists "Admins can read all places" on places;
create policy "Admins can read all places"
on places
for select
to authenticated
using (exists (select 1 from admin_users where id = auth.uid()));

-- 3) Business submission admin policies.
grant select, update on table business_submissions to authenticated;

drop policy if exists "Admins can read submissions" on business_submissions;
create policy "Admins can read submissions"
on business_submissions
for select
to authenticated
using (exists (select 1 from admin_users where id = auth.uid()));

drop policy if exists "Admins can update submissions" on business_submissions;
create policy "Admins can update submissions"
on business_submissions
for update
to authenticated
using (exists (select 1 from admin_users where id = auth.uid()))
with check (exists (select 1 from admin_users where id = auth.uid()));

-- 4) After you create your admin account from #/admin, run this one line separately.
-- Replace the email with the exact email you used to create the admin login.
-- insert into admin_users (id, email)
-- select id, email from auth.users where email = 'YOUR-EMAIL-HERE';
