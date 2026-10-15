import { templateWord } from './templateWord'

export function initaoDividerWord(options) {
  return templateWord(options, options.sectionNumber, {
    tables: false,
    paragraphStyle: 'InitaoDivider',
    exactLineSpacing: true,
    positionedGaps: true,
    rightAllowance: 5,
    preparePage(page) {
      for (const rule of page.lines) {
        const width = rule.x2 - rule.x1
        if (Math.abs(rule.y1 - rule.y2) > 0.1 || width < 100) continue
        page.fragments.push({ str: '_'.repeat(Math.round(width / 5)), x: rule.x1,
          y: rule.y1 - 1, top: rule.y1 - 8, bottom: rule.y1 + 2,
          width, size: 10, font: 'Times New Roman', bold: false, italics: false,
          underline: false, color: '000000' })
      }
    },
  })
}
