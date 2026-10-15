import { generateSummaryPreview } from '../pdf/summaryPdf'
import { templateWord } from './templateWord'

export function summaryWord(options = {}) {
  const document = options.document ?? {
    name: 'SUMMARY OF BID PRICES.pdf',
    generate: () => generateSummaryPreview({
      ...options.setup,
      items: options.technical ?? [],
      priceValues: options.priceValues ?? {},
    }),
  }
  return templateWord({ ...options, document }, 22, {
    tables: true,
    headerRows: 1,
    paragraphStyle: 'SummaryPrices',
    exactLineSpacing: true,
    positionedGaps: true,
    tableExactGeometry: true,
    tableMergedBorders: true,
    rightAllowance: 10,
    preparePage(page) {
      const vertical = page.lines.filter(rule => Math.abs(rule.x1 - rule.x2) < 0.1)
      // Restore closing rectangle edges omitted by PDF path extraction.
      for (const y of new Set(vertical.flatMap(rule => [rule.y1, rule.y2]))) {
        const matching = vertical.filter(rule => Math.abs(rule.y1 - y) < 0.1 || Math.abs(rule.y2 - y) < 0.1)
        const x1 = Math.min(...matching.map(rule => rule.x1))
        const x2 = Math.max(...matching.map(rule => rule.x1))
        if (matching.length < 2 || x2 - x1 < 400) continue
        if (!page.lines.some(rule => Math.abs(rule.y1 - y) < 0.1 && Math.abs(rule.y2 - y) < 0.1 && rule.x1 <= x1 + 1 && rule.x2 >= x2 - 1)) {
          page.lines.push({ x1, x2, y1: y, y2: y })
        }
      }
      for (const part of page.fragments) {
        // Table rules must not become spurious text underlines.
        part.underline = page.lines.some(rule =>
          Math.abs(rule.y1 - rule.y2) < 0.1 &&
          rule.y1 >= part.y && rule.y1 <= part.y + 3 &&
          rule.x1 <= part.x + 2 && rule.x2 >= part.x + part.width - 2 &&
          !vertical.some(edge => Math.abs(edge.y1 - rule.y1) < 0.1 || Math.abs(edge.y2 - rule.y1) < 0.1))
        part.size = Math.floor(part.size * 2) / 2
      }
      // Isolated fill-in lines remain editable and visible in the Word preview.
      for (const rule of page.lines) {
        const width = rule.x2 - rule.x1
        if (Math.abs(rule.y1 - rule.y2) > 0.1 || width < 30) continue
        if (vertical.some(edge => edge.y1 <= rule.y1 + 1 && edge.y2 >= rule.y1 - 1)) continue
        if (page.fragments.some(part => Math.abs(part.y - rule.y1) < 5 && part.x <= (rule.x1 + rule.x2) / 2 && part.x + part.width >= (rule.x1 + rule.x2) / 2)) continue
        const anchor = page.fragments.find(part => Math.abs(part.y - rule.y1) < 5)
        if (!anchor) continue
        page.fragments.push({ ...anchor, str: '_'.repeat(Math.round(width / (anchor.size * 0.5))), x: rule.x1, width, bold: false, underline: false })
      }
    },
  })
}
