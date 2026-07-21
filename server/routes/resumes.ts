import { createClient } from '@supabase/supabase-js'
import { env } from '../lib/env'
import { getUserFromRequest, unauthorized } from '../lib/auth'

/*
 * POST /api/resumes/:id/duplicate   { version_name?: string }
 *
 * Clones a resume row for the calling user. Runs against a user-scoped client
 * (anon key + the caller's JWT) so RLS does the ownership check — the server
 * never needs the service-role key for this.
 */
export async function duplicateResumeRoute(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req)
  if (!user) return unauthorized()

  const token = req.headers.get('Authorization')?.slice(7) ?? ''
  const db = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const id = new URL(req.url).pathname.split('/')[3]
  if (!id) return Response.json({ error: 'Missing resume id.' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { version_name?: string }

  const { data: source, error: readError } = await db
    .from('resumes')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (readError) return Response.json({ error: readError.message }, { status: 500 })
  if (!source) return Response.json({ error: 'Resume not found.' }, { status: 404 })

  /* A copy is never the master — the partial unique index allows one master per
     user, and duplicating the master must not trip it. */
  const clone = {
    user_id: user.id,
    version_name: body.version_name?.trim() || `${source.version_name} (Copy)`,
    is_master: false,
    education: source.education,
    technical_projects_and_experience: source.technical_projects_and_experience,
    other_work_history: source.other_work_history,
    skills_and_keywords: source.skills_and_keywords,
    format_settings: source.format_settings,
    pdf_storage_path: source.pdf_storage_path,
  }

  const { data: created, error: writeError } = await db
    .from('resumes')
    .insert(clone)
    .select()
    .single()

  if (writeError) return Response.json({ error: writeError.message }, { status: 500 })
  return Response.json({ resume: created })
}
