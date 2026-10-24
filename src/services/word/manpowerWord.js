import { getBidderLogo, letterheadLogoLayout } from '../../lib/bidderAssets'
import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'
import { manotechLetterheadRule, prepareMegaPlutoHeader } from './manotechLetterhead'

export async function manpowerWord(options) {
  const logo = await getBidderLogo(options.setup)
  const layout = letterheadLogoLayout(logo, { x: 36.25, top: 64.001, width: 106.77, height: 83.479 })
  return templateWord(options, 15, {
    preparePage: page => prepareMegaPlutoHeader(page, logo),
    tables: true,
    headerRows: 1,
    paragraphStyle: 'Manpower',
    exactLineSpacing: true,
    positionedGaps: true,
    tableExactGeometry: true,
    rightAllowance: 10,
    pageChildren(page, index) {
      if (index !== 0) return []
      return [
        new Paragraph({
          style: logo.companyId === 'mega-pluto' ? 'MegaPlutoLogo' : 'ManpowerLogo',
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
                name: 'Manpower letterhead logo',
                title: 'Company letterhead logo',
                description: 'Original logo from the Manpower Requirements PDF',
              },
            }),
          ],
        }),
      ]
    },
  })
}
