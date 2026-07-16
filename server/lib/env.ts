/**
 * Server env access. Bun auto-loads .env.local — no dotenv needed.
 *
 * Everything here is read ONLY on the server. Nothing in this file may ever be
 * imported from src/, or Vite would inline the secret into the client bundle.
 */

function required(name: string): string {
  const value = Bun.env[name]
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Copy .env.example to .env.local and fill it in.`,
    )
  }
  return value
}

function optional(name: string, fallback: string): string {
  return Bun.env[name] || fallback
}

export const env = {
  supabaseUrl: required('SUPABASE_URL'),
  // The anon key is public by design; the server uses it purely to validate
  // user JWTs against the auth server.
  supabaseAnonKey: Bun.env.SUPABASE_ANON_KEY || required('VITE_SUPABASE_ANON_KEY'),

  openaiApiKey: required('OPENAI_API_KEY'),
  modelTailor: optional('OPENAI_MODEL_TAILOR', 'gpt-5.6-terra'),
  modelFast: optional('OPENAI_MODEL_FAST', 'gpt-5.6-luna'),

  port: Number(optional('PORT', '3001')),
}

/**
 * Read lazily and NOT via required() at module load: the PDF endpoint must work
 * before JSearch keys are configured.
 */
export function rapidApiConfig() {
  return {
    key: required('RAPIDAPI_KEY'),
    host: optional('RAPIDAPI_HOST', 'jsearch.p.rapidapi.com'),
  }
}
