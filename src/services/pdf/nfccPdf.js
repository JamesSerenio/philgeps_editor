
import {
  getTemplatePath,
  fetchAsset,
  getBidderCompany,
} from '../../lib/bidderAssets'

import { fillBuiltechTable } from './builtechDataPdf'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatLongDate } from '../../lib/documentSetup'
import { nfccDefaults } from '../../lib/nfccDefaults'
import { clean } from './pdfHelpers'

// ==========================================
// COMPUTED NFCC - FINAL TABLE ROW
// ==========================================

async function drawComputedNfccRow(pdfDoc, project) {
  const page = pdfDoc.getPage(0)

  const bold = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  )

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)

  const company = getBidderCompany(project)

  const financials = project?.financials ?? {}
  const nfcc = project?.nfcc ?? {}

  function readAmount(raw) {
    if (
      raw === null ||
      raw === undefined ||
      String(raw).trim() === ''
    ) {
      return null
    }

    const amount = Number(
      String(raw).replace(/,/g, '').trim()
    )

    return Number.isFinite(amount) && amount >= 0
      ? amount
      : null
  }

  // Preserve bidder-specific financial data.
  const fallback =
    company.id === 'mikata' ? nfccDefaults : {}

  const assets = readAmount(
    financials.currentAssets ??
    nfcc.currentAssets ??
    fallback.currentAssets
  )

  const liabilities = readAmount(
    financials.currentLiabilities ??
    nfcc.currentLiabilities ??
    fallback.currentLiabilities
  )

  const outstanding = readAmount(
    financials.outstandingContracts ??
    nfcc.outstandingContracts ??
    fallback.outstandingContracts
  )

  const rawMultiplier =
    company.id === 'mega-pluto'
      ? (
          financials.multiplier ??
          nfcc.multiplier ??
          project?.multiplier ??
          15
        )
      : 15

  const multiplier = Number(rawMultiplier)

  if (
    !Number.isFinite(multiplier) ||
    multiplier <= 0
  ) {
    throw new Error(
      'NFCC multiplier must be a positive number.'
    )
  }

  const computed =
    assets !== null &&
    liabilities !== null &&
    outstanding !== null
      ? (assets - liabilities) * multiplier - outstanding
      : null

  // ======================================
  // ORIGINAL NFCC TABLE COORDINATES
  // ======================================

  const left = 54.48
  const middle = 300.77
  const right = 521.38

  const top = 288.77
  const bottom = 268.37

  // ======================================
  // FIX: CLEAR ONLY THE FINAL TABLE ROW
  // ======================================
  // IMPORTANT:
  // Do not use x:18, y:120, height:167.
  // That rectangle removes the signature
  // details drawn beneath the NFCC table.

  page.drawRectangle({
    x: left,
    y: bottom,
    width: right - left,
    height: top - bottom,
    color: white,
  })

  // Horizontal table borders
  for (const y of [top, bottom]) {
    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.6,
      color: black,
    })
  }

  // Vertical table borders
  for (const x of [left, middle, right]) {
    page.drawLine({
      start: { x, y: bottom },
      end: { x, y: top },
      thickness: 0.6,
      color: black,
    })
  }

  // Computed NFCC label
  page.drawText('Computed NFCC', {
    x: 60.024,
    y: 274,
    size: 10,
    font: bold,
    color: black,
  })

  // Automatically calculated amount
  if (computed !== null) {
    const amount = computed.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    let size = 13

    while (
      size > 8 &&
      bold.widthOfTextAtSize(amount, size) >
        right - middle - 12
    ) {
      size -= 0.25
    }

    page.drawText(amount, {
      x:
        right -
        5.57 -
        bold.widthOfTextAtSize(amount, size),
      y: 273.2,
      size,
      font: bold,
      color: black,
    })
  }
}

// ==========================================
// GENERATE NFCC PDF
// ==========================================

export async function generateNfccPreview(project) {
  const response = await fetchAsset(
    getTemplatePath('NFCC_Template.pdf', project)
  )

  if (!response.ok) {
    throw new Error('Unable to load NFCC_Template.pdf')
  }

  const sourceBytes = await response.arrayBuffer()

  const pdfDoc = await PDFDocument.load(sourceBytes)

  if (!pdfDoc.getPageCount()) {
    throw new Error('NFCC_Template.pdf has no pages.')
  }

  const page = pdfDoc.getPage(0)

  // ======================================
  // FONTS
  // ======================================

  const regular = await pdfDoc.embedFont(
    StandardFonts.Helvetica
  )

  const bold = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold
  )

  const italic = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique
  )

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)
  const red = rgb(0.85, 0, 0)

  // ======================================
  // PROJECT INFORMATION
  // ======================================

  const procuringEntity = clean(
    project?.procuringEntity
  ).toUpperCase()

  const referenceNumber = clean(
    project?.referenceNumber
  )

  const projectTitle = clean(
    project?.projectTitle
  ).toUpperCase()

  const bidderName = clean(
    project?.bidderName
  ).toUpperCase()

  const businessAddress = clean(
    project?.businessAddress
  ).toUpperCase()

  const submittedBy = clean(
    project?.submittedBy
  ).toUpperCase()

  const designation = clean(
    project?.designation
  )

  const date = formatLongDate(
    project?.date
  )

  // ======================================
  // TEXT HELPERS
  // ======================================

  const headerText = []

  function drawText(
    value,
    x,
    y,
    size = 9,
    font = regular,
    color = black
  ) {
    const text = clean(value)

    if (!text) return

    const options = {
      x,
      y,
      size,
      font,
      color,
    }

    page.drawText(text, options)

    if (y >= 677) {
      headerText.push({
        text,
        options,
      })
    }
  }

  function fitFontSize(
    value,
    font,
    startSize,
    maxWidth,
    minSize = 6
  ) {
    let size = startSize
    const text = clean(value)

    if (!text) return size

    while (
      size > minSize &&
      font.widthOfTextAtSize(text, size) > maxWidth
    ) {
      size -= 0.15
    }

    return Math.max(size, minSize)
  }

  function drawFitText({
    value,
    x,
    y,
    width,
    size = 9,
    minSize = 6,
    font = regular,
    color = black,
  }) {
    const text = clean(value)

    if (!text) return

    const options = {
      x,
      y,
      size: fitFontSize(
        text,
        font,
        size,
        width,
        minSize
      ),
      font,
      color,
    }

    page.drawText(text, options)

    if (y >= 677) {
      headerText.push({
        text,
        options,
      })
    }
  }

  // ======================================
  // WRAP LONG HEADER VALUES
  // ======================================

  function wrapHeaderValue(value) {
    const lines = []
    let line = ''

    for (
      const word of String(value ?? '')
        .split(/\s+/)
        .filter(Boolean)
    ) {
      const next = line
        ? line + ' ' + word
        : word

      if (
        line &&
        bold.widthOfTextAtSize(next, 10.2) > 345
      ) {
        lines.push(line)
        line = ''
      }

      for (
        const character of (
          line ? ' ' : ''
        ) + word
      ) {
        if (
          line &&
          bold.widthOfTextAtSize(
            line + character,
            10.2
          ) > 345
        ) {
          lines.push(line)
          line = ''
        }

        line += character
      }
    }

    if (line) {
      lines.push(line)
    }

    return lines
  }

  // ======================================
  // CLEAR OLD HEADER
  // ======================================

  page.drawRectangle({
    x: 18,
    y: 675,
    width: 560,
    height: 100,
    color: white,
  })

  const labelX = 29
  const colonX = 203
  const valueX = 220

  const valueWidth = 345

  const labelSize = 9.4
  const valueSize = 10.2

  function drawHeaderRow(
    label,
    value,
    y,
    minSize = 7.4
  ) {
    drawText(
      label,
      labelX,
      y,
      labelSize,
      regular,
      black
    )

    drawText(
      ':',
      colonX,
      y,
      labelSize,
      regular,
      black
    )

    if (value !== null) {
      drawFitText({
        value,
        x: valueX,
        y,
        width: valueWidth,
        size: valueSize,
        minSize,
        font: bold,
        color: red,
      })
    }
  }

  // ======================================
  // HEADER INFORMATION
  // ======================================

  drawHeaderRow(
    'NAME OF THE PROCURING ENTITY',
    procuringEntity,
    760
  )

  drawHeaderRow(
    'PROJECT TITLE',
    null,
    741
  )

  const titleLines = wrapHeaderValue(projectTitle)

  drawHeaderRow(
    'REFERENCE NUMBER',
    referenceNumber,
    715,
    8
  )

  drawHeaderRow(
    'CONTRACTOR',
    bidderName,
    696
  )

  drawHeaderRow(
    'ADDRESS',
    null,
    677
  )

  const addressLines = wrapHeaderValue(
    businessAddress
  )

  // ======================================
  // CLEAR OLD SIGNATURE
  // ======================================
  // This clears the old footer and the
  // original final NFCC row.
  // Both will be redrawn below.

  page.drawRectangle({
    x: 18,
    y: 155,
    width: 560,
    height: 132,
    color: white,
  })

  // ======================================
  // SIGNATURE / FOOTER POSITION
  // ======================================

  const footerLabelX = 32
  const footerColonX = 128
  const footerValueX = 155

  const footerLabelSize = 10
  const footerValueSize = 10.3

  function drawFooterRow(
    label,
    value,
    y,
    {
      font = regular,
      boldName = false,
    } = {}
  ) {
    drawText(
      label,
      footerLabelX,
      y,
      footerLabelSize,
      regular,
      black
    )

    drawText(
      ':',
      footerColonX,
      y,
      footerLabelSize,
      regular,
      black
    )

    const size = fitFontSize(
      value,
      font,
      footerValueSize,
      300,
      8
    )

    drawText(
      value,
      footerValueX,
      y,
      size,
      font,
      black
    )

    if (boldName && value) {
      const width = font.widthOfTextAtSize(
        clean(value),
        size
      )

      page.drawLine({
        start: {
          x: footerValueX,
          y: y - 2,
        },
        end: {
          x: footerValueX + width,
          y: y - 2,
        },
        thickness: 0.7,
        color: black,
      })
    }
  }

  // ======================================
  // SIGNATURE DETAILS - LOWER POSITION
  // ======================================
  // These coordinates are BELOW the
  // Computed NFCC table row.
  //
  // Higher Y = higher on the PDF page.
  // Lower Y = lower on the PDF page.
  // ======================================

  // SUBMITTED BY
  drawFooterRow(
    'Submitted',
    submittedBy,
    226,
    {
      font: bold,
      boldName: true,
    }
  )

  // PRINTED NAME & SIGNATURE
  drawText(
    '(Printed Name & Signature)',
    footerValueX,
    214,
    6.3,
    regular,
    black
  )

  // DESIGNATION
  drawFooterRow(
    'Designation',
    designation,
    191,
    {
      font: italic,
    }
  )

  // NAME OF FIRM
  drawFooterRow(
    'Name of Firm',
    bidderName,
    168,
    {
      font: bold,
    }
  )

  // DATE
  drawFooterRow(
    'Date',
    date,
    145
  )

  // ======================================
  // COMPANY-SPECIFIC NFCC DATA
  // ======================================

  await fillBuiltechTable(
    pdfDoc,
    project,
    'nfcc'
  )

  // ======================================
  // RESTORE FINAL COMPUTED NFCC ROW
  // ======================================
  // The helper now clears ONLY the row,
  // not the whole signature section.

  await drawComputedNfccRow(
    pdfDoc,
    project
  )

  // ======================================
  // LONG HEADER HANDLING
  // ======================================

  const addressLeading = 14

  const titleExtraHeight = Math.max(
    0,
    titleLines.length - 1
  ) * addressLeading

  const extraHeight =
    titleExtraHeight +
    Math.max(
      0,
      addressLines.length - 1
    ) * addressLeading

  if (extraHeight) {
    // Keep original body, table,
    // and signature together.

    const bodyHeight = 668

    const bodyDocument = await PDFDocument.create()

    const [bodyPage] =
      await bodyDocument.copyPages(
        pdfDoc,
        [0]
      )

    bodyDocument.addPage(bodyPage)

    bodyPage.drawRectangle({
      x: 0,
      y: bodyHeight,
      width: page.getWidth(),
      height:
        page.getHeight() - bodyHeight,
      color: white,
    })

    const body = await pdfDoc.embedPage(
      bodyPage,
      {
        left: 0,
        bottom: 0,
        right: page.getWidth(),
        top: bodyHeight,
      }
    )

    await pdfDoc.flush()

    page.drawRectangle({
      x: 0,
      y: 0,
      width: page.getWidth(),
      height: bodyHeight,
      color: white,
    })

    if (extraHeight <= 120) {
      page.drawPage(body, {
        x: 0,
        y: -extraHeight,
        width: page.getWidth(),
        height: bodyHeight,
      })
    } else {
      const continuation =
        pdfDoc.addPage([
          page.getWidth(),
          page.getHeight(),
        ])

      continuation.drawPage(body, {
        x: 0,
        y:
          continuation.getHeight() -
          bodyHeight -
          36,
        width: page.getWidth(),
        height: bodyHeight,
      })
    }

    // ====================================
    // RESTORE HEADER AFTER BODY MOVEMENT
    // ====================================

    page.drawRectangle({
      x: 0,
      y: bodyHeight,
      width: page.getWidth(),
      height:
        page.getHeight() - bodyHeight,
      color: white,
    })

    const heading =
      'NET FINANCIAL CONTRACTING CAPACITY (NFCC)'

    page.drawText(heading, {
      x:
        (
          page.getWidth() -
          bold.widthOfTextAtSize(
            heading,
            12
          )
        ) / 2,
      y: page.getHeight() - 45,
      size: 12,
      font: bold,
      color: black,
    })

    page.drawLine({
      start: {
        x: 18,
        y: page.getHeight() - 49,
      },
      end: {
        x: page.getWidth() - 18,
        y: page.getHeight() - 49,
      },
      thickness: 1,
      color: black,
    })

    for (
      const {
        text,
        options,
      } of headerText
    ) {
      page.drawText(text, {
        ...options,
        y:
          options.y <= 715
            ? options.y -
              titleExtraHeight
            : options.y,
      })
    }
  }

  // ======================================
  // RESTORE PROJECT TITLE
  // ======================================

  titleLines.forEach(
    (line, index) =>
      drawText(
        line,
        valueX,
        741 -
          index * addressLeading,
        valueSize,
        bold,
        red
      )
  )

  // ======================================
  // RESTORE BUSINESS ADDRESS
  // ======================================

  addressLines.forEach(
    (line, index) =>
      drawText(
        line,
        valueX,
        677 -
          titleExtraHeight -
          index * addressLeading,
        valueSize,
        bold,
        red
      )
  )

  // ======================================
  // SAVE GENERATED PDF
  // ======================================

  const bytes = await pdfDoc.save()

  const blob = new Blob(
    [bytes],
    {
      type: 'application/pdf',
    }
  )

  return URL.createObjectURL(blob)
}
