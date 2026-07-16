import { env } from './lib/env'
import { parseResume } from './routes/resume'

/**
 * ApplyHQ API.
 *
 * Exists for one reason: OPENAI_API_KEY, RAPIDAPI_KEY, and the Supabase
 * service-role key cannot go in the client. Vite inlines every VITE_* var into
 * the bundle, so any key the browser can reach is a published key. Everything
 * that touches a secret terminates here.
 *
 *   bun run dev:server     (watch mode)
 *
 * Vite proxies /api -> localhost:3001 in dev (see vite.config.ts), so the
 * frontend calls same-origin /api/... in every environment.
 */

const server = Bun.serve({
  port: env.port,

  routes: {
    '/api/health': new Response('ok'),

    '/api/resume/parse': {
      POST: parseResume,
    },
  },

  fetch() {
    return Response.json({ error: 'Not found' }, { status: 404 })
  },

  error(err) {
    // Log the real error server-side; return an opaque message. Error text can
    // carry key fragments, file paths, and SQL — none of it belongs in a client.
    console.error('[server] unhandled:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  },
})

console.log(`ApplyHQ API listening on http://localhost:${server.port}`)
console.log(`  models: tailor=${env.modelTailor}  fast=${env.modelFast}`)
