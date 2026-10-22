import { StandardFonts, rgb } from 'pdf-lib'

// Only the selected Manotech profile supplies private financial/staff data.
export async function fillManotechTable(document, setup, kind) {
  const page = document.getPage(0), height = page.getHeight()
  const font = await document.embedFont(StandardFonts.Helvetica)
  const ink = rgb(0, 0, 0), white = rgb(1, 1, 1)
  const text = (value, x, top, width, size = 10) => {
    const line = String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
    while (size > 5 && font.widthOfTextAtSize(line, size) > width) size -= .2
    if (line) page.drawText(line, { x, y: height - top, size, font, color: ink })
  }
  if (kind === 'nfcc') {
    // Restore complete vectors without reusing Mikata amounts.
    for (const y of [438.67, 424.39, 403.99, 383.59, 363.19, 342.77, 288.77]) {
      page.drawLine({ start: { x: 54.48, y }, end: { x: 521.38, y }, thickness: .48, color: ink })
    }
    for (const x of [54.48, 300.77, 521.38]) {
      page.drawLine({ start: { x, y: 288.77 }, end: { x, y: 438.67 }, thickness: .48, color: ink })
    }
    const amounts = ['currentAssets', 'currentLiabilities', 'outstandingContracts'].map(key => {
      const raw = String(setup.financials?.[key] ?? '').trim()
      if (!raw) return null
      const amount = Number(raw.replace(/,/g, ''))
      if (!Number.isFinite(amount) || amount < 0) throw new Error('MANOTECH NFCC: enter valid non-negative amounts.')
      return amount
    })
    const [assets, liabilities, outstanding] = amounts
    const working = assets != null && liabilities != null ? assets - liabilities : null
    const rows = [assets, liabilities, working, working == null ? null : working * 15, outstanding]
    rows.forEach((amount, index) => {
      if (amount == null) return
      const value = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      const size = 15.96
      page.drawText(value, { x: 515.81 - font.widthOfTextAtSize(value, size), y: [409.15, 388.73, 368.33, 347.93, 320.57][index], size, font, color: ink })
    })
  }
  if (kind === 'manpower') {
    const people = String(setup.manpower ?? '').split('\n').filter(line => line.trim())
    if (people.length > 5) throw new Error('MANOTECH manpower supports up to five people.')
    people.forEach((person, index) => {
      const [name, position] = person.split('|')
      text(name, 142, 327 + index * 28.7, 205, 11)
      text(position, 365, 327 + index * 28.7, 170, 11)
    })
  }
  if (kind === 'ongoing') {
    for (const [row, type] of ['government', 'private'].entries()) {
      const saved = String(setup.ongoingEntries?.[type] ?? '').trim()
      if (!saved) continue
      const edges = [139.83, 243.73, 346.43, 449.3, 551.85, 656.28, 759.88]
      const top = [362.25, 378.75][row], bottom = [378.25, 394.85][row]
      for (let index = 0; index < 6; index++) page.drawRectangle({ x: edges[index] + .5, y: height - bottom + .5,
        width: edges[index + 1] - edges[index] - 1, height: bottom - top - 1, color: white })
      saved.split('|').slice(0, 6).forEach((cell, index) => text(cell, [145, 250, 355, 458, 557, 660][index], 376 + row * 16.5, 94, 8))
    }
  }
}
