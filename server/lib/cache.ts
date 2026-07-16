import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

/**
 * Disk-backed TTL cache.
 *
 * Disk rather than a Map, specifically because of JSearch's 200 requests/month
 * free tier. `bun --watch` restarts the process on every file save, so an
 * in-memory cache would be empty again seconds later and each dev reload would
 * spend real quota. At ~6 requests/day of headroom that is not survivable.
 *
 * Also memoized in-process, so repeat hits within one run skip the disk read.
 */

const CACHE_DIR = join(process.cwd(), '.cache')

interface Entry<T> {
  expiresAt: number
  value: T
}

const memo = new Map<string, Entry<unknown>>()

function pathFor(namespace: string, key: string) {
  const hash = createHash('sha256').update(key).digest('hex').slice(0, 32)
  return join(CACHE_DIR, `${namespace}-${hash}.json`)
}

export async function cacheGet<T>(namespace: string, key: string): Promise<T | null> {
  const memoKey = `${namespace}:${key}`

  const hit = memo.get(memoKey)
  if (hit) {
    if (hit.expiresAt > Date.now()) return hit.value as T
    memo.delete(memoKey)
  }

  try {
    const file = Bun.file(pathFor(namespace, key))
    if (!(await file.exists())) return null

    const entry = (await file.json()) as Entry<T>
    if (entry.expiresAt <= Date.now()) return null

    memo.set(memoKey, entry)
    return entry.value
  } catch {
    // A corrupt cache file must never take down a request.
    return null
  }
}

export async function cacheSet<T>(
  namespace: string,
  key: string,
  value: T,
  ttlSeconds: number,
): Promise<void> {
  const entry: Entry<T> = { expiresAt: Date.now() + ttlSeconds * 1000, value }
  memo.set(`${namespace}:${key}`, entry)

  try {
    await mkdir(CACHE_DIR, { recursive: true })
    await Bun.write(pathFor(namespace, key), JSON.stringify(entry))
  } catch (err) {
    // Best-effort: a failed write costs a future quota hit, not this request.
    console.warn('[cache] write failed:', err)
  }
}
