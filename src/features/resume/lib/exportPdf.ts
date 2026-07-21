import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

/**
 * Render the on-screen resume to a PDF and download it straight to the user's
 * Downloads folder — no print dialog.
 *
 * We rasterize the actual resume DOM (html-to-image, via an SVG foreignObject so
 * modern CSS incl. oklch just works) and place it into a Letter-sized jsPDF,
 * paginating if it runs long. This guarantees the file looks EXACTLY like the
 * canvas — same font, spacing, and layout the user sees and edits.
 *
 * jsPDF.save() writes a Blob and clicks a hidden anchor, which lands the file in
 * Downloads directly.
 */
export async function downloadResumePdf(node: HTMLElement, filename: string): Promise<void> {
  // Hide edit-only affordances (add buttons, empty-field placeholders) for the
  // capture, exactly as print does. Scoped to <html> so the resume subtree is
  // covered; removed in `finally` so the editor is untouched afterward.
  const root = document.documentElement
  root.classList.add('exporting')
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2, // crisp text
      backgroundColor: '#ffffff',
      cacheBust: true,
      filter: (el) => !(el instanceof HTMLElement && el.classList.contains('no-print')),
    })

    const pdf = new jsPDF({ unit: 'pt', format: 'letter', compress: true })
    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()

    // Scale the capture to the page width; height follows the DOM aspect ratio.
    const imgH = (node.offsetHeight / node.offsetWidth) * pageW

    let heightLeft = imgH
    let position = 0
    pdf.addImage(dataUrl, 'PNG', 0, position, pageW, imgH)
    heightLeft -= pageH

    // Long resume -> add pages, shifting the same tall image up each time.
    while (heightLeft > 0) {
      position -= pageH
      pdf.addPage()
      pdf.addImage(dataUrl, 'PNG', 0, position, pageW, imgH)
      heightLeft -= pageH
    }

    pdf.save(filename)
  } finally {
    root.classList.remove('exporting')
  }
}
