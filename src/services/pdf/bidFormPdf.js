
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

import {
  buildBidFormData,
} from '../../lib/bidFormData'

const templateUrl =
  '/pdf/templates/BID_FORM_CLEAN_TEMPLATE.pdf'

const BLACK = rgb(0, 0, 0)
const WHITE = rgb(1, 1, 1)

const MAX_RIGHT = 543
const PAPER_H = 792

// =====================================================
// TEXT HELPERS
// =====================================================

function safe(value) {
  return String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function put(
  page,
  text,
  x,
  top,
  font,
  size = 12,
) {
  const value = safe(text)

  if (!value) return 0

  page.drawText(value, {
    x,
    y:
      PAPER_H -
      top -
      size * 0.89,
    font,
    size,
    color: BLACK,
  })

  return font.widthOfTextAtSize(
    value,
    size,
  )
}

// =====================================================
// WRAP TEXT
// =====================================================

function wrapForBox(
  text,
  font,
  size,
  maxWidth,
) {
  const words = safe(text)
    .split(' ')
    .filter(Boolean)

  const lines = []
  let current = ''

  for (const word of words) {
    const candidate = current
      ? `${current} ${word}`
      : word

    const measured =
      candidate.replace(/₱/g, 'P')

    if (
      font.widthOfTextAtSize(
        measured,
        size,
      ) <= maxWidth
    ) {
      current = candidate
    } else {
      if (current) {
        lines.push(current)
      }

      current = word

      if (
        font.widthOfTextAtSize(
          word.replace(/₱/g, 'P'),
          size,
        ) > maxWidth
      ) {
        return null
      }
    }
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

// =====================================================
// AUTO FIT FONT SIZE
// =====================================================

function fitted(
  text,
  font,
  width,
  maxLines = 1,
  minSize = 9.5,
) {
  for (
    let size = 12;
    size >= minSize;
    size -= 0.25
  ) {
    const lines = wrapForBox(
      text,
      font,
      size,
      width,
    )

    if (
      lines &&
      lines.length <= maxLines
    ) {
      return {
        lines,
        size,
      }
    }
  }

  throw new Error(
    'Text cannot fit in original Bid Form: ' +
    safe(text).slice(0, 60)
  )
}

function drawWrapped(
  page,
  value,
  x,
  top,
  font,
  width,
  maxLines = 2,
) {
  const {
    lines,
    size,
  } = fitted(
    value,
    font,
    width,
    maxLines,
  )

  lines.forEach(
    (line, index) => {
      put(
        page,
        line,
        x,
        top + index * 13.8,
        font,
        size,
      )
    }
  )
}

// =====================================================
// PESO SIGN AND AMOUNT
// =====================================================

function drawMoneyLine(
  page,
  line,
  x,
  top,
  font,
  size,
) {
  let cursor = x

  const parts = line.split('₱')

  for (
    let n = 0;
    n < parts.length;
    n += 1
  ) {
    if (parts[n]) {
      cursor += put(
        page,
        parts[n],
        cursor,
        top,
        font,
        size,
      )
    }

    if (
      n < parts.length - 1
    ) {
      const width = put(
        page,
        'P',
        cursor,
        top,
        font,
        size,
      )

      const baseline =
        PAPER_H -
        top -
        size * 0.89

      for (
        const offset of [
          0.38,
          0.48,
        ]
      ) {
        page.drawLine({
          start: {
            x: cursor,
            y:
              baseline +
              size * offset,
          },
          end: {
            x:
              cursor +
              width * 0.84,
            y:
              baseline +
              size * offset,
          },
          thickness: 0.35,
          color: BLACK,
        })
      }

      cursor += width
    }
  }
}

function drawAmount(
  page,
  bid,
  font,
) {
  const figure =
    bid.amountFormatted.replace(
      /^PHP\s*/i,
      '',
    )

  const value =
    `${bid.amountWords} (₱${figure}).`

  const {
    lines,
    size,
  } = fitted(
    value,
    font,
    MAX_RIGHT - 108,
    2,
  )

  lines.forEach(
    (line, index) => {
      drawMoneyLine(
        page,
        line,
        108,
        325.8 + index * 13.8,
        font,
        size,
      )
    }
  )
}

// =====================================================
// FIX AUTHORIZATION TEXT OVERLAP
// =====================================================

function drawAuthorization(
  page,
  bid,
  regular,
  emphasis,
) {
  const name = safe(
    bid.submittedBy
  )

  const lead =
    'The undersigned is authorized to submit the bid on behalf of'

  const tail =
    'as evidenced by the attached'

  const certificate =
    "Secretary's Certificate."

  const space = {
    text: ' ',
    font: regular,
  }

  // Two possible layouts.
  // Both preserve spaces between words.
  const alternatives = [
    [
      [
        {
          text: lead,
          font: regular,
        },
        space,
        {
          text: name,
          font: emphasis,
        },
      ],
      [
        {
          text: tail,
          font: regular,
        },
        space,
        {
          text: certificate,
          font: emphasis,
        },
      ],
    ],
    [
      [
        {
          text: lead,
          font: regular,
        },
      ],
      [
        {
          text: name,
          font: emphasis,
        },
        space,
        {
          text: tail,
          font: regular,
        },
        space,
        {
          text: certificate,
          font: emphasis,
        },
      ],
    ],
  ]

  // Measure each line before printing.
  const widthOf = (
    runs,
    size,
  ) =>
    runs.reduce(
      (sum, run) =>
        sum +
        run.font.widthOfTextAtSize(
          run.text,
          size,
        ),
      0,
    )

  let chosen = null
  let fontSize = 12

  // Use normal text size if it fits.
  // Reduce slightly only when needed.
  for (
    let size = 12;
    size >= 10;
    size -= 0.25
  ) {
    for (const lines of alternatives) {
      const fits = lines.every(
        (runs) =>
          widthOf(
            runs,
            size,
          ) <= MAX_RIGHT - 72
      )

      if (fits) {
        chosen = lines
        fontSize = size
        break
      }
    }

    if (chosen) break
  }

  if (!chosen) {
    throw new Error(
      'Submitted By is too long for the authorization area.'
    )
  }

  // Clean only the authorization area.
  // Do not erase the paragraph below.
  page.drawRectangle({
    x: 71.5,
    y: PAPER_H - 683.9,
    width: 472,
    height: 29.5,
    color: WHITE,
  })

  // Print exactly two lines.
  chosen.forEach(
    (runs, lineNo) => {
      let x = 72

      for (const run of runs) {
        page.drawText(
          run.text,
          {
            x,
            y:
              PAPER_H -
              (
                656.4 +
                lineNo * 13.8
              ) -
              fontSize * 0.89,
            font: run.font,
            size: fontSize,
            color: BLACK,
          },
        )

        // Important: include space width.
        // Prevents "JAMILOas" overlap.
        x +=
          run.font.widthOfTextAtSize(
            run.text,
            fontSize,
          )
      }
    }
  )
}

// =====================================================
// LOAD ORIGINAL PDF TEMPLATE
// =====================================================

async function loadOriginalLayout() {
  const response = await fetch(
    templateUrl,
    {
      cache: 'no-store',
    },
  )

  if (!response.ok) {
    throw new Error(
      'Bid Form template could not load. HTTP ' +
      response.status
    )
  }

  const content =
    await response.arrayBuffer()

  const firstBytes =
    new TextDecoder().decode(
      content.slice(0, 16)
    )

  if (
    !firstBytes.startsWith('%PDF-')
  ) {
    throw new Error(
      'Invalid Bid Form PDF. Check ' +
      'public/pdf/templates/BID_FORM_CLEAN_TEMPLATE.pdf'
    )
  }

  const pdf =
    await PDFDocument.load(
      content
    )

  if (
    pdf.getPageCount() !== 2
  ) {
    throw new Error(
      'Original Bid Form must have two pages.'
    )
  }

  return pdf
}

// =====================================================
// GENERATE UPDATED BID FORM
// =====================================================

export async function generateBidFormPreview(
  data = {},
) {
  const bid =
    buildBidFormData(data)

  // Check saved Price Schedule
  if (!bid.complete) {
    throw new Error(
      bid.rows.length
        ? (
            'Complete saved Price Schedule for items: ' +
            bid.missingPriceItems.join(', ')
          )
        : (
            'Add Technical Specifications and Price Schedule prices first.'
          )
    )
  }

  // Check Document Setup
  if (
    !bid.referenceNumber ||
    !bid.procuringEntity ||
    !bid.projectTitle ||
    !bid.submittedBy ||
    !bid.bidderName ||
    !bid.date
  ) {
    throw new Error(
      'Complete Reference Number, Procuring Entity, Project Title, Submitted By, Bidder Name and Date.'
    )
  }

  // Load original 2-page template
  const pdf =
    await loadOriginalLayout()

  const [
    page1,
    page2,
  ] = pdf.getPages()

  const regular =
    await pdf.embedFont(
      StandardFonts.TimesRoman
    )

  const italic =
    await pdf.embedFont(
      StandardFonts.TimesRomanItalic
    )

  const boldItalic =
    await pdf.embedFont(
      StandardFonts.TimesRomanBoldItalic
    )

  // ===================================================
  // PAGE 1 - REFERENCE NUMBER
  // ===================================================

  put(
    page1,
    bid.referenceNumber,
    346.4,
    113.9,
    boldItalic,
    fitted(
      bid.referenceNumber,
      boldItalic,
      190,
      1,
    ).size,
  )

  // ===================================================
  // PAGE 1 - PROCURING ENTITY
  // ===================================================

  put(
    page1,
    bid.procuringEntity,
    91.7,
    153.5,
    boldItalic,
    fitted(
      bid.procuringEntity,
      boldItalic,
      451,
      1,
    ).size,
  )

  // ===================================================
  // PAGE 1 - PROJECT TITLE
  // ===================================================

  drawWrapped(
    page1,
    bid.projectTitle,
    108,
    246.5,
    boldItalic,
    435,
    2,
  )

  // ===================================================
  // PAGE 1 - AUTO TOTAL BID PRICE
  // ===================================================

  drawAmount(
    page1,
    bid,
    boldItalic,
  )

  // ===================================================
  // PAGE 1 - FIXED AUTHORIZATION PARAGRAPH
  // ===================================================

  drawAuthorization(
    page1,
    bid,
    regular,
    boldItalic,
  )

  // ===================================================
  // PAGE 2 - BIDDER NAME
  // ===================================================

  put(
    page2,
    bid.bidderName,
    72,
    139.7,
    boldItalic,
    fitted(
      bid.bidderName,
      boldItalic,
      470,
      1,
    ).size,
  )

  // ===================================================
  // PAGE 2 - SUBMITTED BY
  // ===================================================

  put(
    page2,
    bid.submittedBy,
    72,
    194.9,
    boldItalic,
    fitted(
      bid.submittedBy,
      boldItalic,
      470,
      1,
    ).size,
  )

  // ===================================================
  // PAGE 2 - DESIGNATION
  // ===================================================

  const designation =
    bid.designation ||
    'Authorized Representative'

  put(
    page2,
    designation,
    72,
    208.7,
    italic,
    fitted(
      designation,
      italic,
      470,
      1,
    ).size,
  )

  // ===================================================
  // PAGE 2 - DATE
  // ===================================================

  put(
    page2,
    bid.date,
    72,
    222.5,
    boldItalic,
    fitted(
      bid.date,
      boldItalic,
      470,
      1,
    ).size,
  )

  // ===================================================
  // EXPORT PDF
  // ===================================================

  const bytes = await pdf.save({
    useObjectStreams: false,
  })

  const blob = new Blob(
    [bytes],
    {
      type: 'application/pdf',
    },
  )

  return URL.createObjectURL(blob)
}
