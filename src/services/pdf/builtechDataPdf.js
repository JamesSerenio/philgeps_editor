import { StandardFonts, rgb } from 'pdf-lib'
import { getBidderCompany } from '../../lib/bidderAssets'
import { generateSlccPreview } from './slccPdf'

// Only applicant-entered Builtech data is placed in the cleared private tables.
// Financial/staff values stay blank when missing. Ongoing-contract NONE rows
// retain the original template formatting; Mikata history is never used.
export async function fillBuiltechTable(document, setup, kind) {
  if (getBidderCompany(setup).id !== 'builtech') return
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
  if (kind === 'nfcc') {
    const finance = setup.financials ?? {}
    const names = ['currentAssets', 'currentLiabilities', 'outstandingContracts']
    if (names.every(key => String(finance[key] ?? '').trim())) {
      const numbers = names.map(key => Number(String(finance[key]).replace(/,/g, '')))
      if (numbers.some(value => !Number.isFinite(value) || value < 0)) throw new Error('BUILTECH NFCC: enter valid non-negative financial amounts.')
      const [assets, liabilities, outstanding] = numbers
      const working = assets - liabilities
      const amounts = [assets, liabilities, working, working * 15, outstanding, working * 15 - outstanding]
      amounts.forEach((amount, index) => text(amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 408, [431,451,472,492,520,567][index], 123, 12))
    }
  }
  if (kind === 'manpower') {
    const people = String(setup.manpower ?? '').split('\n').filter(line => line.trim())
    if (people.length > 5) throw new Error('BUILTECH manpower template supports five rows. Enter up to five names and positions.')
    people.forEach((person, index) => {
      const [name, position] = person.split('|')
      text(name, 142, 327 + index * 28.7, 205, 11)
      text(position, 365, 327 + index * 28.7, 170, 11)
    })
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
