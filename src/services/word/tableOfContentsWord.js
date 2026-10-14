import { templateWord } from './templateWord'

// Native tableOfContents layout comes from the current generated PDF, including saved variant/data.
export function tableOfContentsWord(options) {
  return templateWord(options, 1, { tables: true, headerRows: 2 })
}
