import { templateWord } from './templateWord'

// Native slcc layout comes from the current generated PDF, including saved variant/data.
export function slccWord(options) {
  return templateWord(options, 8, { tables: true, headerRows: 2,
    preparePage(page) { page.fragments.forEach(part => { part.font = 'Bookman Old Style'; part.size = 10 }) },
  })
}
