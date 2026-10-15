import { ImageRun, Paragraph, TextWrappingType, LineRuleType } from 'docx'
import { templateWord } from './templateWord'

export async function manpowerWord(options) {
  const response = await fetch('/images/manpower-letterhead-logo.png')
  if (!response.ok)
    throw new Error('Unable to load the original Manpower letterhead logo.')
  const logo = new Uint8Array(await response.arrayBuffer())
  return templateWord(options, 14, {
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
              type: 'png',
              data: logo,
              transformation: {
                width: (106.77 * 96) / 72,
                height: (83.479 * 96) / 72,
              },
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
                title: 'Mikata letterhead logo',
                description: 'Original logo from the Manpower Requirements PDF',
              },
            }),
          ],
        }),
      ]
    },
  })
}
