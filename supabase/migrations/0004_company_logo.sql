-- ============================================================================
-- TalentPulse — 0004_company_logo.sql
-- Persist the company logo on tracked applications so a job saved from Discover
-- carries its employer logo onto the Kanban card. Custom applications leave it
-- null and fall back to an initials monogram in the UI.
-- ============================================================================

alter table public.job_applications
  add column if not exists company_logo text;
