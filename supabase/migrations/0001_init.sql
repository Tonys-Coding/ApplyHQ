-- ============================================================================
-- ApplyHQ — 0001_init.sql
-- Core schema: enums, tables, triggers, indexes.
-- Run this FIRST, then 0002_rls.sql, then 0003_storage.sql.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────────────

-- Stored snake_case; the UI owns the display labels (see stages.ts).
-- Postgres enum values are painful to rename later, and 'Interview Requests'
-- would need quoting in every query, URL param, and generated TS union.
create type public.application_stage as enum (
  'submitted',
  'pending',
  'interview_request',
  'offer',
  'accepted',
  'rejected'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Trigger functions
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- job_applications carries TWO clocks, and the distinction is load-bearing:
--
--   last_updated_at  — bumped on ANY edit. "when did I last touch this record"
--   stage_changed_at — bumped ONLY when `stage` actually moves.
--
-- The Ghosting Watchdog MUST key off stage_changed_at. If it used
-- last_updated_at, then fixing a typo in the job description would silently
-- reset the ghost clock on an application the company has ignored for a month.
create or replace function public.job_applications_touch()
returns trigger
language plpgsql
as $$
begin
  new.last_updated_at := now();
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — 1:1 with auth.users
-- ─────────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  email         text,
  phone         text,
  location      text,
  headline      text,
  github_url    text,
  linkedin_url  text,
  portfolio_url text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'User profile. Row is auto-created by the on_auth_user_created trigger.';

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-provision a profile row the moment a user signs up, via any provider.
-- SECURITY DEFINER so it can write to public.profiles under RLS;
-- search_path = '' forces fully-qualified names (guards against shadowing).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────────
-- resumes
-- ─────────────────────────────────────────────────────────────────────────────
--
-- JSONB element contract (enforced app-side via OpenAI Structured Outputs;
-- see src/types/domain.ts for the canonical TS types):
--
--   bullet := {
--     id: uuid, text: string,
--     hidden: boolean,          -- quick-action toggles + fit-to-one-page
--     origin: 'user' | 'ai'     -- powers the copilot change log
--   }
--
--   education[]  := { id, institution, degree, field_of_study, gpa,
--                     start_date, end_date, location, coursework[],
--                     bullets[], hidden, origin }
--
--   technical_projects_and_experience[] :=
--                   { id, kind: 'project'|'experience', title, organization,
--                     role, start_date, end_date, tech_stack[], link,
--                     bullets[], hidden, origin }
--
--   other_work_history[] := { id, employer, role, location,
--                             start_date, end_date, bullets[], hidden, origin }
--
-- `hidden` lives on every node so nothing is ever destroyed by tailoring —
-- it is toggled out of the render and can always be toggled back.

create table public.resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  version_name text not null,

  education                          jsonb not null default '[]'::jsonb,
  technical_projects_and_experience  jsonb not null default '[]'::jsonb,
  other_work_history                 jsonb not null default '[]'::jsonb,
  skills_and_keywords                text[] not null default '{}',

  -- Editor top-bar state (font size in pt, margins in inches).
  format_settings jsonb not null default
    '{"font_size": 10.5, "line_height": 1.15, "margin": 0.5}'::jsonb,

  pdf_storage_path text,
  is_master        boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint resumes_education_is_array
    check (jsonb_typeof(education) = 'array'),
  constraint resumes_technical_is_array
    check (jsonb_typeof(technical_projects_and_experience) = 'array'),
  constraint resumes_other_work_is_array
    check (jsonb_typeof(other_work_history) = 'array'),
  constraint resumes_format_settings_is_object
    check (jsonb_typeof(format_settings) = 'object')
);

create trigger resumes_touch_updated_at
  before update on public.resumes
  for each row execute function public.touch_updated_at();

create index resumes_user_id_idx
  on public.resumes (user_id);

-- Exactly one master resume per user. Partial index — non-master rows are
-- unconstrained, so a user can hold unlimited tailored versions.
create unique index resumes_one_master_per_user_idx
  on public.resumes (user_id)
  where is_master;

-- Backs the Keyword Matrix's skill-overlap lookups.
create index resumes_skills_gin_idx
  on public.resumes using gin (skills_and_keywords);

-- ─────────────────────────────────────────────────────────────────────────────
-- job_applications — powers the Kanban board
-- ─────────────────────────────────────────────────────────────────────────────

create table public.job_applications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,

  company_name          text not null,
  role_title            text not null,
  stage                 public.application_stage not null default 'submitted',
  salary_or_hourly_rate text,
  job_location          text,
  job_description_text  text,
  application_url       text,
  notes                 text,

  -- Which resume went out the door. Kept nullable: you can log an application
  -- before deciding, and deleting a resume must not delete the application.
  resume_id uuid references public.resumes (id) on delete set null,

  -- Manual ordering within a Kanban column. double precision so a card dropped
  -- between two others takes their midpoint — no renumbering the whole column.
  board_position double precision not null default extract(epoch from now()),

  -- Distinct from created_at: you might log on Friday something you submitted
  -- on Monday. The ghost clock should not punish you for that.
  applied_at       timestamptz,

  created_at       timestamptz not null default now(),
  last_updated_at  timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);

comment on column public.job_applications.stage_changed_at is
  'Ghosting Watchdog reads THIS, not last_updated_at. Only moves on stage change.';

create trigger job_applications_touch
  before update on public.job_applications
  for each row execute function public.job_applications_touch();

create index job_applications_user_stage_idx
  on public.job_applications (user_id, stage, board_position);

-- Ghosting query: idle applications still awaiting a response.
create index job_applications_ghost_idx
  on public.job_applications (user_id, stage_changed_at)
  where stage in ('submitted', 'pending', 'interview_request');

create index job_applications_resume_id_idx
  on public.job_applications (resume_id);
