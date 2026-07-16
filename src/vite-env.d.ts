/// <reference types="vite/client" />

/**
 * Typed client env. Only VITE_-prefixed vars exist here, and that is the whole
 * security boundary: anything declared below is inlined into the production
 * bundle and readable by anyone who opens devtools.
 *
 * Server-only secrets (OPENAI_API_KEY, RAPIDAPI_KEY, SUPABASE_SERVICE_ROLE_KEY)
 * are read via Bun.env in server/ and must never appear in this interface.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
