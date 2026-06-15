create table public.timesheet_employee_settings (
  employee_name  text primary key,
  is_part_time   boolean not null default false,
  updated_at     timestamptz default now()
);

alter table public.timesheet_employee_settings enable row level security;

create policy "authenticated full access" on public.timesheet_employee_settings
  for all to authenticated using (true) with check (true);
