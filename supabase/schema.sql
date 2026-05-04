create table if not exists public.case_counters (
  scope text primary key,
  next_value bigint not null
);

insert into public.case_counters (scope, next_value)
values ('default', 1)
on conflict (scope) do nothing;

create table if not exists public.app_cases (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create table if not exists public.app_representatives (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

alter table public.app_cases enable row level security;
alter table public.app_representatives enable row level security;

create or replace function public.next_case_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  issued_value bigint;
begin
  update public.case_counters
  set next_value = next_value + 1
  where scope = 'default'
  returning next_value - 1 into issued_value;

  if issued_value is null then
    insert into public.case_counters (scope, next_value)
    values ('default', 2)
    on conflict (scope) do update
    set next_value = public.case_counters.next_value + 1
    returning next_value - 1 into issued_value;
  end if;

  return 'REG-2026-' || lpad(issued_value::text, 5, '0');
end;
$$;

grant execute on function public.next_case_id() to authenticated;
grant select, insert, update, delete on public.app_cases to authenticated;
grant select, insert, update, delete on public.app_representatives to authenticated;
revoke all on public.app_cases from anon;
revoke all on public.app_representatives from anon;

drop policy if exists "authenticated can read cases" on public.app_cases;
create policy "authenticated can read cases"
on public.app_cases
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert cases" on public.app_cases;
create policy "authenticated can insert cases"
on public.app_cases
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update cases" on public.app_cases;
create policy "authenticated can update cases"
on public.app_cases
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete cases" on public.app_cases;
create policy "authenticated can delete cases"
on public.app_cases
for delete
to authenticated
using (true);

drop policy if exists "authenticated can read representatives" on public.app_representatives;
create policy "authenticated can read representatives"
on public.app_representatives
for select
to authenticated
using (true);

drop policy if exists "authenticated can insert representatives" on public.app_representatives;
create policy "authenticated can insert representatives"
on public.app_representatives
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update representatives" on public.app_representatives;
create policy "authenticated can update representatives"
on public.app_representatives
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated can delete representatives" on public.app_representatives;
create policy "authenticated can delete representatives"
on public.app_representatives
for delete
to authenticated
using (true);
