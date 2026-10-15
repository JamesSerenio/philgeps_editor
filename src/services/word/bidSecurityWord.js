import { templateWord } from './templateWord'

// Use the generated, saved-variant PDF as the source of editable text.
export function bidSecurityWord(options) {
  const withoutTable = /without[\s_]*table/i.test(options.document?.name ?? '')
  const policy = { tables: true, headerRows: 1, preserveBlankLines: true }
  if (withoutTable)
    Object.assign(policy, {
      paragraphStyle: 'BidSecurity',
      exactLineSpacing: true,
      positionedGaps: true,
      rightAllowance: 15,
      preparePage(page, index) {
        if (index !== 0) return
        const venue = page.fragments.find((part) =>
          /^MUNICIPALITY OF /i.test(part.str.trim()),
        )
        if (!venue) return
        // The PDF overlay baseline differs slightly from the template's S.S.
        // Keep this visual header row together instead of adding a Word line.
        page.fragments.forEach((part) => {
          if (/^\)/.test(part.str.trim()) && Math.abs(part.y - venue.y) < 5) {
            const offset = venue.y - part.y
            part.y += offset
            part.top += offset
            part.bottom += offset
          }
        })
      },
    })
  return templateWord(options, 12, policy)
}
