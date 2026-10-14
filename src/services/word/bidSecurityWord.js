import { templateWord } from './templateWord'

// Native bidSecurity layout comes from the current generated PDF, including saved variant/data.
export function bidSecurityWord(options) {
  return templateWord(options, 12, { tables: true, headerRows: 1 })
}
