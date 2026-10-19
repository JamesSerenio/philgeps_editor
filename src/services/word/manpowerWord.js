import { getBidderLogo, fitBidderLogo } from '../../lib/bidderAssets'
import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'

export async function manpowerWord(options) {
  const logo = await getBidderLogo(options.setup)
  return templateWord(options, 15, {
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
          style: 'ManpowerLogo',
          spacing: {
            before: 0,
            after: 0,
            line: 1,
            lineRule: LineRuleType.EXACT,
          },
          children: [
            new ImageRun({
              type: logo.type, data: logo.data,
              transformation: fitBidderLogo(logo, (106.77 * 96) / 72, (83.479 * 96) / 72),
              floating: {
                horizontalPosition: {
                  relative: 'page',
                  offset: Math.round(36.25 * 12700),
                },
                verticalPosition: {
                  relative: 'page',
                  offset: Math.round(64.001 * 12700),
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
