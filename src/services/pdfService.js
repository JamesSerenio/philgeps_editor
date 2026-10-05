import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

import { pdfTemplates } from '../lib/pdfTemplates'

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
      color: rgb(0, 0, 0),
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
            rgb(0, 0, 0),
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
          (dividerX -
            codeX -
            codeWidth) /
            2,
        y:
          y -
          rowHeight +
          4,
        size: 8.5,
        font: boldFont,
        color:
          rgb(0, 0, 0),
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
        rgb(0, 0, 0),
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
  // ==========================================================
  // CREATE A NEW CLEAN PDF
  // ==========================================================
  //
  // We no longer draw over the old template.
  // This removes all overlap / ghost text problems.
  // ==========================================================

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
    clean(
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

  // ==========================================================
  // DOCUMENT TITLE
  // ==========================================================

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
      font: bold,
      size: 9,
      x: valueX,
      y: 720,
      maxWidth:
        valueWidth,
      lineHeight: 10,
    })

  const dateY =
    projectLines > 1
      ? 720 -
        projectLines * 10 -
        5
      : 700

  page.drawText(
    'Date',
    {
      x: labelX,
      y: dateY,
      size: 9,
      font: regular,
    },
  )

  page.drawText(
    ':',
    {
      x: colonX,
      y: dateY,
      size: 9,
      font: regular,
    },
  )

  page.drawText(
    date,
    {
      x: valueX,
      y: dateY,
      size: 9,
      font: bold,
    },
  )

  const bidderY =
    dateY - 14

  page.drawText(
    'Name of Bidder',
    {
      x: labelX,
      y: bidderY,
      size: 9,
      font: regular,
    },
  )

  page.drawText(
    ':',
    {
      x: colonX,
      y: bidderY,
      size: 9,
      font: regular,
    },
  )

  drawWrappedText({
    page,
    text:
      bidderName,
    font: bold,
    size: 9,
    x: valueX,
    y: bidderY,
    maxWidth:
      valueWidth,
    lineHeight: 10,
  })

  // ==========================================================
  // TABLE OF CONTENTS TITLE
  // ==========================================================

  drawCentered(
    page,
    'TABLE OF CONTENTS',
    bold,
    10,
    650,
  )

  // ==========================================================
  // ELIGIBILITY DOCUMENTS
  // ==========================================================

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
  // TECHNICAL DOCUMENTS TITLE
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

  // ==========================================================
  // TECHNICAL DOCUMENTS TABLE
  // ==========================================================

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

  // ==========================================================
  // SAVE PDF
  // ==========================================================

  const bytes =
    await pdfDoc.save()

  const blob =
    new Blob(
      [bytes],
      {
        type:
          'application/pdf',
      },
    )

  return URL.createObjectURL(
    blob,
  )
}