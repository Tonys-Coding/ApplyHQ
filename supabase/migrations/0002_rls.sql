-- ============================================================================
-- ApplyHQ — 0002_rls.sql
-- Row Level Security. Run AFTER 0001_init.sql.
--
-- Every policy is scoped `to authenticated`, so the anon role has no path to
-- any row in any table. Ownership is the only predicate.
--
-- Note the `(select auth.uid())` wrapping rather than a bare `auth.uid()`.
-- The subquery form is evaluated ONCE per statement as an InitPlan instead of
-- once per row — on a board with hundreds of applications this is the
-- difference between an index scan and a per-row function call.
-- ============================================================================

alter table public.profiles         enable row level security;
alter table public.resumes          enable row level security;
alter table public.job_applications enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — ownership is the primary key itself
-- ─────────────────────────────────────────────────────────────────────────────

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- INSERT policy exists for completeness; in practice handle_new_user() creates
-- the row via SECURITY DEFINER before the client ever gets a session.
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

-- `using` gates which rows you may target; `with check` gates what they may
-- become. Both are required, or a user could UPDATE their row's id to someone
-- else's and hand over the record.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete_own"
  on public.profiles for delete
  to authenticated
  using ((select auth.uid()) = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- resumes
-- ─────────────────────────────────────────────────────────────────────────────

create policy "resumes_select_own"
  on public.resumes for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "resumes_insert_own"
  on public.resumes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "resumes_update_own"
  on public.resumes for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "resumes_delete_own"
  on public.resumes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- job_applications
-- ─────────────────────────────────────────────────────────────────────────────

create policy "job_applications_select_own"
  on public.job_applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "job_applications_insert_own"
  on public.job_applications for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "job_applications_update_own"
  on public.job_applications for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "job_applications_delete_own"
  on public.job_applications for delete
  to authenticated
  using ((select auth.uid()) = user_id);
