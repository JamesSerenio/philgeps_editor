import { getBidderLogo, letterheadLogoLayout } from '../../lib/bidderAssets'
import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'
import {
  generateAfterSalesPreview,
  serviceYearsText,
} from '../pdf/afterSalesPdf'

// Use the actual generated certificate to preserve its text, styles, and positions.
// Only the original logo is an image; all certificate content remains editable.
export async function afterSalesWord(options = {}) {
  const setup = options.setup ?? {}
  const procuring =
    setup.procuringEntity ||
    [setup.municipality, setup.province].filter(Boolean).join(', ')
  if (
    ![
      setup.bidderName,
      procuring,
      setup.projectTitle,
      setup.submittedBy || setup.authorizedRepresentative,
    ].every((value) => String(value ?? '').trim())
  ) {
    throw new Error(
      'After Sales: complete Bidder Name, Procuring Entity, Project Title and Submitted By.',
    )
  }
  serviceYearsText(setup.servicePeriodYears ?? 1)
  const logo = await getBidderLogo(setup)
  const layout = letterheadLogoLayout(logo, { x: 27, top: 26, width: 108, height: 84 })
  const document = options.document ?? {
    name: 'After Sales.pdf',
    generate: () => generateAfterSalesPreview(setup),
  }
  return templateWord({ ...options, document }, 17, {
    tables: false,
    paragraphStyle(line) {
      return Math.round(Math.max(...line.parts.map(part => part.size)) * 2) === 26 ? 'AfterSalesBody' : 'AfterSales'
    },
    preparePage(page) {
      // Ignore erased template underlines; retain only visible PDF rules.
      page.fragments.forEach(part => {
        part.underline = page.lines.some(rule => Math.abs(rule.y1-rule.y2)<.1 && rule.y1>=part.y && rule.y1<=part.y+3 && rule.x1<=part.x+2 && rule.x2>=part.x+part.width-2)
      })
    },
    exactLineSpacing: true,
    positionedGaps: true,
    rightAllowance: 10,
    pageChildren(page, index) {
      if (index !== 0) return []
      return [
        new Paragraph({
          style: 'AfterSalesLogo',
          spacing: {
            before: 0,
            after: 0,
            line: 1,
            lineRule: LineRuleType.EXACT,
          },
          children: [
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
                name: 'After-Sales letterhead logo',
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
