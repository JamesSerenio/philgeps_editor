import { getTemplatePath, fetchAsset } from '../../lib/bidderAssets'
import { documentBidderName } from '../../lib/bidderCompanies'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatLongDate } from '../../lib/documentSetup'
import { clean, titleCase, wrapText } from './pdfHelpers'

export async function generateTableOfContentsPreview(project = {}) {
  const initao = (project.tableOfContentsVariant ?? project.templateVariant) === 'initao_lgu'
  const path = initao
    ? getTemplatePath('INITAO/TABLE OF CONTENTS-INITAO.pdf', project)
    : getTemplatePath('TABLE OF CONTENTS.pdf', project)
  const response = await fetchAsset(path)
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
  let titleY = initao ? 117.62 : 143.82
  const originalDateY = initao ? 145.97 : 171.42
  // Use the blank space above the checklist so long titles can wrap at a
  // readable size. Keep the date and bidder labels aligned with their values.
  const lastBidderY = initao ? 178 : 218
  const width = page.getWidth() - valueX - 36
  let size = 12
  let lines = wrapText(text(project.projectTitle), bold, size, width)
  if (initao && lines.length > 2) titleY -= 13.8
  const dateBaseline = () => Math.max(originalDateY, titleY + Math.max(1, lines.length) * size * 1.15 + 2)
  while (size > 6 && (dateBaseline() + 13.8 > lastBidderY || lines.some(line => bold.widthOfTextAtSize(line, size) > width))) {
    size -= 0.25
    lines = wrapText(text(project.projectTitle), bold, size, width)
  }
  const dateY = dateBaseline()
  const bidderY = dateY + 13.8
  erase(35, titleY - 13, page.getWidth() - 70, Math.max(bidderY, initao ? 159.89 : 185.22) - titleY + 17)
  const labelX = initao ? 36.024 : 36
  const colonX = initao ? 144.05 : 144.02
  for (const [label, baseline] of [['Project', titleY], ['Date', dateY], ['Name of Bidder', bidderY]]) {
    page.drawText(label, { x: labelX, y: height - baseline, font: regular, size: 12 })
    page.drawText(':', { x: colonX, y: height - baseline, font: regular, size: 12 })
  }
  lines.forEach((line, index) => page.drawText(line, { x: valueX, y: height - titleY - index * size * 1.15, size, font: bold }))
  for (const [value, baseline] of [[formatLongDate(project.date), dateY], [documentBidderName(project), bidderY]]) {
    const content = text(value)
    let fontSize = 12
    while (fontSize > 6 && bold.widthOfTextAtSize(content, fontSize) > width) fontSize -= 0.25
    page.drawText(content, { x: valueX, y: height - baseline, font: bold, size: fontSize })
  }
  const bytes = await document.save()
  return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
}
