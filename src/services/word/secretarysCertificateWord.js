import { templateWord } from './templateWord'

// Native secretarysCertificate layout comes from the current generated PDF, including saved variant/data.
export function secretarysCertificateWord(options) {
  return templateWord(options, 19, { tables: false, headerRows: 0 })
}
