import { getBidderLogo, letterheadLogoLayout } from '../../lib/bidderAssets'
import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'
import { manotechLetterheadRule } from './manotechLetterhead'

export async function tabbingWord(options) {
  const logo = await getBidderLogo(options.setup)
  const layout = letterheadLogoLayout(logo, { x: 43.45, top: 25.8, width: 104.19, height: 86.95 })
  return templateWord(options, options.sectionNumber ?? 1, {
    tables: false,
    paragraphStyle: 'Tabbing',
    exactLineSpacing: true,
    positionedGaps: true,
    rightAllowance: 8,
    pageChildren() {
      return [new Paragraph({ style: logo.companyId === 'mega-pluto' ? 'MegaPlutoLogo' : 'TabbingLogo',
        spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
        children: [...manotechLetterheadRule(logo, layout), new ImageRun({ type: logo.type, data: logo.data,
          transformation: { width: layout.width * 96 / 72, height: layout.height * 96 / 72 },
          floating: {
            horizontalPosition: { relative: 'page', offset: Math.round(layout.x * 12700) },
            verticalPosition: { relative: 'page', offset: Math.round(layout.top * 12700) },
            wrap: { type: TextWrappingType.NONE }, allowOverlap: true,
          }, altText: { name: 'Tabbing letterhead logo', title: 'Company logo', description: 'Company letterhead logo' },
        })],
      })]
    },
  })
}
