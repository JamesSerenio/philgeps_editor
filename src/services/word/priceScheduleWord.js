import { generatePriceSchedulePreview } from '../pdf/priceSchedulePdf'
import { templateWord } from './templateWord'

export function priceScheduleWord(options = {}) {
  const document = options.document ?? {
    name: 'PRICE SCHEDULE FOR GOODS.pdf',
    generate: () => generatePriceSchedulePreview({
      ...options.setup,
      items: options.technical ?? [],
      priceValues: options.priceValues ?? {},
    }),
  }
  return templateWord({ ...options, document }, 21, {
    tables: true,
    headerRows: 1,
    paragraphStyle: 'PriceSchedule',
    exactLineSpacing: true,
    positionedGaps: true,
    tableExactGeometry: true,
    tableMergedBorders: true,
    rightAllowance: 10,
    preparePage(page) {
      // Grid rules are cell borders, not text underlines.
      page.fragments.forEach(part => {
        part.underline = false
        // Word uses half-point sizes; round down to keep the PDF's line breaks
        // inside the narrow specification column rather than adding wrapped lines.
        part.size = Math.floor(part.size * 2) / 2
      })
      // Closed PDF rectangle paths omit their closing edge in text extraction.
      // Recover only full-width row edges shared by the column dividers.
      const vertical = page.lines.filter(rule => Math.abs(rule.x1 - rule.x2) < 0.1)
      const ends = [...new Set(vertical.flatMap(rule => [rule.y1, rule.y2]))]
      for (const y of ends) {
        const matching = vertical.filter(rule => Math.abs(rule.y1 - y) < 0.1 || Math.abs(rule.y2 - y) < 0.1)
        if (matching.length < 8 && !(matching.length >= 4 && Math.abs(y - Math.max(...vertical.map(rule => rule.y2))) < 0.1)) continue
        const x1 = Math.min(...matching.map(rule => rule.x1))
        const x2 = Math.max(...matching.map(rule => rule.x1))
        if (!page.lines.some(rule => Math.abs(rule.y1 - y) < 0.1 && Math.abs(rule.y2 - y) < 0.1 && rule.x1 <= x1 + 1 && rule.x2 >= x2 - 1)) {
          page.lines.push({ x1, x2, y1: y, y2: y })
        }
      }
      // Retain the isolated first-page title rule as editable text.
      for (const rule of page.lines) {
        const width = rule.x2 - rule.x1
        if (Math.abs(rule.y1 - rule.y2) > 0.1 || width < 500) continue
        const touchesGrid = page.lines.some(other =>
          Math.abs(other.x1 - other.x2) < 0.1 &&
          other.y1 <= rule.y1 + 1 && other.y2 >= rule.y1 - 1)
        if (touchesGrid) continue
        page.fragments.push({
          str: '_'.repeat(Math.round(width / 4)),
          x: rule.x1, y: rule.y1 - 1,
          top: rule.y1 - 6, bottom: rule.y1 + 2,
          width, size: 8, font: 'Times New Roman',
          bold: false, italics: false, underline: false, color: '595959',
        })
      }
    },
  })
}
