/**
 * Verifies the live Supabase project matches supabase/migrations/*.sql.
 *
 *   bun scripts/check-schema.ts
 *
 * Uses the ANON key only, deliberately: the service-role key bypasses RLS, so
 * a check run with it would pass even if RLS were completely off. Prints status
 * only — never key material.
 */

const url = Bun.env.VITE_SUPABASE_URL
const anon = Bun.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('✗ VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing from .env.local')
  process.exit(1)
}

const headers = { apikey: anon, Authorization: `Bearer ${anon}` }
const TABLES = ['profiles', 'resumes', 'job_applications'] as const

let failures = 0

console.log(`\nProject: ${new URL(url).host}\n`)
console.log('─── tables ───')

for (const table of TABLES) {
  const res = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, { headers })
  const body = (await res.json().catch(() => ({}))) as { code?: string; message?: string }

  if (res.ok) {
    console.log(`  ✓ ${table.padEnd(18)} exists`)
  } else if (body.code === 'PGRST205' || res.status === 404) {
    console.log(`  ✗ ${table.padEnd(18)} DOES NOT EXIST — 0001_init.sql has not run`)
    failures++
  } else {
    console.log(`  ? ${table.padEnd(18)} HTTP ${res.status} ${body.code ?? ''} ${body.message ?? ''}`)
    failures++
  }
}

console.log('\n─── RLS (anon must be denied) ───')

/**
 * Probe with a syntactically valid but nonexistent user_id.
 *
 *   401/403        -> the policy rejected us before the FK was ever checked. RLS on.
 *   409 (FK error) -> we got PAST the policy layer and only the foreign key
 *                     stopped us. That means RLS is OFF and any anon caller can
 *                     write. Critical.
 *   201            -> row actually inserted. Worse. We clean it up below.
 */
const probe = await fetch(`${url}/rest/v1/job_applications`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
  body: JSON.stringify({
    user_id: '00000000-0000-0000-0000-000000000000',
    company_name: '__rls_probe__',
    role_title: '__rls_probe__',
  }),
})

if (probe.status === 401 || probe.status === 403) {
  console.log('  ✓ anon INSERT denied by policy — RLS is active')
} else if (probe.status === 409) {
  console.log('  ✗ anon INSERT reached the FK check — RLS IS OFF. Run 0002_rls.sql.')
  failures++
} else if (probe.ok) {
  console.log('  ✗ anon INSERT SUCCEEDED — RLS IS OFF. Anyone can write. Run 0002_rls.sql.')
  failures++
  await fetch(`${url}/rest/v1/job_applications?company_name=eq.__rls_probe__`, {
    method: 'DELETE',
    headers,
  })
  console.log('    (probe row cleaned up)')
} else {
  const b = await probe.text()
  console.log(`  ? unexpected HTTP ${probe.status}: ${b.slice(0, 160)}`)
}

console.log('\n─── storage ───')

const bucket = await fetch(`${url}/storage/v1/object/list/resume-uploads`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefix: '', limit: 1 }),
})

if (bucket.status === 400 || bucket.status === 404) {
  const b = (await bucket.json().catch(() => ({}))) as { message?: string }
  if (/not found/i.test(b.message ?? '')) {
    console.log('  ✗ bucket resume-uploads NOT FOUND — 0003_storage.sql has not run')
    failures++
  } else {
    console.log(`  ? HTTP ${bucket.status}: ${b.message ?? ''}`)
  }
} else {
  console.log(`  ✓ bucket resume-uploads reachable (HTTP ${bucket.status})`)
}

console.log(
  failures === 0
    ? '\n✓ schema verified\n'
    : `\n✗ ${failures} problem(s) — see above\n`,
)
process.exit(failures === 0 ? 0 : 1)
