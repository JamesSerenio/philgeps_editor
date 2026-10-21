import { StandardFonts, rgb } from 'pdf-lib'
import { getBidderCompany } from '../../lib/bidderAssets'
import { generateSlccPreview } from './slccPdf'
import { nfccDefaults } from '../../lib/nfccDefaults'

// Only applicant-entered Builtech data is placed in the cleared private tables.
// NFCC uses the requested Mikata starting amounts; staff stays blank when missing. Ongoing-contract NONE rows
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
    {
      const numbers = names.map(key => Number(String(String(finance[key] ?? '').trim() ? finance[key] : nfccDefaults[key]).replace(/,/g, '')))
      if (numbers.some(value => !Number.isFinite(value) || value < 0)) throw new Error('BUILTECH NFCC: enter valid non-negative financial amounts.')
      const [assets, liabilities, outstanding] = numbers
      const working = assets - liabilities
      const amounts = [assets, liabilities, working, working * 15, outstanding]
      // Rebuild the entire amount column so its borders and typography match
      // the reference, without seams where the template was redacted.
      const amountFont = await document.embedFont(StandardFonts.Helvetica)
      const headerFont = await document.embedFont(StandardFonts.HelveticaBold)
      page.drawRectangle({ x: 301.01, y: 288.53, width: 220.61, height: 150.38, color: rgb(1, 1, 1) })
      for (const y of [438.67, 424.39, 403.99, 383.59, 363.19, 342.77, 288.77]) {
        page.drawLine({ start: { x: 54.48, y }, end: { x: 521.38, y }, thickness: .7, color: rgb(0, 0, 0) })
      }
      for (const x of [54.48, 300.77, 521.38]) {
        page.drawLine({ start: { x, y: 288.77 }, end: { x, y: 438.67 }, thickness: .7, color: rgb(0, 0, 0) })
      }
      page.drawText('Amount', { x: 392.23, y: 429.07, size: 9.96, font: headerFont, color: rgb(0, 0, 0) })
      amounts.forEach((amount, index) => {
        const value = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        const size = 15.96
        page.drawText(value, { x: 515.81 - amountFont.widthOfTextAtSize(value, size), y: [409.15, 388.73, 368.33, 347.93, 320.57][index], size, font: amountFont, color: rgb(0, 0, 0) })
      })
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
