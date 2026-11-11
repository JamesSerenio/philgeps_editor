import { getTemplatePath, fetchAsset } from '../../lib/bidderAssets'
import { getOngoingContractEntries } from '../../lib/ongoingContracts'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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

  const page = pdfDoc.getPage(0)

  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

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
  const footerOffset = Math.max(0, contractRows.length - 2) * 16.5

  function drawOngoingRows() {
    const pageHeight = page.getHeight()
    const labelLeft = 35.25
    const edges = [139.83, 243.73, 346.43, 449.3, 551.85, 656.28, 759.88]
    const rowHeight = 16.5
    const startTop = 367.25
    const tableTop = 255.25
    // Preserve the official a./b./c. header arrangement while redrawing it
    // as a single clean grid (instead of inheriting the uneven template).
    const headerRows = [28, 34, 34, 16]
    const headerTopHeight = headerRows[0]
    const tableRight = edges[edges.length - 1]
    const tableBottom = startTop + rowHeight * contractRows.length

    const drawHeaderText = (lines, left, right, top, height, size = 10, font = regular) => {
      const textLines = lines.filter(Boolean)
      const lineHeight = size + 2
      const totalHeight = textLines.length * lineHeight
      textLines.forEach((line, index) => {
        let fitted = size
        const available = right - left - 8
        while (fitted > 6 && font.widthOfTextAtSize(line, fitted) > available) fitted -= 0.25
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
      y: pageHeight - tableBottom,
      width: tableRight - labelLeft,
      height: tableBottom - tableTop,
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
      const startsBelowRoleHeading = index === 3
      page.drawLine({
        start: { x, y: pageHeight - (startsBelowRoleHeading ? tableTop + headerTopHeight : tableTop) },
        end: { x, y: pageHeight - tableBottom },
        color: black,
        thickness: 0.7,
      })
    })

    const drawPartialRule = (top, from, to) => page.drawLine({
      start: { x: from, y: pageHeight - top },
      end: { x: to, y: pageHeight - top },
      color: black,
      thickness: 0.7,
    })

    // Header-only lines: Name/Nature stay merged; Owner, Amount and Date
    // keep their required a., b., c. sub-fields.
    const secondTop = tableTop + headerRows[0]
    const thirdTop = secondTop + headerRows[1]
    const fourthTop = thirdTop + headerRows[2]
    drawPartialRule(secondTop, edges[0], edges[1])
    drawPartialRule(secondTop, edges[2], edges[4])
    drawPartialRule(thirdTop, edges[0], edges[1])
    drawPartialRule(thirdTop, edges[4], edges[5])
    drawPartialRule(thirdTop, edges[5], edges[6])
    drawPartialRule(fourthTop, edges[0], edges[1])
    drawPartialRule(fourthTop, edges[5], edges[6])
    contractRows.forEach((_, index) => {
      const top = startTop + index * rowHeight
      page.drawLine({
        start: { x: labelLeft, y: pageHeight - top },
        end: { x: tableRight, y: pageHeight - top },
        color: black,
        thickness: 0.7,
      })
    })

    drawHeaderText(['Name of Contract'], labelLeft, edges[0], tableTop, startTop - tableTop, 10.5, bold)
    drawHeaderText(["a. Owner's Name"], edges[0], edges[1], secondTop, headerRows[1], 9.5)
    drawHeaderText(['b. Address', 'Telephone'], edges[0], edges[1], thirdTop, headerRows[2], 9.5)
    drawHeaderText(['c. Number'], edges[0], edges[1], fourthTop, headerRows[3], 9.25)
    drawHeaderText(['Nature of Work'], edges[1], edges[2], tableTop, startTop - tableTop, 10.5)
    drawHeaderText(["Bidder's Role"], edges[2], edges[4], tableTop, headerTopHeight, 10.5, bold)
    drawHeaderText(['Description'], edges[2], edges[3], secondTop, startTop - secondTop, 10)
    drawHeaderText(['%'], edges[3], edges[4], secondTop, startTop - secondTop, 10.5)
    drawHeaderText(['a. Amount of', 'Award'], edges[4], edges[5], secondTop, headerRows[1], 9.5)
    drawHeaderText(['b. Completion', 'Duration'], edges[4], edges[5], thirdTop, headerRows[2], 9.5)
    drawHeaderText(['a. Date Awarded'], edges[5], edges[6], secondTop, headerRows[1], 9.25)
    drawHeaderText(['b. Contract', 'Effectivity'], edges[5], edges[6], thirdTop, headerRows[2], 9.25)
    drawHeaderText(['c. Date Completed'], edges[5], edges[6], fourthTop, headerRows[3], 8.75)

    contractRows.forEach(({ type, entry: values }, row) => {
      const cells = [values.ownerDetails, values.natureOfWork, values.description, values.percentage, values.awardCompletion, values.dates]
        .map(value => String(value ?? 'NONE').replace(/\s+/g, ' ').trim() || 'NONE')
      const rowTop = startTop + row * rowHeight
      const rowBottom = rowTop + rowHeight

      drawHeaderText([type], labelLeft, edges[0], rowTop, rowHeight, 8.5, bold)

      for (let index = 0; index < 6; index += 1) {
        const cellWidth = edges[index + 1] - edges[index]
        const cellHeight = rowBottom - rowTop
        const value = cells[index]
        const availableWidth = cellWidth - 8
        let size = 7.5
        while (size > 4.5 && regular.widthOfTextAtSize(value, size) > availableWidth) size -= 0.25
        const textWidth = regular.widthOfTextAtSize(value, size)
        page.drawText(value, {
          x: Math.max(edges[index] + 4, edges[index] + (cellWidth - textWidth) / 2),
          y: pageHeight - rowTop - (cellHeight + size) / 2 + 1,
          size,
          font: regular,
          color: black,
        })
      }
    })
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

  text('NAME OF THE PROCURING ENTITY', topLabelX, 550, 11.5, regular)
  text(':', topColonX, 550, 11.5, regular)
  wrapped(procuringEntity, topValueX, 550, 455, 11.5, bold, 13)

  text('PROJECT TITLE', topLabelX, 527, 11.5, regular)
  text(':', topColonX, 527, 11.5, regular)
  wrapped(projectTitle, topValueX, 527, 455, 11.5, bold, 13)

  text('REFERENCE NUMBER', topLabelX, 492, 11.5, regular)
  text(':', topColonX, 492, 11.5, regular)
  text(referenceNumber, topValueX, 492, 11.5, bold)

  // ==========================================================
  // BIDDER INFO - BIGGER
  // ==========================================================

  const bidderLabelX = 68
  const bidderColonX = 365
  const bidderValueX = 392

  text('REGISTERED BUSINESS NAME OF BIDDER', bidderLabelX, 400, 11, regular)
  text(':', bidderColonX, 400, 11, regular)
  wrapped(bidderName, bidderValueX, 400, 380, 11, bold, 13)

  text('BUSINESS ADDRESS', bidderLabelX, 373, 11, regular)
  text(':', bidderColonX, 373, 11, regular)
  wrapped(businessAddress, bidderValueX, 373, 380, 11, bold, 13)

  // ==========================================================
  // FOOTER INFO - BIGGER
  // ==========================================================

  const footerLabelX = 36
  const footerColonX = 126
  const footerValueX = 154

  text('Submitted by', footerLabelX, 157 - footerOffset, 10.5, regular)
  text(':', footerColonX, 157 - footerOffset, 10.5, regular)
  text(submittedBy, footerValueX, 157 - footerOffset, 10.5, bold)

  const submittedWidth = bold.widthOfTextAtSize(submittedBy, 10.5)
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

  drawOngoingRows()
  const bytes = await pdfDoc.save()
  const blob = new Blob([bytes], {
    type: 'application/pdf',
  })

  return URL.createObjectURL(blob)
}
