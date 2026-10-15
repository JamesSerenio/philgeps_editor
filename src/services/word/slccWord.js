import { templateWord } from './templateWord'

// Native slcc layout comes from the current generated PDF, including saved variant/data.
export function slccWord(options) {
  return templateWord(options, 8, { tables: true, headerRows: 2 })
}
