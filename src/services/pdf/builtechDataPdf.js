import { StandardFonts, rgb } from 'pdf-lib'
import { getBidderCompany } from '../../lib/bidderAssets'
import { generateSlccPreview } from './slccPdf'
import { fillManotechTable } from './manotechDataPdf'

// Only applicant-entered Builtech data is placed in the cleared private tables.
// NFCC and manpower share Manotech's layout and saved-data behavior. Ongoing-contract NONE rows
// retain the original template formatting; Mikata history is never used.
export async function fillBuiltechTable(document, setup, kind) {
  if (['manotech', 'r-and-l'].includes(getBidderCompany(setup).id)) return fillManotechTable(document, setup, kind)
  if (getBidderCompany(setup).id !== 'builtech') return
  if (kind === 'nfcc' || kind === 'manpower') return fillManotechTable(document, setup, kind)
  const page = document.getPage(0), height = page.getHeight()
  const font = await document.embedFont(StandardFonts.TimesRoman)
  const text = (value, x, top, width, size = 10) => {
    const lines = String(value ?? '').replace(/[\r\n]+/g, ' ').trim().split('|')
    for (const [index, line] of lines.entries()) {
      let actual = size
      while (actual > 5 && font.widthOfTextAtSize(line.trim(), actual) > width) actual -= .2
      if (line.trim()) page.drawText(line.trim(), { x, y: height - top - index * (size + 1), size: actual, font, color: rgb(0, 0, 0) })
    }
  }
  if (kind === 'ongoing') {
    for (const [row, type] of ['government','private'].entries()) {
      const saved = String(setup.ongoingEntries?.[type] ?? '').trim()
      if (!saved) continue
      const cells = saved.split('|').slice(0,6)
      const positions = [145,250,355,458,557,660]
      const edges = [139.83,243.73,346.43,449.3,551.85,656.28,759.88]
      const rowTop = [362.25,378.75][row]
      const rowBottom = [378.25,394.85][row]
      for (let index = 0; index < 6; index++) page.drawRectangle({
        x: edges[index] + .5, y: height - rowBottom + .5,
        width: edges[index + 1] - edges[index] - 1, height: rowBottom - rowTop - 1,
        color: rgb(1,1,1),
      })
      cells.forEach((cell, index) =>
        text(cell, positions[index], 376 + row * 16.5, 94, 8))
    }
  }
}

export async function generateBuiltechSlccPreview(setup, variant) {
  return generateSlccPreview({ ...setup, slccVariant: variant })
}
