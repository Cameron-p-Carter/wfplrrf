alter table public.timesheet_employee_settings
add column if not exists is_off_work boolean not null default false;
