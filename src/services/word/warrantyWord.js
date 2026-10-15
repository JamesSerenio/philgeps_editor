import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'
import {
  generateProductWarrantyPreview,
  formatWarrantyYears,
} from '../pdf/warrantyPdf'

// Use the actual generated certificate to preserve its text, styles, and positions.
// Only the original logo is an image; all certificate content remains editable.
export async function warrantyWord(options = {}) {
  const setup = options.setup ?? {}
  formatWarrantyYears(setup.productWarrantyYears ?? 2)
  const isMikata = /mikata/i.test(setup.bidderName ?? '')
  const response = isMikata
    ? await fetch('/images/manpower-letterhead-logo.png')
    : null
  if (response && !response.ok)
    throw new Error('Unable to load the certificate letterhead logo.')
  const logo = response ? new Uint8Array(await response.arrayBuffer()) : null
  const document = options.document ?? {
    name: 'Warranty.pdf',
    generate: () => generateProductWarrantyPreview(setup),
  }
  return templateWord({ ...options, document }, 18, {
    tables: false,
    paragraphStyle(line) {
      return Math.round(
        Math.max(...line.parts.map((part) => part.size)) * 2,
      ) === 26
        ? 'WarrantyBody'
        : 'Warranty'
    },
    preparePage(page) {
      // Ignore erased template underlines; retain only visible PDF rules.
      page.fragments.forEach((part) => {
        part.underline = page.lines.some(
          (rule) =>
            Math.abs(rule.y1 - rule.y2) < 0.1 &&
            rule.y1 >= part.y &&
            rule.y1 <= part.y + 3 &&
            rule.x1 <= part.x + 2 &&
            rule.x2 >= part.x + part.width - 2,
        )
      })
    },
    exactLineSpacing: true,
    positionedGaps: true,
    rightAllowance: 10,
    pageChildren(page, index) {
      if (index !== 0 || !logo) return []
      return [
        new Paragraph({
          style: 'WarrantyLogo',
          spacing: {
            before: 0,
            after: 0,
            line: 1,
            lineRule: LineRuleType.EXACT,
          },
          children: [
            new ImageRun({
              type: 'png',
              data: logo,
              transformation: {
                width: (110.24 * 96) / 72,
                height: (83.448 * 96) / 72,
              },
              floating: {
                horizontalPosition: {
                  relative: 'page',
                  offset: Math.round(25.5 * 12700),
                },
                verticalPosition: {
                  relative: 'page',
                  offset: Math.round(22.652 * 12700),
                },
                wrap: { type: TextWrappingType.NONE },
                allowOverlap: true,
              },
              altText: {
                name: 'Product Warranty letterhead logo',
                title: 'Company letterhead logo',
                description: 'Original Mikata logo used in the certificate PDF',
              },
            }),
          ],
        }),
      ]
    },
  })
}
