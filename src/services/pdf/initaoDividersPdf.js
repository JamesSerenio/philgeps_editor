import { PDFDocument } from 'pdf-lib'

// Split the supplied three-page divider PDF without altering its appearance.
export async function generateInitaoDividerPreview(pageIndex) {
  const response = await fetch('/pdf/templates/INITAO/TECHNICAL COMPONENT ENVELOPE.pdf')
  if (!response.ok) throw new Error('Unable to load Initao component dividers.')
  const source = await PDFDocument.load(await response.arrayBuffer())
  if (pageIndex < 0 || pageIndex >= source.getPageCount()) throw new Error('Missing Initao divider page.')
  const document = await PDFDocument.create()
  const [page] = await document.copyPages(source, [pageIndex])
  document.addPage(page)
  return URL.createObjectURL(new Blob([await document.save()], { type: 'application/pdf' }))
}
