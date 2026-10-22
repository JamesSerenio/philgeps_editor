import { StandardFonts, rgb } from 'pdf-lib'

// Only the selected Manotech profile supplies private financial/staff data.
export async function fillManotechTable(document, setup, kind) {
  const companyName = setup.bidderName || 'MANOTECH'
  const page = document.getPage(0), height = page.getHeight()
  const font = await document.embedFont(StandardFonts.Helvetica)
  const ink = rgb(0, 0, 0), white = rgb(1, 1, 1)
  const text = (value, x, top, width, size = 10) => {
    const line = String(value ?? '').replace(/[\r\n]+/g, ' ').trim()
    while (size > 5 && font.widthOfTextAtSize(line, size) > width) size -= .2
    if (line) page.drawText(line, { x, y: height - top, size, font, color: ink })
  }
  if (kind === 'nfcc') {
    // Clear the old grid completely, then draw one uniform table.
    page.drawRectangle({ x: 53.5, y: 287.8, width: 469, height: 152, color: white })
    const bold = await document.embedFont(StandardFonts.HelveticaBold)
    const boldItalic = await document.embedFont(StandardFonts.HelveticaBoldOblique)
    for (const y of [438.67, 424.39, 403.99, 383.59, 363.19, 342.77, 288.77]) {
      page.drawLine({ start: { x: 54.48, y }, end: { x: 521.38, y }, thickness: .6, color: ink })
    }
    for (const x of [54.48, 300.77, 521.38]) {
      page.drawLine({ start: { x, y: 288.77 }, end: { x, y: 438.67 }, thickness: .6, color: ink })
    }
    const label = (value, x, y, size = 9.96, face = bold) => page.drawText(value, { x, y, size, font: face, color: ink })
    label('Net Financial Contracting Capacity', 60.024, 429.07)
    label('Amount', 392.23, 429.07)
    ;['Current Assets', 'Current Liabilities', 'Net Working Capital (6)', 'Multiply by 15'].forEach((value, index) => label(value, 60.024, [414.79, 394.37, 373.97, 353.57][index]))
    ;['Less: Value of all outstanding and uncompleted', 'portions of sub-projects under on-going contracts',
      'including awarded contracts to be started', 'coinciding with contract to be bid'].forEach((value, index) => label(value, 60.024, 333.17 - index * 12.44, 9.5, boldItalic))
    const amounts = ['currentAssets', 'currentLiabilities', 'outstandingContracts'].map(key => {
      const raw = String(setup.financials?.[key] ?? '').trim()
      if (!raw) return null
      const amount = Number(raw.replace(/,/g, ''))
      if (!Number.isFinite(amount) || amount < 0) throw new Error(companyName + ' NFCC: enter valid non-negative amounts.')
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
    // Remove partial rules and redraw the complete table with consistent ink.
    page.drawRectangle({ x: 77.8, y: height - 448, width: 474.5, height: 173.8, color: white })
    const tableFont = await document.embedFont(StandardFonts.TimesRoman)
    const tableBold = await document.embedFont(StandardFonts.TimesRomanBold)
    for (const top of [275.28, 303.7, 332.4, 361.2, 389.8, 418.5, 447.1]) {
      page.drawLine({ start: { x: 78.78, y: height - top }, end: { x: 551.25, y: height - top }, thickness: .6, color: ink })
    }
    for (const x of [78.78, 116.77, 339.6, 551.25]) {
      page.drawLine({ start: { x, y: height - 275.28 }, end: { x, y: height - 447.1 }, thickness: .6, color: ink })
    }
    ;[['Item', 84.425], ['Name', 211.33], ['Position', 421.88]].forEach(([value, x]) =>
      page.drawText(value, { x, y: height - 299.45, size: 14, font: tableBold, color: ink }))
    ;[328.05, 356.75, 385.55, 414.15, 442.85].forEach((top, index) =>
      page.drawText(String(index + 1), { x: 94.725, y: height - top, size: 14, font: tableFont, color: ink }))
    const people = String(setup.manpower ?? '').split('\n').filter(line => line.trim())
    if (people.length > 5) throw new Error(companyName + ' manpower supports up to five people.')
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
