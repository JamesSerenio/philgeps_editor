import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatLongDate } from '../../lib/documentSetup'
import { clean, titleCase, wrapText } from './pdfHelpers'

export async function generateTableOfContentsPreview(project = {}) {
  const initao = (project.tableOfContentsVariant ?? project.templateVariant) === 'initao_lgu'
  const path = initao
    ? '/pdf/templates/INITAO/TABLE OF CONTENTS-INITAO.pdf'
    : '/pdf/templates/TABLE OF CONTENTS.pdf'
  const response = await fetch(path)
  if (!response.ok) throw new Error('Unable to load ' + path)
  const document = await PDFDocument.load(await response.arrayBuffer())
  const page = document.getPages()[0]
  const height = page.getHeight()
  const regular = await document.embedFont(StandardFonts.TimesRoman)
  const bold = await document.embedFont(StandardFonts.TimesRomanBold)
  const white = rgb(1, 1, 1)
  const erase = (x, top, width, boxHeight) => page.drawRectangle({
    x, y: height - top - boxHeight, width, height: boxHeight, color: white,
  })
  const text = value => clean(value).replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ')
  const centered = (value, baseline, font) => {
    const content = text(value)
    let size = 12
    while (size > 6 && font.widthOfTextAtSize(content, size) > 520) size -= 0.25
    page.drawText(content, { x: (page.getWidth() - font.widthOfTextAtSize(content, size)) / 2, y: height - baseline, font, size })
  }
  // Only replace project-specific fields; preserve the selected template's checklist.
  erase(36, 50, 523, 29)
  centered(project.province ? 'PROVINCE OF ' + text(project.province).toUpperCase() : 'PROVINCE OF', initao ? 61.22 : 61, bold)
  centered('Municipality of ' + titleCase(project.municipality), initao ? 75.38 : 74.8, regular)

  const valueX = initao ? 180.07 : 180.02
  const titleY = initao ? 117.62 : 143.82
  const dateY = initao ? 145.97 : 171.42
  const bidderY = initao ? 159.89 : 185.22
  const width = page.getWidth() - valueX - 36
  erase(valueX - 1, titleY - 13, width + 2, 29)
  let size = 12
  let lines = wrapText(text(project.projectTitle), bold, size, width)
  while (size > 6 && (lines.length > 2 || lines.some(line => bold.widthOfTextAtSize(line, size) > width))) {
    size -= 0.25
    lines = wrapText(text(project.projectTitle), bold, size, width)
  }
  lines.forEach((line, index) => page.drawText(line, { x: valueX, y: height - titleY - index * 13.8, size, font: bold }))
  for (const [value, baseline] of [[formatLongDate(project.date), dateY], [project.bidderName, bidderY]]) {
    erase(valueX - 1, baseline - 12, width + 2, 14)
    const content = text(value)
    let fontSize = 12
    while (fontSize > 6 && bold.widthOfTextAtSize(content, fontSize) > width) fontSize -= 0.25
    page.drawText(content, { x: valueX, y: height - baseline, font: bold, size: fontSize })
  }
  const bytes = await document.save()
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
}
