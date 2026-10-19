import { getBidderLogo, fitBidderLogo } from '../../lib/bidderAssets'
import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'

export async function tabbingWord(options) {
  const logo = await getBidderLogo(options.setup)
  return templateWord(options, options.sectionNumber ?? 1, {
    tables: false,
    paragraphStyle: 'Tabbing',
    exactLineSpacing: true,
    positionedGaps: true,
    rightAllowance: 8,
    pageChildren() {
      return [new Paragraph({ style: 'TabbingLogo',
        spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
        children: [new ImageRun({ type: logo.type, data: logo.data,
          transformation: fitBidderLogo(logo, 104.19 * 96 / 72, 86.95 * 96 / 72),
          floating: {
            horizontalPosition: { relative: 'page', offset: Math.round(43.45 * 12700) },
            verticalPosition: { relative: 'page', offset: Math.round(25.8 * 12700) },
            wrap: { type: TextWrappingType.NONE }, allowOverlap: true,
          }, altText: { name: 'Tabbing letterhead logo', title: 'Company logo', description: 'Company letterhead logo' },
        })],
      })]
    },
  })
}
