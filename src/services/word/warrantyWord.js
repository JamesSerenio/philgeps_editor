import { templateWord } from './templateWord'

// Native warranty layout comes from the current generated PDF, including saved variant/data.
export function warrantyWord(options) {
  return templateWord(options, 17, { tables: false, headerRows: 0 })
}
