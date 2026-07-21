import { extractPdfText } from '../lib/pdf'
import { getUserFromRequest, unauthorized } from '../lib/auth'

const MAX_BYTES = 10 * 1024 * 1024 // must match the bucket's file_size_limit
const PDF_MAGIC = '%PDF-'

export interface ParseResumeResponse {
  filename: string
  bytes: number
  pages: number
  chars: number
  /** One entry per visual line — section and bullet boundaries survive here. */
  lines: string[]
  /** lines joined with \n. This is what goes to the model. */
  text: string
  /** The PDF's dominant font name (e.g. "Calibri") or a generic. */
  fontName: string
}

/**
 * POST /api/resume/parse   multipart/form-data, field: file
 *
 * Extracts text only. It deliberately does NOT call the model or write to the
 * database — parsing is deterministic and cheap, structuring is probabilistic
 * and expensive, and fusing them would mean re-uploading the PDF every time we
 * touch a prompt.
 */
export async function parseResume(req: Request): Promise<Response> {
  const user = await getUserFromRequest(req)
  if (!user) return unauthorized()

  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return Response.json(
      { error: 'Expected multipart/form-data with a `file` field.' },
      { status: 415 },
    )
  }

  // Inferred, not annotated as FormData: @types/node drags in undici's FormData,
  // which structurally conflicts with Bun's. Letting Request.formData() supply
  // the type sidesteps the collision entirely.
  const form = await req.formData().catch(() => null)
  if (!form) {
    return Response.json({ error: 'Malformed multipart body.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return Response.json({ error: 'Missing `file` field.' }, { status: 400 })
  }

  if (file.size === 0) {
    return Response.json({ error: 'File is empty.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return Response.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024}MB limit.` },
      { status: 413 },
    )
  }

  const bytes = new Uint8Array(await file.arrayBuffer())

  // Sniff the magic bytes rather than trusting the multipart content-type
  // header, which the client controls and can trivially lie about.
  const header = new TextDecoder().decode(bytes.subarray(0, 5))
  if (header !== PDF_MAGIC) {
    return Response.json(
      { error: 'Not a PDF (bad magic bytes). Only application/pdf is accepted.' },
      { status: 415 },
    )
  }

  let extracted
  try {
    extracted = await extractPdfText(bytes)
  } catch (err) {
    console.error('[parse-resume] extraction failed:', err)
    return Response.json(
      { error: 'Could not read this PDF. It may be corrupt or password-protected.' },
      { status: 422 },
    )
  }

  // A scanned/image-only resume parses fine and yields ~nothing. Say so plainly
  // instead of handing the model an empty string and billing for the round trip.
  if (extracted.chars < 50) {
    return Response.json(
      {
        error:
          'Almost no text found. This is likely a scanned image rather than a text PDF — ' +
          'OCR would be required, which is not supported yet.',
        pages: extracted.pages,
        chars: extracted.chars,
      },
      { status: 422 },
    )
  }

  const payload: ParseResumeResponse = {
    filename: file.name,
    bytes: file.size,
    pages: extracted.pages,
    chars: extracted.chars,
    lines: extracted.lines,
    text: extracted.text,
    fontName: extracted.fontName,
  }

  return Response.json(payload)
}
