import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'

export async function tabbingWord(options) {
  const response = await fetch('/images/manpower-letterhead-logo.png')
  if (!response.ok) throw new Error('Unable to load the TABBING letterhead logo.')
  const logo = new Uint8Array(await response.arrayBuffer())
  return templateWord(options, options.sectionNumber ?? 1, {
    tables: false,
    paragraphStyle: 'Tabbing',
    exactLineSpacing: true,
    positionedGaps: true,
    rightAllowance: 8,
    pageChildren() {
      return [new Paragraph({ style: 'TabbingLogo',
        spacing: { before: 0, after: 0, line: 1, lineRule: LineRuleType.EXACT },
        children: [new ImageRun({ type: 'png', data: logo,
          transformation: { width: 104.19 * 96 / 72, height: 86.95 * 96 / 72 },
          floating: {
            horizontalPosition: { relative: 'page', offset: Math.round(43.45 * 12700) },
            verticalPosition: { relative: 'page', offset: Math.round(25.8 * 12700) },
            wrap: { type: TextWrappingType.NONE }, allowOverlap: true,
          }, altText: { name: 'Tabbing letterhead logo', title: 'Mikata logo', description: 'Company letterhead logo' },
        })],
      })]
    },
  })
}
