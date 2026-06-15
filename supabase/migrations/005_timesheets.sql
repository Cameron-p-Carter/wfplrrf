-- Timesheet Management Module

-- Upload batches (one per CSV file)
create table public.timesheet_uploads (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  uploaded_at timestamptz not null default now(),
  row_count integer not null default 0,
  new_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  date_range_start date,
  date_range_end date
);

alter table public.timesheet_uploads enable row level security;
create policy "Allow all on timesheet_uploads" on public.timesheet_uploads for all using (true);

-- Individual timesheet rows (one per CSV line)
create table public.timesheet_entries (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid references public.timesheet_uploads(id) on delete set null,
  employee_name text not null,
  entry_date date not null,
  start_time text,
  end_time text,
  breaks text,
  units numeric(5,2) not null,
  cost_centre text not null,
  notes text,
  status text not null default 'Pending',
  approved_by text,
  approved_on timestamptz,
  manager text,
  created_at timestamptz not null default now(),
  constraint uq_timesheet_entry unique (employee_name, entry_date, cost_centre)
);

alter table public.timesheet_entries enable row level security;
create policy "Allow all on timesheet_entries" on public.timesheet_entries for all using (true);

create index idx_timesheet_entries_date on public.timesheet_entries (entry_date);
create index idx_timesheet_entries_employee on public.timesheet_entries (employee_name);

-- Australian public holidays reference table
create table public.au_public_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  holiday_name text not null,
  state text not null default 'national'
);

alter table public.au_public_holidays enable row level security;
create policy "Allow all on au_public_holidays" on public.au_public_holidays for all using (true);

-- Action log: Slack messages / phone calls per employee per week
create table public.timesheet_actions (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  week_start date not null,
  action_type text not null check (action_type in ('slack', 'call', 'email')),
  action_date date not null default current_date,
  action_by text,
  outcome text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.timesheet_actions enable row level security;
create policy "Allow all on timesheet_actions" on public.timesheet_actions for all using (true);

create index idx_timesheet_actions_week on public.timesheet_actions (week_start);

-- Manager exception approvals (sign off on a non-compliant week)
create table public.timesheet_approvals (
  id uuid primary key default gen_random_uuid(),
  employee_name text not null,
  week_start date not null,
  violation_types text[] not null default '{}',
  approved_by text not null,
  approval_reason text,
  created_at timestamptz not null default now(),
  constraint uq_timesheet_approval unique (employee_name, week_start)
);

alter table public.timesheet_approvals enable row level security;
create policy "Allow all on timesheet_approvals" on public.timesheet_approvals for all using (true);

-- Seed Australian public holidays 2025–2027 (national + VIC)
insert into public.au_public_holidays (holiday_date, holiday_name, state) values
  -- 2025
  ('2025-01-01', 'New Year''s Day', 'national'),
  ('2025-01-27', 'Australia Day (substitute)', 'national'),
  ('2025-04-18', 'Good Friday', 'national'),
  ('2025-04-19', 'Easter Saturday', 'VIC'),
  ('2025-04-20', 'Easter Sunday', 'national'),
  ('2025-04-21', 'Easter Monday', 'national'),
  ('2025-04-25', 'Anzac Day', 'national'),
  ('2025-06-09', 'King''s Birthday', 'VIC'),
  ('2025-11-04', 'Melbourne Cup', 'VIC'),
  ('2025-12-25', 'Christmas Day', 'national'),
  ('2025-12-26', 'Boxing Day', 'national'),
  -- 2026
  ('2026-01-01', 'New Year''s Day', 'national'),
  ('2026-01-26', 'Australia Day', 'national'),
  ('2026-04-03', 'Good Friday', 'national'),
  ('2026-04-04', 'Easter Saturday', 'VIC'),
  ('2026-04-05', 'Easter Sunday', 'national'),
  ('2026-04-06', 'Easter Monday', 'national'),
  ('2026-04-25', 'Anzac Day', 'national'),
  ('2026-06-08', 'King''s Birthday', 'VIC'),
  ('2026-11-03', 'Melbourne Cup', 'VIC'),
  ('2026-12-25', 'Christmas Day', 'national'),
  ('2026-12-28', 'Boxing Day (substitute)', 'national'),
  -- 2027
  ('2027-01-01', 'New Year''s Day', 'national'),
  ('2027-01-26', 'Australia Day', 'national'),
  ('2027-04-02', 'Good Friday', 'national'),
  ('2027-04-03', 'Easter Saturday', 'VIC'),
  ('2027-04-04', 'Easter Sunday', 'national'),
  ('2027-04-05', 'Easter Monday', 'national'),
  ('2027-04-26', 'Anzac Day (substitute)', 'national'),
  ('2027-06-14', 'King''s Birthday', 'VIC'),
  ('2027-11-02', 'Melbourne Cup', 'VIC'),
  ('2027-12-27', 'Christmas Day (substitute)', 'national'),
  ('2027-12-28', 'Boxing Day (substitute)', 'national');
