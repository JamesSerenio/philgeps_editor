import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { AlignmentType, ImageRun, Paragraph, SectionType } from 'docx'
import { sectionMarker } from './wordHelpers'

GlobalWorkerOptions.workerSrc = workerUrl

export async function pdfPageImages(source, name, number, onPage = () => {}) {
  if (typeof source !== 'string' || !source.startsWith('/pdf/static/')) {
    throw new Error('Page images are allowed only for documents in public/pdf/static.')
  }
  const response = await fetch(source)
  if (!response.ok) throw new Error(name + ': HTTP ' + response.status)
  const data = new Uint8Array(await response.arrayBuffer())
  if (!new TextDecoder().decode(data.slice(0, 5)).startsWith('%PDF-')) throw new Error(name + ': invalid or missing PDF')
  const task = getDocument({ data, useSystemFonts: true, useWasm: false, isEvalSupported: false, stopAtErrors: true })
  try {
    const pdf = await task.promise
    if (!pdf.numPages) throw new Error(name + ': PDF contains no pages')
    const sections = []
    for (let n = 1; n <= pdf.numPages; n++) {
      onPage(n, pdf.numPages)
      const page = await pdf.getPage(n)
      const original = page.getViewport({ scale: 1 })
      const scale = Math.min(2.25, 4096 / Math.max(original.width, original.height), Math.sqrt(12000000 / (original.width * original.height)))
      const viewport = page.getViewport({ scale })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
      try {
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Browser canvas is unavailable')
        await page.render({ canvasContext: context, viewport, background: '#ffffff' }).promise
        const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Page image conversion failed')), 'image/jpeg', .94))
        const tax = name === 'TAX_template.pdf'
        const fitPage = Math.min(1, 1584 / Math.max(original.width, original.height))
        const width = tax ? 595.28 : original.width * fitPage
        const height = tax ? 841.89 : original.height * fitPage
        const fit = Math.min((width - 40) / original.width, (height - 44) / original.height)
        const imageWidth = original.width * fit, imageHeight = original.height * fit
        sections.push({ properties: { type: SectionType.NEXT_PAGE, page: { size: { width: Math.round(width * 20), height: Math.round(height * 20) }, margin: { top: Math.floor((height - imageHeight) / 2 * 20), bottom: 360, left: 400, right: 400 } } }, children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 0 }, children: [...(n === 1 ? [sectionMarker(number)] : []), new ImageRun({ type: 'jpg', data: new Uint8Array(await blob.arrayBuffer()), transformation: { width: imageWidth * 96 / 72, height: imageHeight * 96 / 72 }, altText: { title: name, description: name + ' - page ' + n, name: 'Section ' + number + ', page ' + n } })] })] })
      } finally {
        canvas.width = 0; canvas.height = 0; page.cleanup()
      }
    }
    return sections
  } finally { await task.destroy() }
}
