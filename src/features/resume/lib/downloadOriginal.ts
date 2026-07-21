import { supabase, RESUME_BUCKET } from '@/lib/supabase'

/**
 * Download the pristine original PDF the user uploaded, from private storage via
 * a short-lived signed URL. This is the byte-for-byte original — the truest
 * "exactly as uploaded" — independent of any edits made since.
 */
export async function downloadOriginalPdf(path: string, suggestedName: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from(RESUME_BUCKET)
    .createSignedUrl(path, 60, { download: suggestedName })
  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Could not get the original file.')
  }

  const a = document.createElement('a')
  a.href = data.signedUrl
  a.download = suggestedName
  document.body.appendChild(a)
  a.click()
  a.remove()
}
