
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

// A4 PORTRAIT
const PAGE_W = 595.28
const PAGE_H = 841.89

const LEFT = 44
const RIGHT = 44
const BOTTOM = 65

const TABLE_W = PAGE_W - LEFT - RIGHT

// Item No | Specifications | Qty | Unit | Delivery
const WIDTHS = [
  49,
  255,
  49,
  53,
  TABLE_W - 406,
]

const X = [LEFT]

for (const width of WIDTHS) {
  X.push(X[X.length - 1] + width)
}

const BLACK = rgb(0, 0, 0)

// ==========================================
// TEXT HELPERS
// ==========================================

function safe(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '?')
}

function wrapText(
  text,
  font,
  size,
  maxWidth
) {
  const output = []

  const paragraphs = safe(text).split('\n')

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      output.push('')
      continue
    }

    let current = ''

    const words = paragraph
      .trim()
      .split(/\s+/)

    for (const word of words) {
      const candidate = current
        ? `${current} ${word}`
        : word

      if (
        font.widthOfTextAtSize(
          candidate,
          size
        ) <= maxWidth
      ) {
        current = candidate
        continue
      }

        if (current) {
        output.push(current)
        }

      // Break exceptionally long words.
      if (
        font.widthOfTextAtSize(
          word,
          size
        ) > maxWidth
      ) {
        let segment = ''

        for (const character of word) {
          const test = segment + character

          if (
            segment &&
            font.widthOfTextAtSize(
              test,
              size
            ) > maxWidth
          ) {
            output.push(segment)
            segment = character
          } else {
            segment = test
          }
        }

        current = segment
      } else {
        current = word
      }
    }

    if (current) {
      output.push(current)
    }
  }

  return output.length ? output : ['']
}

function drawLine(
  page,
  x1,
  y1,
  x2,
  y2,
  thickness = 0.6
) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    thickness,
    color: BLACK,
  })
}

function drawCentered(
  page,
  text,
  font,
  size,
  left,
  width,
  y
) {
  const value = safe(text)

  const textWidth = font.widthOfTextAtSize(
    value,
    size
  )

  page.drawText(value, {
    x: left + (width - textWidth) / 2,
    y,
    size,
    font,
    color: BLACK,
  })
}

function drawCenteredLines(
  page,
  text,
  font,
  size,
  left,
  width,
  middleY
) {
  const rows = wrapText(
    text,
    font,
    size,
    width - 8
  )

  const leading = size + 2

  const firstY =
    middleY +
    ((rows.length - 1) * leading) / 2

  rows.forEach((row, index) => {
    drawCentered(
      page,
      row,
      font,
      size,
      left,
      width,
      firstY - index * leading
    )
  })
}

function drawMarker(
  page,
  marker,
  x,
  y
) {
  switch (marker) {
    case '✓':
      drawLine(
        page, x, y + 3,
        x + 3, y,
        1.1
      )

      drawLine(
        page, x + 3, y,
        x + 9, y + 8,
        1.1
      )
      break

    case '•':
      page.drawCircle({
        x: x + 4,
        y: y + 4,
        size: 2,
        color: BLACK,
      })
      break

    case '○':
      page.drawCircle({
        x: x + 4,
        y: y + 4,
        size: 3,
        borderWidth: 0.8,
        borderColor: BLACK,
      })
      break

    case '■':
      page.drawRectangle({
        x,
        y: y + 1,
        width: 7,
        height: 7,
        color: BLACK,
      })
      break

    case '➢':
      drawLine(
        page,
        x,
        y + 2,
        x + 8,
        y + 5
      )

      drawLine(
        page,
        x,
        y + 8,
        x + 8,
        y + 5
      )
      break

    default:
      break
  }
}

function printableDate(value) {
  const text = String(value ?? '').trim()

  const match = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  )

  if (!match) return text

  const [, year, month, day] = match

  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day)
    )
  )

  if (Number.isNaN(date.getTime())) {
    return text
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(date)
}

// ==========================================
// PREPARE SPECIFICATION LINES
// ==========================================

function createRows(item, fonts) {
  const sourceLines = Array.isArray(
    item.specificationLines
  )
    ? item.specificationLines
    : []

  const output = []

  const visibleLines = sourceLines.filter(
    (line) =>
      String(line?.text ?? '').trim()
  )

  if (!visibleLines.length) {
    visibleLines.push({
      text: '',
      marker: '',
      bold: false,
    })
  }

  for (const source of visibleLines) {
    const font = source.bold
      ? fonts.bold
      : fonts.normal

    const marker = String(
      source.marker ?? ''
    )

    const availableWidth =
      WIDTHS[1] -
      (marker ? 24 : 12)

    const wrapped = wrapText(
      source.text,
      font,
      9.2,
      availableWidth
    )

    // Split very long specification lines
    // so a single row cannot exceed A4.
    for (
      let start = 0;
      start < wrapped.length;
      start += 35
    ) {
      const part = wrapped.slice(
        start,
        start + 35
      )

      output.push({
        lines: part,
        marker: start === 0 ? marker : '',
        bold: source.bold === true,
        height: Math.max(
          23,
          part.length * 11.4 + 10
        ),
      })
    }
  }

  return output
}

// ==========================================
// GENERATE SCHEDULE PDF
// ==========================================

export async function generateScheduleRequirementsPreview(
  data = {}
) {
  const doc = await PDFDocument.create()

  const fonts = {
    normal: await doc.embedFont(
      StandardFonts.TimesRoman
    ),

    bold: await doc.embedFont(
      StandardFonts.TimesRomanBold
    ),

    italic: await doc.embedFont(
      StandardFonts.TimesRomanItalic
    ),
  }

  const items = Array.isArray(data.items)
    ? data.items
    : []

  const projectTitle =
    data.projectTitle ?? ''

  const procuringEntity =
    data.procuringEntity ??
    [
      data.municipality,
      data.province,
    ].filter(Boolean).join(', ')

  const referenceNumber =
    data.referenceNumber ?? ''

  const submittedBy =
    data.submittedBy ??
    data.authorizedRepresentative ??
    ''

  const designation =
    data.designation ??
    data.representativeDesignation ??
    ''

  const bidderName =
    data.bidderName ?? ''

  const date = printableDate(
    data.date ?? ''
  )

  doc.setTitle('Schedule of Requirements')

  let page
  let y

  // ========================================
  // PAGE AND HEADER
  // ========================================

  function addPage(firstPage = false) {
    page = doc.addPage([
      PAGE_W,
      PAGE_H,
    ])

    if (firstPage) {
      drawCentered(
        page,
        'Schedule of Requirements',
        fonts.bold,
        16,
        0,
        PAGE_W,
        793
      )

      y = 758

      const fields = [
        [
          'NAME OF THE PROCURING ENTITY',
          procuringEntity,
        ],
        ['PROJECT TITLE', projectTitle],
        [
          'REFERENCE NUMBER',
          referenceNumber,
        ],
      ]

      for (const [label, value] of fields) {
        const rows = wrapText(
          value,
          fonts.bold,
          10,
          PAGE_W - 245
        )

        page.drawText(
          safe(label),
          {
            x: LEFT + 4,
            y,
            size: 9.8,
            font: fonts.normal,
            color: BLACK,
          }
        )

        page.drawText(':', {
          x: 221,
          y,
          size: 10,
          font: fonts.normal,
          color: BLACK,
        })

        rows.forEach((row, index) => {
          page.drawText(
            row,
            {
              x: 240,
              y: y - index * 12,
              size: 10,
              font: fonts.bold,
              color: BLACK,
            }
          )
        })

        y -= Math.max(
          1,
          rows.length
        ) * 12 + 5
      }

      y -= 2

      const note =
        'The delivery schedule is expressed as weeks/month stipulated share after a delivery date which is the date of delivery to the project site.'

      const noteRows = wrapText(
        note,
        fonts.normal,
        10,
        TABLE_W
      )

      for (const row of noteRows) {
        page.drawText(row, {
          x: LEFT,
          y,
          size: 10,
          font: fonts.normal,
          color: BLACK,
        })

        y -= 12
      }

      y -= 7
    } else {
      // Continuation pages have no extra title.
      y = PAGE_H - 47
    }

    drawTableHeader()
  }

  // ========================================
  // TABLE HEADER
  // ========================================

  function drawTableHeader() {
    const top = y
    const height = 45
    const bottom = top - height

    drawLine(
      page,
      LEFT,
      top,
      LEFT + TABLE_W,
      top
    )

    drawLine(
      page,
      LEFT,
      bottom,
      LEFT + TABLE_W,
      bottom
    )

    for (const x of X) {
      drawLine(
        page,
        x,
        top,
        x,
        bottom
      )
    }

    const headers = [
      'Item\nNo.',
      'Specification/s',
      'Qty',
      'Unit',
      'Delivered\nWeeks/Months',
    ]

    headers.forEach((header, index) => {
      drawCenteredLines(
        page,
        header,
        fonts.bold,
        10,
        X[index],
        WIDTHS[index],
        (top + bottom) / 2 - 3
      )
    })

    y = bottom
  }

  // ========================================
  // DRAW ONE ITEM TABLE SEGMENT
  // ========================================

  function drawGroup(
    item,
    rows,
    firstFragment
  ) {
    const top = y

    const totalHeight = rows.reduce(
      (sum, row) => sum + row.height,
      0
    )

    const bottom = top - totalHeight

    // Aligned vertical column borders.
    for (const x of X) {
      drawLine(
        page,
        x,
        top,
        x,
        bottom
      )
    }

    let cursorTop = top

    rows.forEach((row, rowIndex) => {
      if (rowIndex > 0) {
        // Row separator only inside
        // the Specifications column.
        drawLine(
          page,
          X[1],
          cursorTop,
          X[2],
          cursorTop
        )
      }

      const font = row.bold
        ? fonts.bold
        : fonts.normal

      const textX =
        X[1] + (
          row.marker ? 19 : 5
        )

      const textY = cursorTop - 13

      if (row.marker) {
        drawMarker(
          page,
          row.marker,
          X[1] + 6,
          textY
        )
      }

      row.lines.forEach(
        (text, index) => {
          if (!text) return

          page.drawText(
            text,
            {
              x: textX,
              y: textY - index * 11.4,
              size: 9.2,
              font,
              color: BLACK,
            }
          )
        }
      )

      cursorTop -= row.height
    })

    // Full-width bottom border.
    drawLine(
      page,
      LEFT,
      bottom,
      LEFT + TABLE_W,
      bottom
    )

    // The shared columns appear only
    // on the first fragment of the item.
    if (firstFragment) {
      const middle =
        (top + bottom) / 2 - 3

      drawCenteredLines(
        page,
        item.itemNo ?? '',
        fonts.normal,
        9.5,
        X[0],
        WIDTHS[0],
        middle
      )

      drawCenteredLines(
        page,
        item.qty ?? '',
        fonts.normal,
        9.5,
        X[2],
        WIDTHS[2],
        middle
      )

      drawCenteredLines(
        page,
        item.unit ?? '',
        fonts.normal,
        9.5,
        X[3],
        WIDTHS[3],
        middle
      )

      drawCenteredLines(
        page,
        item.deliveryPeriod ?? '',
        fonts.bold,
        9.5,
        X[4],
        WIDTHS[4],
        middle
      )
    }

    y = bottom
  }

  // ========================================
  // BUILD DYNAMIC TABLE
  // ========================================

  addPage(true)

  for (let itemIndex = 0;
    itemIndex < items.length;
    itemIndex += 1
  ) {
    const item = {
      ...items[itemIndex],
      itemNo: String(
        itemIndex + 1
      ),
    }

    const rows = createRows(
      item,
      fonts
    )

    const periodRows = wrapText(
      item.deliveryPeriod ?? '',
      fonts.bold,
      9.5,
      WIDTHS[4] - 9
    )

    // Reserve enough space for
    // a long Delivery Period.
    if (rows.length) {
      rows[0].height = Math.max(
        rows[0].height,
        periodRows.length * 11.5 + 10
      )
    }

    let nextIndex = 0

    while (nextIndex < rows.length) {
      const segment = []

      let available =
        y - BOTTOM

      while (nextIndex < rows.length) {
        const row = rows[nextIndex]

        if (row.height > available) {
          break
        }

        segment.push(row)

        available -= row.height

        nextIndex += 1
      }

      // Not enough room: continue on
      // the next A4 page.
      if (!segment.length) {
        addPage(false)
        continue
      }

      const firstFragment =
        nextIndex - segment.length === 0

      drawGroup(
        item,
        segment,
        firstFragment
      )

      if (nextIndex < rows.length) {
        addPage(false)
      }
    }
  }

  // ========================================
  // SIGNATURE - ALWAYS AT END
  // ========================================

  if (y < 185) {
    page = doc.addPage([
      PAGE_W,
      PAGE_H,
    ])

    y = PAGE_H - 90
  } else {
    y -= 42
  }

  function signatureField(
    label,
    value,
    font = fonts.bold
  ) {
    page.drawText(
      safe(label),
      {
        x: LEFT,
        y,
        size: 10.5,
        font: fonts.normal,
        color: BLACK,
      }
    )

    page.drawText(':', {
      x: LEFT + 102,
      y,
      size: 10,
      font: fonts.normal,
      color: BLACK,
    })

    const rows = wrapText(
      value,
      font,
      10.5,
      PAGE_W - LEFT - 175
    )

    rows.forEach((row, index) => {
      page.drawText(
        row,
        {
          x: LEFT + 145,
          y: y - index * 12,
          size: 10.5,
          font,
          color: BLACK,
        }
      )
    })

    y -= Math.max(
      1,
      rows.length
    ) * 16 + 5
  }

  signatureField(
    'Submitted by',
    submittedBy
  )

  page.drawText(
    '(Printed Name & Signature)',
    {
      x: LEFT + 145,
      y: y + 6,
      size: 8.5,
      font: fonts.italic,
      color: BLACK,
    }
  )

  y -= 12

  signatureField(
    'Designation',
    designation
  )

  signatureField(
    'Name of Firm',
    bidderName
  )

  signatureField(
    'Date',
    date
  )

  // ========================================
  // RETURN LIVE PDF OBJECT URL
  // ========================================

  const bytes = await doc.save({
    useObjectStreams: false,
  })

  const blob = new Blob(
    [bytes],
    {
      type: 'application/pdf',
    }
  )

  return URL.createObjectURL(blob)
}
