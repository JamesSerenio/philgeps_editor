import { generateSecretaryCertificatePreview } from '../pdf/secretarysCertificatePdf'
import { templateWord } from './templateWord'

export function secretarysCertificateWord(options = {}) {
  const document = options.document ?? {
    name: 'SECRETARYS_CERTIFICATE.pdf',
    generate: () => generateSecretaryCertificatePreview(options.setup),
  }
  return templateWord({ ...options, document }, 19, {
    tables: false,
    paragraphStyle: 'SecretarysCertificate',
    exactLineSpacing: true,
    positionedGaps: true,
    preserveBlankLines: true,
    rightAllowance: 20,
    preparePage(page) {
      // The PDF signature rule has no adjacent text on its baseline.
      // Keep it as editable underscores; blank-space underlines disappear in the preview.
      for (const rule of page.lines) {
        const width = rule.x2 - rule.x1
        if (Math.abs(rule.y1 - rule.y2) > 0.1 || width < 80) continue
        if (page.fragments.some(part => Math.abs(part.y - rule.y1) < 5)) continue
        const size = 10
        page.fragments.push({
          str: '_'.repeat(Math.round(width / (size * 0.5))),
          x: rule.x1, y: rule.y1 - 1,
          top: rule.y1 - 8, bottom: rule.y1 + 2,
          width, size, font: 'Times New Roman',
          bold: false, italics: false, underline: false, color: '000000',
        })
      }
    },
  })
}
