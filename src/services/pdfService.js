import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

import {
  pdfTemplates,
} from '../lib/pdfTemplates'

import {
  formatLongDate,
} from '../lib/documentSetup'

// ============================================================
// STATIC PREVIEW SOURCES
// ============================================================

const previewSources = {
  bidSecurity: pdfTemplates.bidSecurity,
  omnibus: pdfTemplates.initao,
  technical: pdfTemplates.reference,
  schedule: pdfTemplates.reference,
  manpower: pdfTemplates.reference,
  afterSales: pdfTemplates.reference,
  warranty: pdfTemplates.reference,
  bidForm: pdfTemplates.reference,
  priceSchedule: pdfTemplates.reference,
  summary: pdfTemplates.reference,
}

export function getDocumentPreview(documentId) {
  const src =
    previewSources[documentId] || null

  return {
    src,
    isReference:
      src === pdfTemplates.reference,
  }
}

// ============================================================
// HELPERS
// ============================================================

function clean(value) {
  return String(value ?? '').trim()
}

function titleCase(value) {
  return clean(value)
    .toLowerCase()
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    )
}

function wrapText(
  text,
  font,
  size,
  maxWidth,
) {
  const value = clean(text)

  if (!value) {
    return []
  }

  const words =
    value.split(/\s+/)

  const lines = []
  let current = ''

  for (const word of words) {
    const candidate =
      current
        ? `${current} ${word}`
        : word

    const width =
      font.widthOfTextAtSize(
        candidate,
        size,
      )

    if (
      width <= maxWidth ||
      !current
    ) {
      current = candidate
    } else {
      lines.push(current)
      current = word
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

function drawCentered(
  page,
  text,
  font,
  size,
  y,
) {
  const value = clean(text)

  if (!value) {
    return
  }

  const width =
    font.widthOfTextAtSize(
      value,
      size,
    )

  page.drawText(
    value,
    {
      x:
        (page.getWidth() -
          width) /
        2,
      y,
      size,
      font,
      color:
        rgb(0, 0, 0),
    },
  )
}

function drawWrappedText({
  page,
  text,
  font,
  size,
  x,
  y,
  maxWidth,
  lineHeight,
}) {
  const lines =
    wrapText(
      text,
      font,
      size,
      maxWidth,
    )

  lines.forEach(
    (line, index) => {
      page.drawText(
        line,
        {
          x,
          y:
            y -
            index *
              lineHeight,
          size,
          font,
          color:
            rgb(
              0,
              0,
              0,
            ),
        },
      )
    },
  )

  return lines.length
}

function drawHorizontalLine(
  page,
  x1,
  x2,
  y,
  thickness = 0.6,
) {
  page.drawLine({
    start: {
      x: x1,
      y,
    },
    end: {
      x: x2,
      y,
    },
    thickness,
    color:
      rgb(0, 0, 0),
  })
}

function drawVerticalLine(
  page,
  x,
  y1,
  y2,
  thickness = 0.6,
) {
  page.drawLine({
    start: {
      x,
      y: y1,
    },
    end: {
      x,
      y: y2,
    },
    thickness,
    color:
      rgb(0, 0, 0),
  })
}

// ============================================================
// TABLE OF CONTENTS ROW
// ============================================================

function drawTableRow({
  page,
  code,
  text,
  y,
  rowHeight,
  codeX,
  dividerX,
  rightX,
  font,
  boldFont,
  bullet = false,
}) {
  drawHorizontalLine(
    page,
    codeX,
    rightX,
    y,
  )

  drawVerticalLine(
    page,
    dividerX,
    y - rowHeight,
    y,
  )

  if (code) {
    const codeWidth =
      boldFont.widthOfTextAtSize(
        code,
        8.5,
      )

    page.drawText(
      code,
      {
        x:
          codeX +
          (
            dividerX -
            codeX -
            codeWidth
          ) /
            2,
        y:
          y -
          rowHeight +
          4,
        size: 8.5,
        font: boldFont,
        color:
          rgb(
            0,
            0,
            0,
          ),
      },
    )
  }

  page.drawText(
    bullet
      ? `•  ${text}`
      : text,
    {
      x:
        dividerX + 8,
      y:
        y -
        rowHeight +
        4,
      size:
        bullet
          ? 7.7
          : 8.2,
      font:
        bullet
          ? font
          : boldFont,
      color:
        rgb(
          0,
          0,
          0,
        ),
    },
  )

  return y - rowHeight
}

// ============================================================
// TABLE OF CONTENTS LIVE PDF
// ============================================================

export async function generateTableOfContentsPreview(
  project,
) {
  const pdfDoc =
    await PDFDocument.create()

  const page =
    pdfDoc.addPage([
      595.28,
      841.89,
    ])

  const regular =
    await pdfDoc.embedFont(
      StandardFonts.TimesRoman,
    )

  const bold =
    await pdfDoc.embedFont(
      StandardFonts.TimesRomanBold,
    )

  const province =
    clean(
      project?.province,
    ).toUpperCase()

  const municipality =
    titleCase(
      project?.municipality,
    )

  const projectTitle =
    clean(
      project?.projectTitle,
    )

  const date =
    formatLongDate(
      project?.date,
    )

  const bidderName =
    clean(
      project?.bidderName,
    )

  // ==========================================================
  // GOVERNMENT HEADER
  // ==========================================================

  drawCentered(
    page,
    'Republic of the Philippines',
    regular,
    9,
    803,
  )

  drawCentered(
    page,
    province
      ? `PROVINCE OF ${province}`
      : 'PROVINCE OF',
    bold,
    9,
    791,
  )

  drawCentered(
    page,
    municipality
      ? `Municipality of ${municipality}`
      : 'Municipality of',
    regular,
    9,
    779,
  )

  drawCentered(
    page,
    'CHECKLIST OF ELIGIBILITY REQUIREMENTS FOR GOODS',
    bold,
    10,
    754,
  )

  // ==========================================================
  // PROJECT INFORMATION
  // ==========================================================

  const labelX = 80
  const colonX = 176
  const valueX = 196
  const valueWidth = 320

  page.drawText(
    'Project',
    {
      x: labelX,
      y: 720,
      size: 9,
      font: regular,
    },
  )

  page.drawText(
    ':',
    {
      x: colonX,
      y: 720,
      size: 9,
      font: regular,
    },
  )

  const projectLines =
    drawWrappedText({
      page,
      text:
        projectTitle,
      font:
        bold,
      size:
        9,
      x:
        valueX,
      y:
        720,
      maxWidth:
        valueWidth,
      lineHeight:
        10,
    })

  const dateY =
    projectLines > 1
      ? 720 -
        projectLines *
          10 -
        5
      : 700

  page.drawText(
    'Date',
    {
      x:
        labelX,
      y:
        dateY,
      size:
        9,
      font:
        regular,
    },
  )

  page.drawText(
    ':',
    {
      x:
        colonX,
      y:
        dateY,
      size:
        9,
      font:
        regular,
    },
  )

  page.drawText(
    date,
    {
      x:
        valueX,
      y:
        dateY,
      size:
        9,
      font:
        bold,
    },
  )

  const bidderY =
    dateY - 14

  page.drawText(
    'Name of Bidder',
    {
      x:
        labelX,
      y:
        bidderY,
      size:
        9,
      font:
        regular,
    },
  )

  page.drawText(
    ':',
    {
      x:
        colonX,
      y:
        bidderY,
      size:
        9,
      font:
        regular,
    },
  )

  drawWrappedText({
    page,
    text:
      bidderName,
    font:
      bold,
    size:
      9,
    x:
      valueX,
    y:
      bidderY,
    maxWidth:
      valueWidth,
    lineHeight:
      10,
  })

  // ==========================================================
  // TABLE OF CONTENTS
  // ==========================================================

  drawCentered(
    page,
    'TABLE OF CONTENTS',
    bold,
    10,
    650,
  )

  const codeX = 72
  const dividerX = 132
  const rightX = 525

  let y = 628

  const normalRow = 18
  const bulletRow = 17

  y = drawTableRow({
    page,
    code: 'A',
    text:
      'SEC Registration Certificate',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'B',
    text:
      "Mayor’s Permit / Municipal License (CY 2026)",
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'C',
    text:
      'Tax Clearance',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'D',
    text:
      'Certificate of Registration (COR)',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'E',
    text:
      'Latest Income and Business Tax Returns',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'F',
    text:
      'Statement of All its Ongoing Government and Private Contracts',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: '',
    text:
      'Contracts Awarded but not yet Started',
    y,
    rowHeight:
      bulletRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
    bullet: true,
  })

  y = drawTableRow({
    page,
    code: 'G',
    text:
      "Statement of Bidder’s Single Largest Completed Contracts (SLCC)",
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: '',
    text:
      'Certificate of Acceptance',
    y,
    rowHeight:
      bulletRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
    bullet: true,
  })

  y = drawTableRow({
    page,
    code: 'H',
    text:
      'Certificate of Philgeps (Platinum Membership) Registration',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'I',
    text:
      'Audited Financial Statements',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'J',
    text:
      'Computation of Net Financial Contracting Capacity (NFCC)',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'K',
    text:
      'Receipt (Proof of Bid Documents Purchased)',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  drawHorizontalLine(
    page,
    codeX,
    rightX,
    y,
  )

  // ==========================================================
  // TECHNICAL DOCUMENTS
  // ==========================================================

  const technicalTitleY =
    y - 34

  drawCentered(
    page,
    'TECHNICAL DOCUMENTS',
    bold,
    10,
    technicalTitleY,
  )

  y =
    technicalTitleY -
    18

  y = drawTableRow({
    page,
    code: 'L',
    text:
      'Technical Specifications',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'M',
    text:
      'Bid Security',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'N',
    text:
      'Production Delivery Schedule',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'O',
    text:
      'Manpower Requirements',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'P',
    text:
      'Omnibus Sworn Statement',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'Q',
    text:
      'After Sales',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  y = drawTableRow({
    page,
    code: 'R',
    text:
      'Warranty',
    y,
    rowHeight:
      normalRow,
    codeX,
    dividerX,
    rightX,
    font: regular,
    boldFont: bold,
  })

  drawHorizontalLine(
    page,
    codeX,
    rightX,
    y,
  )

  const bytes =
    await pdfDoc.save()

  return URL.createObjectURL(
    new Blob(
      [bytes],
      {
        type:
          'application/pdf',
      },
    ),
  )
}

// ============================================================
// ONGOING GOVERNMENT & PRIVATE CONTRACTS
// ============================================================

export async function generateOngoingContractsPreview(project) {
  const response = await fetch(
    '/pdf/templates/Statement of Ongoing Government and Private Contracts,.pdf',
  )

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

  // ==========================================================
  // CLEAR ONLY THE PARTS TO EDIT
  // DO NOT TOUCH THE TABLE
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
    y: 48,
    width: 485,
    height: 134,
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

  text('Submitted by', footerLabelX, 157, 10.5, regular)
  text(':', footerColonX, 157, 10.5, regular)
  text(submittedBy, footerValueX, 157, 10.5, bold)

  const submittedWidth = bold.widthOfTextAtSize(submittedBy, 10.5)
  page.drawLine({
    start: { x: footerValueX, y: 155 },
    end: { x: footerValueX + submittedWidth, y: 155 },
    thickness: 0.6,
    color: black,
  })

  text('(Printed Name & Signature)', footerValueX, 142, 8, regular)

  text('Designation', footerLabelX, 119, 10.5, regular)
  text(':', footerColonX, 119, 10.5, regular)
  text(designation, footerValueX, 119, 10.5, regular)

  text('Name of Firm', footerLabelX, 99, 10.5, regular)
  text(':', footerColonX, 99, 10.5, regular)
  text(bidderName, footerValueX, 99, 10.5, bold)

  text('Date', footerLabelX, 79, 10.5, regular)
  text(':', footerColonX, 79, 10.5, regular)
  text(date, footerValueX, 79, 10.5, regular)

  const bytes = await pdfDoc.save()
  const blob = new Blob([bytes], {
    type: 'application/pdf',
  })

  return URL.createObjectURL(blob)
}

export async function generateNfccPreview(project) {
  const response = await fetch('/pdf/templates/NFCC_Template.pdf')

  if (!response.ok) {
    throw new Error('Unable to load NFCC_Template.pdf')
  }

  const sourceBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(sourceBytes)

  if (pdfDoc.getPageCount() === 0) {
    throw new Error('NFCC_Template.pdf has no pages.')
  }

  const page = pdfDoc.getPage(0)

  const regular = await pdfDoc.embedFont(
    StandardFonts.Helvetica,
  )

  const bold = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold,
  )

  const italic = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique,
  )

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)
  const red = rgb(0.85, 0, 0)

  // =========================================================
  // VALUES FROM DOCUMENT SETUP
  // =========================================================

  const procuringEntity = clean(
    project?.procuringEntity,
  ).toUpperCase()

  const referenceNumber = clean(
    project?.referenceNumber,
  )

  const projectTitle = clean(
    project?.projectTitle,
  ).toUpperCase()

  const bidderName = clean(
    project?.bidderName,
  ).toUpperCase()

  const businessAddress = clean(
    project?.businessAddress,
  ).toUpperCase()

  const submittedBy = clean(
    project?.submittedBy,
  ).toUpperCase()

  const designation = clean(
    project?.designation,
  )

  const date = formatLongDate(
    project?.date,
  )

  // =========================================================
  // LOCAL HELPERS
  // =========================================================

  function drawText(
    value,
    x,
    y,
    size = 9,
    font = regular,
    color = black,
  ) {
    const text = clean(value)

    if (!text) return

    page.drawText(text, {
      x,
      y,
      size,
      font,
      color,
    })
  }

  function fitFontSize(
    value,
    font,
    startSize,
    maxWidth,
    minSize = 6,
  ) {
    const text = clean(value)

    if (!text) {
      return startSize
    }

    let size = startSize

    while (
      size > minSize &&
      font.widthOfTextAtSize(
        text,
        size,
      ) > maxWidth
    ) {
      size -= 0.15
    }

    return Math.max(
      size,
      minSize,
    )
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

    const finalSize = fitFontSize(
      text,
      font,
      size,
      width,
      minSize,
    )

    page.drawText(text, {
      x,
      y,
      size: finalSize,
      font,
      color,
    })
  }

  // =========================================================
  // CLEAR OLD HEADER ONLY
  //
  // IMPORTANT:
  // Hindi gagalawin ang paragraph/body/table.
  // =========================================================

  page.drawRectangle({
    x: 18,
    y: 675,
    width: 560,
    height: 100,
    color: white,
  })

  // =========================================================
  // NEW HEADER
  //
  // SAME LABELS AS YOUR FIRST PDF:
  //
  // NAME OF THE PROCURING ENTITY
  // PROJECT TITLE
  // REFERENCE NUMBER
  // CONTRACTOR
  // ADDRESS
  //
  // Values = RED
  // Labels = BLACK
  // =========================================================

  const labelX = 29
  const colonX = 203
  const valueX = 220
  const valueWidth = 345

  const labelSize = 9.4
  const valueSize = 10.2

  // ---------------------------------------------------------
  // NAME OF THE PROCURING ENTITY
  // ---------------------------------------------------------

  drawText(
    'NAME OF THE PROCURING ENTITY',
    labelX,
    760,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    760,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: procuringEntity,
    x: valueX,
    y: 760,
    width: valueWidth,
    size: valueSize,
    minSize: 7.4,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // PROJECT TITLE
  // ---------------------------------------------------------

  drawText(
    'PROJECT TITLE',
    labelX,
    741,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    741,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: projectTitle,
    x: valueX,
    y: 741,
    width: valueWidth,
    size: valueSize,
    minSize: 6.8,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // REFERENCE NUMBER
  // ---------------------------------------------------------

  drawText(
    'REFERENCE NUMBER',
    labelX,
    715,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    715,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: referenceNumber,
    x: valueX,
    y: 715,
    width: valueWidth,
    size: valueSize,
    minSize: 8,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // CONTRACTOR
  // ---------------------------------------------------------

  drawText(
    'CONTRACTOR',
    labelX,
    696,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    696,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: bidderName,
    x: valueX,
    y: 696,
    width: valueWidth,
    size: valueSize,
    minSize: 7.4,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // ADDRESS
  // ---------------------------------------------------------

  drawText(
    'ADDRESS',
    labelX,
    677,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    677,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: businessAddress,
    x: valueX,
    y: 677,
    width: valueWidth,
    size: 9.5,
    minSize: 6.5,
    font: bold,
    color: red,
  })

  // =========================================================
  // REMOVE OLD SIGNATORY ONLY
  //
  // Hindi gagalawin ang NFCC computation table.
  // =========================================================

  page.drawRectangle({
    x: 18,
    y: 155,
    width: 560,
    height: 132,
    color: white,
  })

  // =========================================================
  // NEW SIGNATORY
  // =========================================================

  const footerLabelX = 32
  const footerColonX = 128
  const footerValueX = 155

  const footerLabelSize = 10
  const footerValueSize = 10.3

  // ---------------------------------------------------------
  // SUBMITTED
  // ---------------------------------------------------------

  const submittedY = 258

  drawText(
    'Submitted',
    footerLabelX,
    submittedY,
    footerLabelSize,
    regular,
    black,
  )

  drawText(
    ':',
    footerColonX,
    submittedY,
    footerLabelSize,
    regular,
    black,
  )

  const submittedSize = fitFontSize(
    submittedBy,
    bold,
    footerValueSize,
    300,
    8,
  )

  drawText(
    submittedBy,
    footerValueX,
    submittedY,
    submittedSize,
    bold,
    black,
  )

  if (submittedBy) {
    const submittedWidth =
      bold.widthOfTextAtSize(
        submittedBy,
        submittedSize,
      )

    page.drawLine({
      start: {
        x: footerValueX,
        y: submittedY - 2,
      },
      end: {
        x:
          footerValueX +
          submittedWidth,
        y: submittedY - 2,
      },
      thickness: 0.7,
      color: black,
    })
  }

  drawText(
    '(Printed Name & Signature)',
    footerValueX,
    246,
    6.3,
    regular,
    black,
  )

  // ---------------------------------------------------------
  // DESIGNATION
  // ---------------------------------------------------------

  drawText(
    'Designation',
    footerLabelX,
    223,
    footerLabelSize,
    regular,
    black,
  )

  drawText(
    ':',
    footerColonX,
    223,
    footerLabelSize,
    regular,
    black,
  )

  drawFitText({
    value: designation,
    x: footerValueX,
    y: 223,
    width: 300,
    size: footerValueSize,
    minSize: 8,
    font: italic,
    color: black,
  })

  // ---------------------------------------------------------
  // NAME OF FIRM
  // ---------------------------------------------------------

  drawText(
    'Name of Firm',
    footerLabelX,
    200,
    footerLabelSize,
    regular,
    black,
  )

  drawText(
    ':',
    footerColonX,
    200,
    footerLabelSize,
    regular,
    black,
  )

  drawFitText({
    value: bidderName,
    x: footerValueX,
    y: 200,
    width: 300,
    size: footerValueSize,
    minSize: 8,
    font: bold,
    color: black,
  })

  // ---------------------------------------------------------
  // DATE
  // ---------------------------------------------------------

  drawText(
    'Date',
    footerLabelX,
    177,
    footerLabelSize,
    regular,
    black,
  )

  drawText(
    ':',
    footerColonX,
    177,
    footerLabelSize,
    regular,
    black,
  )

  drawFitText({
    value: date,
    x: footerValueX,
    y: 177,
    width: 300,
    size: footerValueSize,
    minSize: 8,
    font: regular,
    color: black,
  })

  // =========================================================
  // SAVE
  // =========================================================

  const bytes =
    await pdfDoc.save()

  const blob =
    new Blob(
      [bytes],
      {
        type: 'application/pdf',
      },
    )

  return URL.createObjectURL(
    blob,
  )
}

export async function generateBidSecurityPreview(project) {
  const templateVariant =
    project?.templateVariant === 'initao_lgu'
      ? 'initao_lgu'
      : 'old_default'

  const templatePath =
    templateVariant === 'initao_lgu'
      ? '/pdf/templates/New_tab_and_pages_Initao_LGU_template.pdf'
      : '/pdf/templates/Bid Security without table.pdf'

  const response = await fetch(templatePath)

  if (!response.ok) {
    throw new Error(
      `Unable to load Bid Security template: ${templatePath}`,
    )
  }

  const sourceBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(sourceBytes)

  if (pdfDoc.getPageCount() < 2) {
    throw new Error(
      'Bid Security template must contain at least 2 pages.',
    )
  }

  const regular = await pdfDoc.embedFont(
    StandardFonts.TimesRoman,
  )

  const bold = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBold,
  )

  const italic = await pdfDoc.embedFont(
    StandardFonts.TimesRomanItalic,
  )

  const boldItalic = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBoldItalic,
  )

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)

  function clean(value) {
    return String(value ?? '').trim()
  }

  function titleCase(value) {
    return clean(value)
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase(),
      )
  }

  function fitSize(
    text,
    font,
    size,
    maxWidth,
    minSize = 7,
  ) {
    let current = size

    while (
      current > minSize &&
      font.widthOfTextAtSize(
        text,
        current,
      ) > maxWidth
    ) {
      current -= 0.2
    }

    return current
  }

  function drawFitText({
    page,
    text,
    x,
    y,
    maxWidth,
    size = 10,
    minSize = 7,
    font = regular,
    color = black,
  }) {
    const value = clean(text)

    if (!value) return

    const finalSize = fitSize(
      value,
      font,
      size,
      maxWidth,
      minSize,
    )

    page.drawText(value, {
      x,
      y,
      size: finalSize,
      font,
      color,
    })
  }

  function drawCentered({
    page,
    text,
    y,
    size = 10,
    font = regular,
  }) {
    const value = clean(text)

    if (!value) return

    const width =
      font.widthOfTextAtSize(
        value,
        size,
      )

    page.drawText(value, {
      x:
        (page.getWidth() - width) /
        2,
      y,
      size,
      font,
      color: black,
    })
  }

  // ============================================================
  // VALUES
  // ============================================================

  const municipality =
    titleCase(project?.municipality)

  const municipalityUpper =
    municipality.toUpperCase()

  const referenceNumber =
    clean(project?.referenceNumber)

  const bidderName =
    clean(project?.bidderName)
      .toUpperCase()

  const submittedBy =
    clean(
      project?.submittedBy ||
        project?.authorizedRepresentative,
    ).toUpperCase()

  const designation =
    clean(
      project?.designation ||
        project?.representativeDesignation,
    ) ||
    'Authorized Representative'

  // ============================================================
  // DATE
  // ============================================================

  function parseDate(value) {
    const text = clean(value)

    if (!text) return null

    const iso =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})$/,
      )

    if (iso) {
      return new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3]),
      )
    }

    const parsed =
      new Date(text)

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      return null
    }

    return parsed
  }

  const parsedDate =
    parseDate(project?.date)

  const day =
    parsedDate
      ? String(
          parsedDate.getDate(),
        ).padStart(2, '0')
      : ''

  const month =
    parsedDate
      ? parsedDate.toLocaleDateString(
          'en-US',
          {
            month: 'long',
          },
        )
      : ''

  const year =
    parsedDate
      ? String(
          parsedDate.getFullYear(),
        )
      : ''

  const longDate =
    parsedDate
      ? `${month} ${day}, ${year}`
      : clean(project?.date)

  // ============================================================
  // PAGE 1
  // ============================================================

  const page1 =
    pdfDoc.getPage(0)

  // Clear complete original editable heading area
  page1.drawRectangle({
    x: 45,
    y: 620,
    width:
      page1.getWidth() - 90,
    height: 165,
    color: white,
  })

  // Clear old "To: Municipality of Impasugong"
  page1.drawRectangle({
    x: 50,
    y: 535,
    width: 390,
    height: 55,
    color: white,
  })

  drawCentered({
    page: page1,
    text:
      'REPUBLIC OF THE PHILIPPINES',
    y: 750,
    size: 11,
    font: bold,
  })

  drawCentered({
    page: page1,
    text:
      `MUNICIPALITY OF ${municipalityUpper}`,
    y: 734,
    size: 11,
    font: bold,
  })

  drawCentered({
    page: page1,
    text:
      'BID SECURING DECLARATION',
    y: 690,
    size: 11,
    font: bold,
  })

  drawCentered({
    page: page1,
    text:
      `Project Identification No.: ${referenceNumber}`,
    y: 675,
    size: 9.5,
    font: regular,
  })

  drawFitText({
    page: page1,
    text:
      `To: Municipality of ${municipality}`,
    x: 67,
    y: 558,
    maxWidth: 350,
    size: 10.5,
    minSize: 8,
    font: boldItalic,
  })

  // ============================================================
  // PAGE 2
  // ============================================================

  const page2 =
    pdfDoc.getPage(1)

  // ============================================================
  // REMOVE THE WHOLE OLD TOP SIGNATORY AREA
  //
  // This is intentionally wider/taller.
  // It removes ALL duplicate old text:
  // - old witness sentence
  // - Impasugong
  // - old company
  // - old representative
  // - old July 20, 2026
  //
  // Stops BEFORE Jurat.
  // ============================================================

  page2.drawRectangle({
    x: 45,
    y: 535,
    width:
      page2.getWidth() - 90,
    height: 245,
    color: white,
  })

  // ============================================================
  // REDRAW CLEAN PAGE 2 TOP
  // ============================================================

  drawFitText({
    page: page2,
    text:
      `IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this ${day} day of ${month} ${year} at`,
    x: 66,
    y: 740,
    maxWidth: 470,
    size: 9.5,
    minSize: 7,
    font: bold,
  })

  drawFitText({
    page: page2,
    text:
      `Municipality of ${municipality}.`,
    x: 66,
    y: 724,
    maxWidth: 300,
    size: 9.5,
    minSize: 7,
    font: boldItalic,
  })

  drawFitText({
    page: page2,
    text:
      'Duly authorized to sign the Bid for and behalf of:',
    x: 66,
    y: 680,
    maxWidth: 380,
    size: 9,
    minSize: 7,
    font: italic,
  })

  drawFitText({
    page: page2,
    text: bidderName,
    x: 66,
    y: 661,
    maxWidth: 360,
    size: 10.5,
    minSize: 8,
    font: bold,
  })

  const signerY = 608

  drawFitText({
    page: page2,
    text: submittedBy,
    x: 66,
    y: signerY,
    maxWidth: 320,
    size: 10.5,
    minSize: 8,
    font: boldItalic,
  })

  if (submittedBy) {
    const signerSize =
      fitSize(
        submittedBy,
        boldItalic,
        10.5,
        320,
        8,
      )

    const signerWidth =
      boldItalic.widthOfTextAtSize(
        submittedBy,
        signerSize,
      )

    page2.drawLine({
      start: {
        x: 66,
        y: signerY - 2,
      },
      end: {
        x:
          66 +
          Math.min(
            signerWidth,
            320,
          ),
        y: signerY - 2,
      },
      thickness: 0.7,
      color: black,
    })
  }

  drawFitText({
    page: page2,
    text: designation,
    x: 66,
    y: 590,
    maxWidth: 320,
    size: 9.5,
    minSize: 7,
    font: boldItalic,
  })

  drawFitText({
    page: page2,
    text: longDate,
    x: 66,
    y: 572,
    maxWidth: 260,
    size: 9.5,
    minSize: 7,
    font: boldItalic,
  })

  // ============================================================
  // JURAT
  // ============================================================

  // Cover the ENTIRE first Jurat sentence.
  // This is more reliable than covering only "Impasugong".
  page2.drawRectangle({
    x: 55,
    y: 385,
    width:
      page2.getWidth() - 110,
    height: 28,
    color: white,
  })

  drawFitText({
    page: page2,
    text:
      `SUBSCRIBED AND SWORN to before me this ____ day of ______ ${year} at Municipality of ${municipality},`,
    x: 66,
    y: 398,
    maxWidth:
      page2.getWidth() - 132,
    size: 8.7,
    minSize: 7,
    font: regular,
  })

  drawFitText({
    page: page2,
    text: 'Philippines.',
    x: 66,
    y: 384,
    maxWidth: 120,
    size: 8.7,
    minSize: 7,
    font: regular,
  })

  // ============================================================
  // SAVE
  // ============================================================

  const bytes =
    await pdfDoc.save()

  const blob =
    new Blob(
      [bytes],
      {
        type: 'application/pdf',
      },
    )

  return URL.createObjectURL(
    blob,
  )
}