import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { parseProjectDate } from '../../lib/projectFormatters'
import { wrapText } from './pdfHelpers'

export function formatTabbingDeadline(value) {
  const date = parseProjectDate(value)
  if (!date) throw new Error('Closing / Deadline is required for the TABBING cover.')
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'long', day: 'numeric', year: 'numeric' }).format(date).toUpperCase()
  return day
}

export async function generateTabbingPreview(data = {}) {
  const deadline = formatTabbingDeadline(data.closingDate ?? data.closing_date)
  const response = await fetch('/pdf/templates/TABBING.pdf')
  if (!response.ok) throw new Error('Unable to load TABBING.pdf.')
  const document = await PDFDocument.load(await response.arrayBuffer())
  const bold = await document.embedFont(StandardFonts.TimesRomanBold)
  const office = await document.embedFont(StandardFonts.HelveticaBoldOblique)
  const white = rgb(1, 1, 1), red = rgb(1, 0, 0)
  const clean = value => String(value ?? '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()
  for (const page of document.getPages()) {
    const height = page.getHeight()
    const erase = (x, top, width, boxHeight) => page.drawRectangle({ x, y: height - top - boxHeight, width, height: boxHeight, color: white })
    const draw = (value, x, baseline, width, size, { centered = false, maxLines = 1, leading = 13.8, font = bold, color = rgb(0, 0, 0) } = {}) => {
      const text = clean(value)
      let lines = wrapText(text, font, size, width)
      while (size > 6 && (lines.length > maxLines || lines.some(line => font.widthOfTextAtSize(line, size) > width))) {
        size -= 0.25
        lines = wrapText(text, font, size, width)
      }
      lines.forEach((line, index) => page.drawText(line, { x: centered ? x + (width - font.widthOfTextAtSize(line, size)) / 2 : x,
        y: height - baseline - index * leading, size, font, color }))
    }
    erase(151, 29, 420, 34)
    draw(data.bidderName, 152.47, 55.7, 414, 25.92)
    erase(154, 65, 417, 14)
    draw('CDO Office: ' + clean(data.businessAddress), 155.59, 75.62, 412, 9.12, { font: office })
    erase(286, 177, 291, 29)
    draw(data.procuringEntity, 287.16, 191.09, 285, 12, { maxLines: 2, color: red })
    erase(286, 205, 291, 38)
    draw(data.projectTitle, 287.16, 218.47, 285, 12, { maxLines: 2, color: red })
    erase(286, 246, 291, 18)
    draw(data.referenceNumber, 287.16, 259.27, 285, 12, { color: red })
    erase(34, 349, 532, 110)
    draw(data.projectTitle, 45, 375.72, 506, 27.6, { centered: true, maxLines: 3, leading: 35.5 })
    erase(34, 721, 532, 54)
    draw(data.procuringEntity, 45, 737.98, 506, 19.92, { centered: true, maxLines: 2, leading: 23.27 })
    erase(34, 810, 532, 31)
    draw(deadline, 34, 828.24, 532, 19.92, { centered: true, color: red })
  }
  return URL.createObjectURL(new Blob([await document.save()], { type: 'application/pdf' }))
}
