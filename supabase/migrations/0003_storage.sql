-- ============================================================================
-- ApplyHQ — 0003_storage.sql
-- Storage bucket for raw uploaded PDFs. Run AFTER 0002_rls.sql.
-- ============================================================================

-- PRIVATE bucket (public = false). This is deliberate and not negotiable:
-- a resume contains full legal name, phone, email, and home town. A public
-- bucket serves every object to anyone holding the URL, with no auth check
-- and no expiry — and object paths are guessable. Reads go through
-- createSignedUrl() instead, which mints a short-lived, RLS-checked link.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resume-uploads',
  'resume-uploads',
  false,
  10485760,                      -- 10 MB
  array['application/pdf']       -- rejected at the edge, before the object lands
)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- Object-level RLS
--
-- Path convention, enforced by these policies:
--     resume-uploads/{user_id}/{resume_id}/{filename}.pdf
--                    ^^^^^^^^^
--                    foldername(name)[1] — must equal the caller's uid
--
-- The client cannot write outside its own uid folder, and cannot read into
-- anyone else's, because the first path segment is compared to auth.uid().
-- ─────────────────────────────────────────────────────────────────────────────

create policy "resume_uploads_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'resume-uploads'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "resume_uploads_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'resume-uploads'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "resume_uploads_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'resume-uploads'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'resume-uploads'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );

create policy "resume_uploads_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'resume-uploads'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  );
