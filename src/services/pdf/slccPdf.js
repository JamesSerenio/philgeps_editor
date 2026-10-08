
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// ==================================================
// CLEAN SLCC PDF - COMPLETE TABLE GENERATOR
// ==================================================

// The whole SLCC page is drawn from scratch.
// No old table, borders, text, or signature
// will be copied from the template.

const BLACK = rgb(0, 0, 0)

const PAGE_WIDTH = 841.89
const PAGE_HEIGHT = 595.28

const TABLE_LEFT = 32

const COLUMN_WIDTHS = [
  100, // Name of Contract
  130, // Owner / Address / Telephone
  90,  // Nature of Work
  144, // Description
  52,  // Percentage
  119, // Award / Completion / Duration
  143, // Dates
]

const COLUMNS = [TABLE_LEFT]

for (const width of COLUMN_WIDTHS) {
  COLUMNS.push(COLUMNS.at(-1) + width)
}

const BORDER = 0.7

// ==================================================
// DEFAULT CONTRACT VALUES
// ==================================================

const DEFAULT_ENTRIES = {
  cctv: {
    government: {
      ownerDetails: 'LGU MALITBOG',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description:
        'PROCUREMENT AND INSTALLATION OF STREET SOLAR LIGHTS',
    },
    private: {
      ownerDetails: '',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description: '',
    },
  },

  streetlight: {
    government: {
      ownerDetails: 'LGU SUMILAO',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description:
        'PROCUREMENT OF SOLAR STREET LIGHTS FOR MUNICIPAL AND BARANGAY STREET',
    },
    private: {
      ownerDetails: '',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description: '',
    },
  },
}

// ==================================================
// FINANCIAL DETAILS
// ==================================================

// Existing example values from your templates.
// Verify these against the actual completed contract.

const FINANCIALS = {
  cctv: [
    '100%',
    '- 716,500.00\n' +
      '- 716,500.00\n' +
      '- 15 DAYS',
    '- APRIL 29, 2026\n' +
      '- MAY 4, 2026\n' +
      '- MAY 20, 2026',
  ],

  streetlight: [
    '100%',
    'A. 1,997,496.00\n' +
      'B. 26 DAYS',
    'A. MARCH 31, 2026\n' +
      'B. APRIL 4, 2026\n' +
      'C. MAY 7, 2026',
  ],
}

// ==================================================
// SAVED CONTRACT TYPE
// ==================================================

export function getSlccContractType(
  data = {},
  variant = 'streetlight'
) {
  return data.slccContractTypes?.[variant] === 'private'
    ? 'private'
    : 'government'
}

// ==================================================
// SAVED CONTRACT DETAILS
// ==================================================

export function getSlccEntry(
  data = {},
  variant = 'streetlight',
  type = 'government'
) {
  return {
    ...(
      DEFAULT_ENTRIES[variant]?.[type] ??
      DEFAULT_ENTRIES.streetlight.government
    ),
    ...(
      data.slccEntries?.[variant]?.[type] ?? {}
    ),
  }
}

// ==================================================
// TEXT HELPERS
// ==================================================

function safe(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function flat(value) {
  return safe(value).replace(/\s+/g, ' ')
}

function dateLabel(value) {
  const v = flat(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v
  }

  const [year, month, day] = v
    .split('-')
    .map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day)
  )

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return v
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

// ==================================================
// PAGE COORDINATES
// ==================================================

// PDF uses bottom-left coordinates.
// Our table uses top-left coordinates.

const py = (top) => PAGE_HEIGHT - top

// ==================================================
// DRAW ONE CONSISTENT TABLE LINE
// ==================================================

function drawLine(
  page,
  left,
  top1,
  right,
  top2
) {
  page.drawLine({
    start: {
      x: left,
      y: py(top1),
    },
    end: {
      x: right,
      y: py(top2),
    },
    color: BLACK,
    thickness: BORDER,
  })
}

function textWidth(font, text, size) {
  return font.widthOfTextAtSize(text, size)
}

// ==================================================
// DRAW SINGLE LINE TEXT
// ==================================================

function drawLineText(
  page,
  font,
  text,
  x,
  top,
  size,
  maxWidth
) {
  const value = flat(text)

  if (!value) return

  const measured = textWidth(
    font,
    value,
    size
  )

  const fitted = Math.min(
    size,
    size * maxWidth / Math.max(0.001, measured)
  )

  if (fitted < 7) {
    throw new Error(
      `SLCC field is too long: ${value}`
    )
  }

  page.drawText(value, {
    x,
    y: py(top) - fitted,
    size: fitted,
    font,
    color: BLACK,
  })
}

// ==================================================
// TEXT WRAPPING
// ==================================================

function wrapParagraph(
  text,
  font,
  size,
  width,
  preserveLines = false
) {
  const lines = []

  for (const part of safe(text).split('\n')) {
    const paragraph = part.trim()

    if (!paragraph) continue

    // Preserve each award/date line.
    if (preserveLines) {
      if (
        textWidth(
          font,
          paragraph,
          size
        ) > width
      ) {
        return null
      }

      lines.push(paragraph)
      continue
    }

    let line = ''

    for (const word of paragraph.split(/\s+/)) {
      const next = line
        ? `${line} ${word}`
        : word

      if (
        textWidth(
          font,
          next,
          size
        ) <= width
      ) {
        line = next
      } else if (
        !line ||
        textWidth(font, word, size) > width
      ) {
        return null
      } else {
        lines.push(line)
        line = word
      }
    }

    if (line) {
      lines.push(line)
    }
  }

  return lines
}

// ==================================================
// MEASURE TEXT HEIGHT BEFORE DRAWING
// ==================================================

function measureCell(
  text,
  font,
  columnWidth,
  {
    preferred = 10,
    preserveLines = false,
  } = {}
) {
  if (!flat(text)) {
    return {
      lines: [],
      fontSize: preferred,
      height: 0,
    }
  }

  for (
    let size = preferred;
    size >= 7.25;
    size -= 0.25
  ) {
    const lines = wrapParagraph(
      text,
      font,
      size,
      columnWidth - 14,
      preserveLines
    )

    if (lines) {
      return {
        lines,
        fontSize: size,
        height:
          lines.length * size * 1.21 + 14,
      }
    }
  }

  throw new Error(
    `SLCC text cannot fit its column: ${flat(text)}`
  )
}

// ==================================================
// CENTER TEXT INSIDE ANY TABLE CELL
// ==================================================

function drawCenteredCell(
  page,
  font,
  layout,
  left,
  right,
  top,
  bottom
) {
  if (!layout.lines.length) return

  const leading =
    layout.fontSize * 1.21

  const used =
    layout.lines.length * leading

  const first =
    top + (bottom - top - used) / 2

  layout.lines.forEach((content, index) => {
    const width = textWidth(
      font,
      content,
      layout.fontSize
    )

    page.drawText(content, {
      x:
        left +
        (right - left - width) / 2,

      y:
        py(
          first +
          index * leading +
          layout.fontSize
        ),

      size: layout.fontSize,
      font,
      color: BLACK,
    })
  })
}

// ==================================================
// COLUMN HEADING TEXT
// ==================================================

function drawMultilineInBox(
  page,
  font,
  text,
  left,
  right,
  top,
  bottom,
  preferred = 9.1
) {
  const height = bottom - top

  for (
    let size = preferred;
    size >= 7.25;
    size -= 0.25
  ) {
    const lines = wrapParagraph(
      text,
      font,
      size,
      right - left - 12
    )

    if (
      lines &&
      lines.length * size * 1.16 <= height - 6
    ) {
      drawCenteredCell(
        page,
        font,
        {
          lines,
          fontSize: size,
        },
        left + 2,
        right - 2,
        top,
        bottom
      )

      return
    }
  }

  throw new Error(
    `SLCC column heading does not fit: ${flat(text)}`
  )
}

// ==================================================
// DOCUMENT HEADER FIELDS
// ==================================================

function drawMeta(
  page,
  labelFont,
  valueFont,
  label,
  value,
  startTop
) {
  const labelX = 38
  const colonX = 235
  const valueX = 251
  const valueWidth = 548
  const size = 9.3

  const lines = wrapParagraph(
    flat(value) || '-',
    valueFont,
    size,
    valueWidth
  )

  if (!lines) {
    throw new Error(
      `Header information is too long: ${label}`
    )
  }

  drawLineText(
    page,
    labelFont,
    label,
    labelX,
    startTop,
    9.4,
    colonX - labelX - 7
  )

  drawLineText(
    page,
    labelFont,
    ':',
    colonX,
    startTop,
    9.4,
    12
  )

  const leading = 12

  lines.forEach((content, index) => {
    page.drawText(content, {
      x: valueX,
      y:
        py(startTop + index * leading) -
        size,
      font: valueFont,
      size,
      color: BLACK,
    })
  })

  return (
    startTop +
    Math.max(1, lines.length) * leading +
    1
  )
}

// ==================================================
// COMPLETE SEVEN-COLUMN SLCC TABLE
// ==================================================

function drawTable(
  page,
  regular,
  bold,
  top,
  selectedType,
  fields
) {
  const x = COLUMNS

  const headHeight = 62
  const headSplit = top + 19
  const bodyTop = top + headHeight

  // Widths of the six editable/value columns.
  const widths = COLUMN_WIDTHS.slice(1)

  const activeLayouts = fields.map(
    (value, index) =>
      measureCell(
        value,
        bold,
        widths[index],
        {
          preferred:
            index >= 4 ? 9.25 : 9.75,
          preserveLines:
            index === 4 || index === 5,
        }
      )
  )

  // Active row grows with text.
  const activeHeight = Math.max(
    62,
    ...activeLayouts.map((item) => item.height)
  )

  // Row with NONE becomes smaller.
  const noneHeight = 29

  const govHeight =
    selectedType === 'government'
      ? activeHeight
      : noneHeight

  const privateHeight =
    selectedType === 'private'
      ? activeHeight
      : noneHeight

  const middle =
    bodyTop + govHeight

  const bottom =
    middle + privateHeight

  // Leave enough room for the signature.
  if (bottom + 103 > PAGE_HEIGHT - 16) {
    throw new Error(
      'SLCC table content is too long for one page. ' +
      'Shorten the Owner or Description fields.'
    )
  }

  // ==================================================
  // HORIZONTAL LINES
  // All lines run across the full table width.
  // ==================================================

  for (const y of [
    top,
    bodyTop,
    middle,
    bottom,
  ]) {
    drawLine(
      page,
      x[0],
      y,
      x.at(-1),
      y
    )
  }

  // ==================================================
  // VERTICAL LINES
  // All columns use the exact same positions.
  // ==================================================

  for (let i = 0; i < x.length; i++) {
    drawLine(
      page,
      x[i],
      i === 4 ? headSplit : top,
      x[i],
      bottom
    )
  }

  // ==================================================
  // MERGED BIDDER'S ROLE HEADER
  // ==================================================

  drawLine(
    page,
    x[3],
    headSplit,
    x[5],
    headSplit
  )

  // ==================================================
  // COLUMN HEADINGS
  // ==================================================

  drawMultilineInBox(
    page,
    bold,
    'Name of\nContract',
    x[0],
    x[1],
    top,
    bodyTop
  )

  drawMultilineInBox(
    page,
    regular,
    "Owner's Name\nAddress\nTelephone Number",
    x[1],
    x[2],
    top,
    bodyTop
  )

  drawMultilineInBox(
    page,
    regular,
    'Nature of\nWork',
    x[2],
    x[3],
    top,
    bodyTop
  )

  drawMultilineInBox(
    page,
    bold,
    "Bidder's Role",
    x[3],
    x[5],
    top,
    headSplit,
    10
  )

  drawMultilineInBox(
    page,
    regular,
    'Description',
    x[3],
    x[4],
    headSplit,
    bodyTop
  )

  drawMultilineInBox(
    page,
    regular,
    '%',
    x[4],
    x[5],
    headSplit,
    bodyTop
  )

  drawMultilineInBox(
    page,
    regular,
    'a. Amount of Award\n' +
      'b. Amount at\n' +
      'Completion\n' +
      'Duration',
    x[5],
    x[6],
    top,
    bodyTop
  )

  drawMultilineInBox(
    page,
    regular,
    'a. Date Awarded\n' +
      'b. Contract Effectivity\n' +
      'c. Date Completed',
    x[6],
    x[7],
    top,
    bodyTop
  )

  // ==================================================
  // GOVERNMENT / PRIVATE ROW VALUES
  // ==================================================

  const noneLayout = measureCell(
    'NONE',
    bold,
    50,
    {
      preferred: 9.25,
    }
  )

  const rows = [
    {
      type: 'government',
      top: bodyTop,
      bottom: middle,
    },
    {
      type: 'private',
      top: middle,
      bottom,
    },
  ]

  for (const row of rows) {
    // First column: Contract classification
    drawLineText(
      page,
      bold,
      row.type.toUpperCase(),
      x[0] + 5,
      row.top + 5,
      9.5,
      x[1] - x[0] - 10
    )

    // Remaining six columns
    for (let i = 0; i < 6; i++) {
      const layout =
        row.type === selectedType
          ? activeLayouts[i]
          : noneLayout

      drawCenteredCell(
        page,
        bold,
        layout,
        x[i + 1] + 4,
        x[i + 2] - 4,
        row.top + 3,
        row.bottom - 3
      )
    }
  }

  return bottom
}

// ==================================================
// SIGNATURE BELOW THE TABLE
// ==================================================

function drawSignature(
  page,
  regular,
  bold,
  top,
  data
) {
  const name = flat(
    data.submittedBy ||
    data.authorizedRepresentative
  )

  const designation = flat(
    data.designation ||
    data.representativeDesignation
  )

  const company = flat(
    data.bidderName
  ).toUpperCase()

  const date = dateLabel(data.date)

  const rows = [
    ['Submitted by', name, true],
    ['Designation', designation, false],
    ['Name of Firm', company, true],
    ['Date', date, true],
  ]

  const labelX = 38
  const colonX = 123
  const valueX = 145

  const y0 = top + 14

  rows.forEach(
    ([label, value, strong], i) => {
      const y =
        y0 +
        (
          i === 0
            ? 0
            : 25 + (i - 1) * 17
        )

      drawLineText(
        page,
        regular,
        label,
        labelX,
        y,
        9.2,
        colonX - labelX - 6
      )

      drawLineText(
        page,
        regular,
        ':',
        colonX,
        y,
        9.2,
        10
      )

      drawLineText(
        page,
        strong ? bold : regular,
        value,
        valueX,
        y,
        9.3,
        550
      )

      if (i === 0) {
        drawLineText(
          page,
          regular,
          '(Printed Name & Signature)',
          valueX,
          y + 12,
          7.7,
          260
        )
      }
    }
  )
}

// ==================================================
// MAIN PDF GENERATOR
// ==================================================

export async function generateSlccPreview(
  data = {}
) {
  const variant =
    data.slccVariant === 'cctv'
      ? 'cctv'
      : 'streetlight'

  const selectedType = getSlccContractType(
    data,
    variant
  )

  const entry = getSlccEntry(
    data,
    variant,
    selectedType
  )

  // Create a fresh PDF.
  const pdf = await PDFDocument.create()

  pdf.setTitle(
    `SLCC - ${variant.toUpperCase()}`
  )

  const page = pdf.addPage([
    PAGE_WIDTH,
    PAGE_HEIGHT,
  ])

  const regular = await pdf.embedFont(
    StandardFonts.Helvetica
  )

  const bold = await pdf.embedFont(
    StandardFonts.HelveticaBold
  )

  // ==================================================
  // DOCUMENT SETUP INFORMATION
  // ==================================================

  let y = 23

  y = drawMeta(
    page,
    regular,
    bold,
    'NAME OF THE PROCURING ENTITY',
    flat(data.procuringEntity) ||
      [
        data.municipality,
        data.province,
      ]
        .filter(Boolean)
        .join(', '),
    y
  )

  y = drawMeta(
    page,
    regular,
    bold,
    'PROJECT TITLE',
    flat(data.projectTitle),
    y
  )

  y = drawMeta(
    page,
    regular,
    bold,
    'REFERENCE NUMBER',
    flat(data.referenceNumber),
    y
  )

  // ==================================================
  // DOCUMENT TITLE
  // ==================================================

  const title =
    "STATEMENT OF BIDDER'S SINGLE LARGEST COMPLETED CONTRACTS"

  const titleY = Math.max(
    y + 13,
    91
  )

  const titleSize = 12.4

  const titleX =
    (
      PAGE_WIDTH -
      textWidth(
        bold,
        title,
        titleSize
      )
    ) / 2

  drawLineText(
    page,
    bold,
    title,
    titleX,
    titleY,
    titleSize,
    PAGE_WIDTH - 60
  )

  // Underline
  drawLine(
    page,
    titleX,
    titleY + titleSize + 1,
    PAGE_WIDTH - titleX,
    titleY + titleSize + 1
  )

  // ==================================================
  // BUSINESS INFORMATION
  // ==================================================

  let businessY =
    titleY + 31

  businessY = drawMeta(
    page,
    regular,
    bold,
    'REGISTERED BUSINESS NAME OF BIDDER',
    flat(data.bidderName),
    businessY
  )

  businessY = drawMeta(
    page,
    regular,
    bold,
    'BUSINESS ADDRESS',
    flat(
      data.businessAddress ||
      data.companyAddress
    ),
    businessY
  )

  // ==================================================
  // COMPLETE TABLE
  // ==================================================

  const tableTop = Math.max(
    businessY + 9,
    171
  )

  const fields = [
    entry.ownerDetails,
    entry.natureOfWork,
    entry.description,
    ...FINANCIALS[variant],
  ]

  const tableBottom = drawTable(
    page,
    regular,
    bold,
    tableTop,
    selectedType,
    fields
  )

  // ==================================================
  // SIGNATURE
  // ==================================================

  drawSignature(
    page,
    regular,
    bold,
    tableBottom,
    data
  )

  // ==================================================
  // SAVE UPDATED PDF
  // ==================================================

  const bytes = await pdf.save({
    useObjectStreams: false,
  })

  return URL.createObjectURL(
    new Blob(
      [bytes],
      {
        type: 'application/pdf',
      }
    )
  )
}
