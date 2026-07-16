import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Browser Supabase client.
 *
 * The anon key is safe to ship — it is a public identifier, and RLS (0002_rls.sql)
 * is what actually guards the data. The service-role key bypasses RLS entirely
 * and must NEVER be imported from src/; it lives in server/ only.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly at module load. A missing key otherwise surfaces as an opaque
// "Failed to fetch" on the first query, which is a miserable thing to debug.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables.\n' +
      'Copy .env.example to .env.local and set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY, then restart the dev server ' +
      '(Vite only reads env at startup).',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Required for the OAuth redirect back from Google/Microsoft: the session
    // arrives in the URL and must be picked up on load.
    detectSessionInUrl: true,
    // PKCE over implicit flow — no access token in the URL fragment.
    flowType: 'pkce',
  },
})

/** Bearer token for calls to our own Bun API, which verifies it server-side. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export const RESUME_BUCKET = 'resume-uploads'

/**
 * Storage path for an uploaded PDF.
 *
 * The leading {userId} segment is not cosmetic — the storage RLS policies in
 * 0003_storage.sql compare `(storage.foldername(name))[1]` to auth.uid().
 * Deviate from this shape and every upload will 403.
 */
export function resumePdfPath(userId: string, resumeId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  return `${userId}/${resumeId}/${safeName}`
}
