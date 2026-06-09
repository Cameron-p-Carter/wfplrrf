-- ============================================================
-- Enums
-- ============================================================

create type public.leave_status as enum ('pending', 'approved', 'unapproved');
create type public.auto_generated_type as enum ('leave_coverage', 'partial_gap');

-- ============================================================
-- Tables
-- ============================================================

create table public.role_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  start_date date not null,
  end_date   date not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.people (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  role_type_id uuid not null references public.role_types(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table public.leave_periods (
  id         uuid primary key default gen_random_uuid(),
  person_id  uuid not null references public.people(id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  status     public.leave_status not null default 'pending',
  notes      text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- project_resource_requirements and project_allocations have a circular FK.
-- Create project_resource_requirements first without source_allocation_id FK,
-- then add it after project_allocations is created.

create table public.project_resource_requirements (
  id                  uuid primary key default gen_random_uuid(),
  project_id          uuid not null references public.projects(id) on delete cascade,
  role_type_id        uuid not null references public.role_types(id),
  required_count      integer not null,
  start_date          date not null,
  end_date            date not null,
  auto_generated_type public.auto_generated_type,
  ignored             boolean default false,
  parent_requirement_id uuid references public.project_resource_requirements(id) on delete set null,
  source_allocation_id  uuid, -- FK added below after project_allocations
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create table public.project_allocations (
  id                    uuid primary key default gen_random_uuid(),
  person_id             uuid not null references public.people(id) on delete cascade,
  project_id            uuid not null references public.projects(id) on delete cascade,
  role_type_id          uuid not null references public.role_types(id),
  requirement_id        uuid references public.project_resource_requirements(id) on delete set null,
  allocation_percentage numeric not null,
  start_date            date not null,
  end_date              date not null,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Add circular FK now that project_allocations exists
alter table public.project_resource_requirements
  add constraint fk_source_allocation
  foreign key (source_allocation_id)
  references public.project_allocations(id)
  on delete set null;

-- users table mirrors auth.users
create table public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- roles and user_roles for RBAC (used by auth helpers)
create table public.roles (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.user_roles (
  id      uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  unique(user_id, role_id)
);

-- ============================================================
-- updated_at triggers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_role_types_updated_at
  before update on public.role_types
  for each row execute function public.set_updated_at();

create trigger trg_projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger trg_people_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

create trigger trg_leave_periods_updated_at
  before update on public.leave_periods
  for each row execute function public.set_updated_at();

create trigger trg_project_resource_requirements_updated_at
  before update on public.project_resource_requirements
  for each row execute function public.set_updated_at();

create trigger trg_project_allocations_updated_at
  before update on public.project_allocations
  for each row execute function public.set_updated_at();

-- ============================================================
-- Views
-- ============================================================

create view public.people_with_roles as
select
  p.id,
  p.name,
  p.role_type_id,
  rt.name        as role_type_name,
  rt.description as role_type_description,
  p.created_at,
  p.updated_at
from public.people p
join public.role_types rt on rt.id = p.role_type_id;

create view public.project_allocations_detailed as
select
  pa.id,
  pa.person_id,
  pe.name             as person_name,
  pa.project_id,
  pr.name             as project_name,
  pa.role_type_id,
  rt.name             as role_type_name,
  pa.requirement_id,
  pa.allocation_percentage,
  pa.start_date,
  pa.end_date,
  pa.created_at,
  pa.updated_at
from public.project_allocations pa
join public.people      pe on pe.id = pa.person_id
join public.projects    pr on pr.id = pa.project_id
join public.role_types  rt on rt.id = pa.role_type_id;

create view public.project_requirements_detailed as
select
  prr.id,
  prr.project_id,
  proj.name             as project_name,
  prr.role_type_id,
  rt.name               as role_type_name,
  prr.required_count,
  prr.start_date,
  prr.end_date,
  prr.auto_generated_type,
  prr.ignored,
  prr.parent_requirement_id,
  prr.source_allocation_id,
  prr.created_at,
  prr.updated_at
from public.project_resource_requirements prr
join public.projects   proj on proj.id = prr.project_id
join public.role_types rt   on rt.id   = prr.role_type_id;

-- ============================================================
-- Sample data function
-- ============================================================

create or replace function public.insert_sample_data()
returns void language plpgsql as $$
declare
  v_role_dev   uuid;
  v_role_pm    uuid;
  v_role_qa    uuid;
  v_project_a  uuid;
  v_project_b  uuid;
  v_person_1   uuid;
  v_person_2   uuid;
  v_person_3   uuid;
begin
  -- Role types
  insert into public.role_types (name, description) values
    ('Developer',        'Software developer')   returning id into v_role_dev;
  insert into public.role_types (name, description) values
    ('Project Manager',  'Project manager')      returning id into v_role_pm;
  insert into public.role_types (name, description) values
    ('QA Engineer',      'Quality assurance')    returning id into v_role_qa;

  -- Projects
  insert into public.projects (name, start_date, end_date) values
    ('Project Alpha', '2026-01-01', '2026-06-30') returning id into v_project_a;
  insert into public.projects (name, start_date, end_date) values
    ('Project Beta',  '2026-03-01', '2026-12-31') returning id into v_project_b;

  -- People
  insert into public.people (name, role_type_id) values
    ('Alice Smith',   v_role_dev) returning id into v_person_1;
  insert into public.people (name, role_type_id) values
    ('Bob Johnson',   v_role_pm)  returning id into v_person_2;
  insert into public.people (name, role_type_id) values
    ('Carol Williams',v_role_qa)  returning id into v_person_3;

  -- Sample allocations
  insert into public.project_allocations (person_id, project_id, role_type_id, allocation_percentage, start_date, end_date) values
    (v_person_1, v_project_a, v_role_dev, 80, '2026-01-01', '2026-06-30'),
    (v_person_2, v_project_a, v_role_pm,  50, '2026-01-01', '2026-06-30'),
    (v_person_1, v_project_b, v_role_dev, 20, '2026-03-01', '2026-12-31'),
    (v_person_3, v_project_b, v_role_qa, 100, '2026-03-01', '2026-12-31');

  -- Sample resource requirements
  insert into public.project_resource_requirements (project_id, role_type_id, required_count, start_date, end_date) values
    (v_project_a, v_role_dev, 2, '2026-01-01', '2026-06-30'),
    (v_project_a, v_role_pm,  1, '2026-01-01', '2026-06-30'),
    (v_project_b, v_role_dev, 1, '2026-03-01', '2026-12-31'),
    (v_project_b, v_role_qa,  1, '2026-03-01', '2026-12-31');

  -- Sample leave
  insert into public.leave_periods (person_id, start_date, end_date, status, notes) values
    (v_person_1, '2026-02-10', '2026-02-14', 'approved', 'Annual leave');
end;
$$;

-- ============================================================
-- Row Level Security
-- Enable RLS on all tables; adjust policies to your auth model.
-- For now, authenticated users can read/write all rows.
-- ============================================================

alter table public.role_types                  enable row level security;
alter table public.projects                    enable row level security;
alter table public.people                      enable row level security;
alter table public.leave_periods               enable row level security;
alter table public.project_resource_requirements enable row level security;
alter table public.project_allocations         enable row level security;
alter table public.users                       enable row level security;
alter table public.roles                       enable row level security;
alter table public.user_roles                  enable row level security;

-- Authenticated users get full access (adjust as needed)
create policy "authenticated full access" on public.role_types
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.projects
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.people
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.leave_periods
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.project_resource_requirements
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on public.project_allocations
  for all to authenticated using (true) with check (true);

create policy "users can read own row" on public.users
  for select to authenticated using (auth.uid() = id);

create policy "users can insert own row" on public.users
  for insert to authenticated with check (auth.uid() = id);

create policy "authenticated read roles" on public.roles
  for select to authenticated using (true);

create policy "authenticated read own user_roles" on public.user_roles
  for select to authenticated using (user_id = auth.uid());
