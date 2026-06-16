create table public.timesheet_name_mappings (
  timesheet_name  text primary key,
  display_name    text not null,
  created_at      timestamptz default now()
);

alter table public.timesheet_name_mappings enable row level security;

create policy "authenticated full access" on public.timesheet_name_mappings
  for all to authenticated using (true) with check (true);
