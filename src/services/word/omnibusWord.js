import { templateWord } from './templateWord'

export function omnibusWord(options) {
  return templateWord(options, 16, {
    tables: false,
    preparePage(page) {
      // The PDF overlay can move this short suffix onto the next reference line
      // for a long company name. Keep its legal reading order in editable Word.
      const suffix = page.fragments.find(part => part.str.trim() === 'failure to')
      if (!suffix) return
      const company = String(options.setup?.bidderName ?? '').trim().toUpperCase()
      const name = page.fragments.find(part => part.str.includes(company) && company && part.x >= 300 && suffix.y > part.y && suffix.y - part.y <= 16)
      if (!name) return
      const lineEnd = Math.max(...page.fragments.filter(part => Math.abs(part.y - name.y) < 2).map(part => part.x + part.width))
      const shift = name.y - suffix.y
      Object.assign(suffix, { x: lineEnd + 3, y: name.y, top: suffix.top + shift, bottom: suffix.bottom + shift })
    },
  })
}
