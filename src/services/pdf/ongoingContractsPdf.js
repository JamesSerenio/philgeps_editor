import { hasReferenceNumber } from '../../lib/referenceNumber'
import { getTemplatePath, fetchAsset } from '../../lib/bidderAssets'
import { getOngoingContractEntries } from '../../lib/ongoingContracts'
import { PDFDocument, rgb } from 'pdf-lib'
import { embedBookmanFonts } from './bookmanFont'
import { formatLongDate } from '../../lib/documentSetup'
import { clean, wrapText } from './pdfHelpers'

export async function generateOngoingContractsPreview(project) {
  const response = await fetchAsset(getTemplatePath("Statement of Ongoing Government and Private Contracts,.pdf", project))

  if (!response.ok) {
    throw new Error(
      'Unable to load Statement of Ongoing Government and Private Contracts,.pdf',
    )
  }

  const sourceBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(sourceBytes)

  if (pdfDoc.getPageCount() === 0) {
    throw new Error(
      'Ongoing Contracts template contains no pages.',
    )
  }

  const dimensions = pdfDoc.getPage(0).getSize()
  pdfDoc.removePage(0)
  let page = pdfDoc.insertPage(0, [dimensions.width, dimensions.height])
  const { regular, bold } = await embedBookmanFonts(pdfDoc)

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)

  const procuringEntity = clean(project?.procuringEntity).toUpperCase()
  const projectTitle = clean(project?.projectTitle).toUpperCase()
  const referenceNumber = clean(project?.referenceNumber)
  const bidderName = clean(project?.bidderName).toUpperCase()
  const businessAddress = clean(project?.businessAddress).toUpperCase()
  const submittedBy = clean(project?.submittedBy).toUpperCase()
  const designation = clean(project?.designation)
  const date = formatLongDate(project?.date)

  function text(value, x, y, size = 10, font = regular) {
    size = 10
    if (!clean(value)) return
    page.drawText(clean(value), {
      x,
      y,
      size,
      font,
      color: black,
    })
  }

  function wrapped(
    value,
    x,
    y,
    width,
    size = 10,
    font = bold,
    lineHeight = 12,
  ) {
    size = 10
    const lines = wrapText(value, font, size, width)

    lines.forEach((line, index) => {
      page.drawText(line, {
        x,
        y: y - index * lineHeight,
        size,
        font,
        color: black,
      })
    })
  }

  const governmentEntries = getOngoingContractEntries(project, 'government')
  const privateEntries = getOngoingContractEntries(project, 'private')
  const contractRows = [
    ...governmentEntries.map(entry => ({ type: 'GOVERNMENT', entry })),
    ...privateEntries.map(entry => ({ type: 'PRIVATE', entry })),
  ].slice(0, 5)
  const cellEdges = [139.83, 243.73, 346.43, 449.3, 551.85, 656.28, 759.88]
  const cellSize = 10
  const cellLeading = 12
  // Respect explicit newlines and split long unbroken text at cell boundaries.
  function cellLines(value, width) {
    const lines = []
    for (const paragraph of String(value ?? '').trim().split(/\r?\n/)) {
      let current = ''
      for (const character of paragraph) {
        const candidate = current + character
        if (regular.widthOfTextAtSize(candidate, cellSize) > width && current) {
          const space = current.lastIndexOf(' ')
          if (space > 0) {
            lines.push(current.slice(0, space))
            current = current.slice(space + 1) + character
          } else { lines.push(current); current = character }
        } else current = candidate
      }
      lines.push(current.trim())
    }
    return lines.length ? lines : ['']
  }
  const preparedRows = contractRows.flatMap(({ type, entry }) => {
    const fields = [entry.ownerDetails, entry.natureOfWork, entry.description, entry.percentage, entry.awardCompletion, entry.dates]
    const cells = fields.map((value, index) => cellLines(value, cellEdges[index + 1] - cellEdges[index] - 10))
    const count = Math.max(...cells.map(lines => lines.length))
    const chunks = []
    // A long contract can continue on another page without shrinking its text.
    const maxLines = Math.max(1, Math.floor((page.getHeight() - 152 - 146 - 8) / cellLeading))
    for (let offset = 0; offset < count; offset += maxLines) {
      const lines = cells.map(cell => cell.slice(offset, offset + maxLines))
      chunks.push({ type, cells: lines, height: Math.max(22, Math.max(...lines.map(cell => cell.length)) * cellLeading + 8) })
    }
    return chunks
  })

  function drawOngoingRows(rows, tableTop = 255.25, showHeader = true) {
    const pageHeight = page.getHeight()
    const labelLeft = 35.25
    const edges = cellEdges
    const startTop = tableTop + (showHeader ? 112 : 0)
    // Preserve the official a./b./c. header arrangement while redrawing it
    // as a single clean grid (instead of inheriting the uneven template).
    const headerRows = [28, 34, 34, 16]
    const headerTopHeight = headerRows[0]
    const tableRight = edges[edges.length - 1]
    const tableBottom = startTop + rows.reduce((sum, row) => sum + row.height, 0)

    const drawHeaderText = (lines, left, right, top, height, size = 10, font = regular) => {
      size = 10
      const textLines = lines.filter(Boolean).flatMap(line => wrapText(line, font, size, right - left - 8))
      const lineHeight = size + 2
      const totalHeight = textLines.length * lineHeight
      textLines.forEach((line, index) => {
        const fitted = size
        const width = font.widthOfTextAtSize(line, fitted)
        page.drawText(line, {
          x: left + Math.max(4, (right - left - width) / 2),
          y: pageHeight - top - (height - totalHeight) / 2 - index * lineHeight - fitted,
          size: fitted,
          font,
          color: black,
        })
      })
    }

    // Replace the template grid as one clean, consistent table. This avoids
    // inheriting its uneven lines when more than one contract is added.
    page.drawRectangle({
      x: labelLeft,
      y: pageHeight - (tableTop === 255.25 ? Math.max(400.25, tableBottom) : tableBottom),
      width: tableRight - labelLeft,
      height: (tableTop === 255.25 ? Math.max(400.25, tableBottom) : tableBottom) - tableTop,
      color: white,
    })

    page.drawRectangle({
      x: labelLeft,
      y: pageHeight - tableBottom,
      width: tableRight - labelLeft,
      height: tableBottom - tableTop,
      borderColor: black,
      borderWidth: 0.7,
    })

    const allEdges = [labelLeft, ...edges]
    allEdges.slice(1, -1).forEach((x, index) => {
      // Description and percentage share the Bidder's Role heading.
      const startsBelowRoleHeading = showHeader && index === 3
      page.drawLine({
        start: { x, y: pageHeight - (startsBelowRoleHeading ? tableTop + headerTopHeight : tableTop) },
        end: { x, y: pageHeight - tableBottom },
        color: black,
        thickness: 0.7,
      })
    })

    const drawPartialRule = (top, from, to) => showHeader && page.drawLine({
      start: { x: from, y: pageHeight - top },
      end: { x: to, y: pageHeight - top },
      color: black,
      thickness: 0.7,
    })

    // Header-only lines: Name/Nature stay merged; Owner, Amount and Date
    // keep their required a., b., c. sub-fields.
    const secondTop = tableTop + headerRows[0]
    const ownerBoxHeight = (startTop - tableTop) / 3
    const amountBoxHeight = (startTop - tableTop) / 2
    drawPartialRule(secondTop, edges[2], edges[4])
    drawPartialRule(tableTop + ownerBoxHeight, edges[0], edges[1])
    drawPartialRule(tableTop + amountBoxHeight, edges[4], edges[5])
    drawPartialRule(tableTop + ownerBoxHeight, edges[5], edges[6])
    drawPartialRule(tableTop + ownerBoxHeight * 2, edges[0], edges[1])
    drawPartialRule(tableTop + ownerBoxHeight * 2, edges[5], edges[6])
    let ruleTop = startTop
    rows.forEach(row => {
      const top = ruleTop
      page.drawLine({
        start: { x: labelLeft, y: pageHeight - top },
        end: { x: tableRight, y: pageHeight - top },
        color: black,
        thickness: 0.7,
      })
      ruleTop += row.height
    })

    if (showHeader) {
    drawHeaderText(['Name of Contract'], labelLeft, edges[0], tableTop, startTop - tableTop, 10.5, bold)
    drawHeaderText(["a. Owner's Name"], edges[0], edges[1], tableTop, ownerBoxHeight, 9.5)
    drawHeaderText(['b. Address', 'Telephone'], edges[0], edges[1], tableTop + ownerBoxHeight, ownerBoxHeight, 9.5)
    drawHeaderText(['c. Number'], edges[0], edges[1], tableTop + ownerBoxHeight * 2, ownerBoxHeight, 9.25)
    drawHeaderText(['Nature of Work'], edges[1], edges[2], tableTop, startTop - tableTop, 10.5)
    drawHeaderText(["Bidder's Role"], edges[2], edges[4], tableTop, headerTopHeight, 10.5, bold)
    drawHeaderText(['Description'], edges[2], edges[3], secondTop, startTop - secondTop, 10)
    drawHeaderText(['%'], edges[3], edges[4], secondTop, startTop - secondTop, 10.5)
    drawHeaderText(['a. Amount of', 'Award'], edges[4], edges[5], tableTop, amountBoxHeight, 9.5)
    drawHeaderText(['b. Completion', 'Duration'], edges[4], edges[5], tableTop + amountBoxHeight, amountBoxHeight, 9.5)
    drawHeaderText(['a. Date Awarded'], edges[5], edges[6], tableTop, ownerBoxHeight, 9.25)
    drawHeaderText(['b. Contract', 'Effectivity'], edges[5], edges[6], tableTop + ownerBoxHeight, ownerBoxHeight, 9.25)
    drawHeaderText(['c. Date Completed'], edges[5], edges[6], tableTop + ownerBoxHeight * 2, ownerBoxHeight, 8.75)
    }

    let rowTop = startTop
    rows.forEach(({ type, cells, height: rowHeight }) => {

      drawHeaderText([type], labelLeft, edges[0], rowTop, rowHeight, 8.5, bold)

      for (let index = 0; index < 6; index += 1) {
        const cellWidth = edges[index + 1] - edges[index]
        const lines = cells[index]
        lines.forEach((value, lineIndex) => {
        const textWidth = regular.widthOfTextAtSize(value, cellSize)
        page.drawText(value, {
          x: Math.max(edges[index] + 4, edges[index] + (cellWidth - textWidth) / 2),
          y: pageHeight - rowTop - (rowHeight - lines.length * cellLeading) / 2 - cellSize - lineIndex * cellLeading,
          size: cellSize,
          font: regular,
          color: black,
        })
        })
      }
      rowTop += rowHeight
    })
    return tableBottom
  }

  // ==========================================================
  // CLEAR THE ORIGINAL TEMPLATE FIELDS. The table itself is replaced below
  // with the same clean grid used for every editable government/private row.
  // ==========================================================

  // top info
  page.drawRectangle({
    x: 28,
    y: 482,
    width: 785,
    height: 92,
    color: white,
  })

  // bidder info
  page.drawRectangle({
    x: 55,
    y: 348,
    width: 745,
    height: 76,
    color: white,
  })

  // footer info
  page.drawRectangle({
    x: 28,
    y: 8,
    width: 485,
    height: 174,
    color: white,
  })

  // ==========================================================
  // TOP PROJECT INFO - BIGGER
  // ==========================================================

  const topLabelX = 42
  const topColonX = 275
  const topValueX = 300

  // Fit the complete header above the unchanged statement heading. Long
  // project titles move the reference row down rather than drawing over it.
  const headerWidth = page.getWidth() - topValueX - 36
  const headerLayout = size => {
    const lineHeight = size * 1.15
    const entity = wrapText(procuringEntity, bold, size, headerWidth)
    const title = wrapText(projectTitle, bold, size, headerWidth)
    const reference = wrapText(referenceNumber, bold, size, headerWidth)
    const titleTop = 34 + Math.max(22, entity.length * lineHeight + 6)
    const referenceTop = titleTop + Math.max(24, title.length * lineHeight + 3)
    return { lineHeight, rows: [
      { label: 'NAME OF THE PROCURING ENTITY', top: 34, lines: entity },
      { label: 'PROJECT TITLE', top: titleTop, lines: title },
      { label: 'REFERENCE NUMBER', top: referenceTop, lines: reference },
    ], bottom: hasReferenceNumber(referenceNumber)
      ? referenceTop + Math.max(0, reference.length - 1) * lineHeight
      : titleTop + Math.max(0, title.length - 1) * lineHeight }
  }
  const headerSize = 10
  let header = headerLayout(headerSize)
  if (header.bottom > 108 || header.rows.some(row => row.lines.some(line => bold.widthOfTextAtSize(line, headerSize) > headerWidth))) {
    throw new Error('Ongoing Contracts: project information is too long to fit above the statement heading.')
  }
  for (const row of header.rows.filter(row => row.label !== 'REFERENCE NUMBER' || hasReferenceNumber(referenceNumber))) {
    const y = page.getHeight() - row.top
    text(row.label, topLabelX, y, 11.5, regular)
    text(':', topColonX, y, 11.5, regular)
    row.lines.forEach((line, index) => text(line, topValueX, y - index * header.lineHeight, headerSize, bold))
  }
  const omittedReferenceSpace = hasReferenceNumber(referenceNumber) ? 0 : Math.max(0, 130 - (header.bottom + 26))
  for (const [index, title] of [
    'STATEMENT OF ALL ITS ONGOING GOVERNMENT & PRIVATE CONTRACTS INCLUDING CONTRACTS',
    'AWARDED BUT NOT YET STARTED',
  ].entries()) {
    const width = bold.widthOfTextAtSize(title, 10)
    const x = (page.getWidth() - width) / 2
    const y = page.getHeight() - 130 + omittedReferenceSpace - index * 13
    text(title, x, y, 10, bold)
    page.drawLine({ start: { x, y: y - 1.5 }, end: { x: x + width, y: y - 1.5 }, thickness: 0.5, color: black })
  }

  // ==========================================================
  // BIDDER INFO - BIGGER
  // ==========================================================

  const bidderLabelX = 68
  const bidderColonX = 365
  const bidderValueX = 392

  text('REGISTERED BUSINESS NAME OF BIDDER', bidderLabelX, 400 + omittedReferenceSpace, 11, regular)
  text(':', bidderColonX, 400 + omittedReferenceSpace, 11, regular)
  wrapped(bidderName, bidderValueX, 400 + omittedReferenceSpace, 380, 11, bold, 13)

  text('BUSINESS ADDRESS', bidderLabelX, 373 + omittedReferenceSpace, 11, regular)
  text(':', bidderColonX, 373 + omittedReferenceSpace, 11, regular)
  wrapped(businessAddress, bidderValueX, 373 + omittedReferenceSpace, 380, 11, bold, 13)

  let tableTop = 255.25 - omittedReferenceSpace
  let remaining = [...preparedRows]
  let tableBottom
  let showHeader = true
  while (remaining.length) {
    const bodyTop = tableTop + (showHeader ? 112 : 0)
    const capacity = page.getHeight() - bodyTop - 35
    // Fill the available page instead of moving a long contract wholesale.
    if (remaining[0].height > capacity) {
      const original = remaining.shift()
      const count = Math.max(1, Math.floor((capacity - 8) / cellLeading))
      const first = original.cells.map(lines => lines.slice(0, count))
      const rest = original.cells.map(lines => lines.slice(count))
      remaining.unshift(
        { ...original, cells: first, height: Math.max(22, Math.max(...first.map(lines => lines.length)) * cellLeading + 8) },
        { ...original, cells: rest, height: Math.max(22, Math.max(...rest.map(lines => lines.length)) * cellLeading + 8) },
      )
    }
    let height = 0
    const rows = []
    while (remaining.length && height + remaining[0].height <= capacity) {
      const row = remaining.shift()
      rows.push(row)
      height += row.height
    }
    tableBottom = drawOngoingRows(rows, tableTop, showHeader)
    if (remaining.length) {
      page = pdfDoc.addPage([page.getWidth(), page.getHeight()])
      tableTop = 40
      showHeader = false
    }
  }
  if (page.getHeight() - tableBottom < 133) {
    page = pdfDoc.addPage([page.getWidth(), page.getHeight()])
    tableBottom = 40
  }
  const footerOffset = 157 - (page.getHeight() - tableBottom - 30)

  // ==========================================================
  // FOOTER INFO - BIGGER
  // ==========================================================

  const footerLabelX = 36
  const footerColonX = 126
  const footerValueX = 154

  text('Submitted by', footerLabelX, 157 - footerOffset, 10.5, regular)
  text(':', footerColonX, 157 - footerOffset, 10.5, regular)
  text(submittedBy, footerValueX, 157 - footerOffset, 10.5, bold)

  const submittedWidth = bold.widthOfTextAtSize(submittedBy, 10)
  page.drawLine({
    start: { x: footerValueX, y: 155 - footerOffset },
    end: { x: footerValueX + submittedWidth, y: 155 - footerOffset },
    thickness: 0.6,
    color: black,
  })

  text('(Printed Name & Signature)', footerValueX, 142 - footerOffset, 8, regular)

  text('Designation', footerLabelX, 119 - footerOffset, 10.5, regular)
  text(':', footerColonX, 119 - footerOffset, 10.5, regular)
  text(designation, footerValueX, 119 - footerOffset, 10.5, regular)

  text('Name of Firm', footerLabelX, 99 - footerOffset, 10.5, regular)
  text(':', footerColonX, 99 - footerOffset, 10.5, regular)
  text(bidderName, footerValueX, 99 - footerOffset, 10.5, bold)

  text('Date', footerLabelX, 79 - footerOffset, 10.5, regular)
  text(':', footerColonX, 79 - footerOffset, 10.5, regular)
  text(date, footerValueX, 79 - footerOffset, 10.5, regular)

  const bytes = await pdfDoc.save()
  const blob = new Blob([bytes], {
    type: 'application/pdf',
  })

  return URL.createObjectURL(blob)
}
