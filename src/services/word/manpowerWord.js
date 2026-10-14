import { templateWord } from './templateWord'

// Native manpower layout comes from the current generated PDF, including saved variant/data.
export function manpowerWord(options) {
  return templateWord(options, 14, { tables: true, headerRows: 1 })
}
