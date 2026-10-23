import { getBidderLogo, letterheadLogoLayout } from '../../lib/bidderAssets'
import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'
import { manotechLetterheadRule } from './manotechLetterhead'
import {
  generateProductWarrantyPreview,
  formatWarrantyYears,
} from '../pdf/warrantyPdf'

// Use the actual generated certificate to preserve its text, styles, and positions.
// Only the original logo is an image; all certificate content remains editable.
export async function warrantyWord(options = {}) {
  const setup = options.setup ?? {}
  formatWarrantyYears(setup.productWarrantyYears ?? 2)
  const logo = await getBidderLogo(setup)
  const layout = letterheadLogoLayout(logo, { x: 25.5, top: 22.652, width: 110.24, height: 83.448 })
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
          style: logo.companyId === 'mega-pluto' ? 'MegaPlutoLogo' : 'WarrantyLogo',
          spacing: {
            before: 0,
            after: 0,
            line: 1,
            lineRule: LineRuleType.EXACT,
          },
          children: [
            ...manotechLetterheadRule(logo, layout),
            new ImageRun({
              type: logo.type, data: logo.data,
              transformation: { width: layout.width * 96 / 72, height: layout.height * 96 / 72 },
              floating: {
                horizontalPosition: {
                  relative: 'page',
                  offset: Math.round(layout.x * 12700),
                },
                verticalPosition: {
                  relative: 'page',
                  offset: Math.round(layout.top * 12700),
                },
                wrap: { type: TextWrappingType.NONE },
                allowOverlap: true,
              },
              altText: {
                name: 'Product Warranty letterhead logo',
                title: 'Company letterhead logo',
                description: 'Selected company logo used in the certificate PDF',
              },
            }),
          ],
        }),
      ]
    },
  })
}
