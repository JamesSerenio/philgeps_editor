import { templateWord } from './templateWord'

// Preserve the live Schedule PDF's wording, fonts, row borders, merged cells,
// delivery values, and page order as native editable Word content.
export function scheduleWord(options) {
  const markedFragments = new Set()
  const markers = (options.schedule ?? []).flatMap((item) =>
    (item.specificationLines ?? [])
      .filter(
        (line) =>
          line.marker &&
          line.marker !== 'None' &&
          String(line.text ?? '').trim(),
      )
      .map((line) => ({ ...line, used: false })),
  )
  return templateWord(options, 14, {
    tables: true,
    headerRows: 1,
    paragraphStyle: 'ScheduleRequirements',
    exactLineSpacing: true,
    positionedGaps: true,
    tableExactGeometry: true,
    rightAllowance: 10,
    preparePage(page) {
      // PDF markers are vector shapes; retain their editable Word equivalents.
      for (const line of markers) {
        if (line.used) continue
        const text = String(line.text).trim().replace(/\s+/g, ' ')
        const part = page.fragments.find(
          (part) =>
            !markedFragments.has(part) &&
            part.x > 100 &&
            part.x < 120 &&
            text.startsWith(part.str.trim()) &&
            part.str.trim().length > 2,
        )
        if (!part) continue
        page.fragments.push({
          ...part,
          str: line.marker,
          x: part.x - 13,
          width: 7,
          font: 'Arial',
          bold: line.bold === true,
        })
        markedFragments.add(part)
        line.used = true
      }
    },
  })
}
