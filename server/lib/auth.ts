import { createClient, type User } from '@supabase/supabase-js'
import { env } from './env'

/**
 * Validates the caller's Supabase JWT.
 *
 * Uses the ANON key: getUser(token) asks the auth server to verify the
 * signature and expiry, so a forged or expired token cannot pass. We
 * deliberately do NOT decode the JWT locally and trust its `sub` claim —
 * that would accept any well-formed token, signed or not.
 */
const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const header = req.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

export function unauthorized(message = 'Authentication required') {
  return Response.json({ error: message }, { status: 401 })
}
