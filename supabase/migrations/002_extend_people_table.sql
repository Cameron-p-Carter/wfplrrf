-- ============================================================
-- Drop views that depend on people.name before altering table
-- ============================================================

drop view if exists public.people_with_roles;
drop view if exists public.project_allocations_detailed;

-- ============================================================
-- Extend the people table
-- ============================================================

alter table public.people
  -- name split
  add column first_name          text,
  add column last_name           text,
  add column preferred_name      text,
  add column display_name        text,
  -- contact / identity
  add column email               text,
  add column employee_number     text,
  add column external_hr_id      text unique,   -- HR system numeric id (for sync/upsert)
  add column external_hr_uuid    text,          -- HR system uuid
  -- position (raw from HR, role_type_id is the resolved FK)
  add column employee_position   text,
  -- status
  add column employee_status     text,
  add column employee_status_enum text,
  add column worker_type         text,
  -- dates
  add column start_date          date,
  add column system_access_date  date,
  add column terminated          boolean default false,
  add column terminated_date     date,
  -- location
  add column country             text,
  add column work_location_id    text,
  -- manager (resolved in second pass by import script)
  add column manager_id          uuid references public.people(id) on delete set null,
  add column manager_external_id text,  -- raw HR manager_id for resolution
  add column manager_name        text,
  -- misc HR fields (kept for future HR platform integration)
  add column team_ids            text,
  add column is_payroll_connected boolean,
  add column preboarding_access  boolean,
  add column is_peo_employee     boolean,
  add column has_rehire_offboard boolean;

-- Backfill split name columns from existing name column (handles any sample data)
update public.people set
  first_name   = split_part(name, ' ', 1),
  last_name    = case
                   when strpos(name, ' ') > 0
                   then substring(name from strpos(name, ' ') + 1)
                   else ''
                 end,
  display_name = name;

-- Make name-derived columns not null, then drop the old name column
alter table public.people
  alter column first_name   set not null,
  alter column last_name    set not null,
  alter column display_name set not null;

alter table public.people drop column name;

-- ============================================================
-- Recreate views using display_name
-- ============================================================

create view public.people_with_roles as
select
  p.id,
  p.first_name,
  p.last_name,
  p.display_name,
  p.preferred_name,
  p.email,
  p.employee_number,
  p.external_hr_id,
  p.role_type_id,
  rt.name        as role_type_name,
  rt.description as role_type_description,
  p.employee_status,
  p.employee_position,
  p.start_date,
  p.manager_id,
  p.manager_name,
  p.country,
  p.terminated,
  p.created_at,
  p.updated_at
from public.people p
join public.role_types rt on rt.id = p.role_type_id;

create view public.project_allocations_detailed as
select
  pa.id,
  pa.person_id,
  p.display_name      as person_name,
  pa.project_id,
  proj.name           as project_name,
  pa.role_type_id,
  rt.name             as role_type_name,
  pa.requirement_id,
  pa.allocation_percentage,
  pa.start_date,
  pa.end_date,
  pa.created_at,
  pa.updated_at
from public.project_allocations pa
join public.people   p    on p.id    = pa.person_id
join public.projects proj on proj.id = pa.project_id
join public.role_types rt on rt.id   = pa.role_type_id;
