
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// =====================================================
// PAGE CONFIGURATION - A4 LANDSCAPE
// =====================================================

const W = 841.89
const H = 595.28
const LEFT = 36
const BOTTOM = 38

const WIDTHS = [
  40, 154, 48, 42, 42, 70,
  80, 80, 68, 72, 72,
]

const TOTAL_W = WIDTHS.reduce((a, b) => a + b, 0)

const EDGE = WIDTHS.reduce(
  (arr, width) => [...arr, arr.at(-1) + width],
  [LEFT]
)

const BLACK = rgb(0.08, 0.08, 0.08)
const BORDER = rgb(0.35, 0.35, 0.35)
const RED = rgb(0.75, 0.08, 0.08)

// =====================================================
// TABLE HEADERS
// =====================================================

const HEADERS = [
  'Item\nNo.',
  'Specification/s',
  'Country\nof Origin',
  'Qty',
  'Unit',
  'Unit\nPrice/Item',
  'Transportation &\nInsurance and\nAll Other Costs\nIncidental to',
  'Sales & Other\nTaxes Payable\nif Contract is\nAwarded per Item',
  'Cost of\nIncidental\nServices, if\napplicable,\nper Item',
  'Total Price\nper Unit\n(100%)',
  'Total Price\nDelivered\nFinal\nDestination',
]

// =====================================================
// TEXT HELPERS
// =====================================================

function safe(value) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/[\u2022\u25cf\u25cb\u25a0]/g, '*')
    .replace(/[\u2713\u2714]/g, 'v')
    .replace(/[\u279e\u27a2]/g, '>')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) =>
      line.replace(/[^\x20-\x7e\xa1-\xff]/g, '?')
    )
    .join('\n')
}

// =====================================================
// PRICE CALCULATIONS
// =====================================================

function pesoCents(value) {
  const n = Number(
    String(value ?? '').replace(/,/g, '')
  )

  return Number.isFinite(n) && n > 0
    ? Math.round(n * 100)
    : 0
}

function money(cents) {
  return (cents / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getEntry(values, item, index) {
  const key = String(
    item?.id ?? `item-${index + 1}`
  )

  const value =
    values?.[key] ??
    values?.[String(index + 1)] ??
    values?.[index] ??
    {}

  if (
    typeof value !== 'object' ||
    value === null
  ) {
    return {
      price: pesoCents(value),
      deduction: 0,
      hasPrice: value !== '',
    }
  }

  const rawPrice =
    value.price ??
    value.totalPricePerUnit ??
    ''

  return {
    price: pesoCents(rawPrice),
    deduction: pesoCents(value.deduction),
    hasPrice: String(rawPrice).trim() !== '',
  }
}

function dateLabel(input) {
  const value = safe(input)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const [year, month, day] =
    value.split('-').map(Number)

  const date = new Date(
    Date.UTC(year, month - 1, day)
  )

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return value
  }

  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// =====================================================
// TEXT WRAPPING
// =====================================================

function wrap(value, font, size, width) {
  const lines = []

  for (const para of safe(value).split('\n')) {
    const words = para
      .split(/\s+/)
      .filter(Boolean)

    if (!words.length) {
      lines.push('')
      continue
    }

    let current = ''

    for (const word of words) {
      const candidate = current
        ? `${current} ${word}`
        : word

      if (
        font.widthOfTextAtSize(candidate, size) <=
        width
      ) {
        current = candidate
        continue
      }

      if (current) {
        lines.push(current)
      }

      let rest = word

      while (
        rest &&
        font.widthOfTextAtSize(rest, size) > width
      ) {
        let length = 1

        while (
          length < rest.length &&
          font.widthOfTextAtSize(
            rest.slice(0, length + 1),
            size
          ) <= width
        ) {
          length += 1
        }

        lines.push(rest.slice(0, length))
        rest = rest.slice(length)
      }

      current = rest
    }

    if (current) {
      lines.push(current)
    }
  }

  return lines.length ? lines : ['']
}

// =====================================================
// TABLE DRAWING HELPERS
// =====================================================

function rect(page, x, top, width, height) {
  page.drawRectangle({
    x,
    y: top - height,
    width,
    height,
    borderColor: BORDER,
    borderWidth: 0.55,
  })
}

function line(page, x1, y1, x2, y2) {
  page.drawLine({
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    color: BORDER,
    thickness: 0.5,
  })
}

function boxText(
  page,
  value,
  x,
  top,
  width,
  height,
  font,
  options = {}
) {
  let size = options.size ?? 8
  const centered = options.align !== 'left'

  let parts = wrap(
    value,
    font,
    size,
    width - 6
  )

  while (
    size > 6.1 &&
    parts.length * (size + 1.6) > height - 4
  ) {
    size -= 0.5

    parts = wrap(
      value,
      font,
      size,
      width - 6
    )
  }

  const leading = size + 1.5

  const start =
    top -
    (height - parts.length * leading) / 2 -
    size

  parts.forEach((part, i) => {
    const textWidth =
      font.widthOfTextAtSize(part, size)

    page.drawText(part, {
      x: centered
        ? x + Math.max(2, (width - textWidth) / 2)
        : x + 3,
      y: start - i * leading,
      font,
      size,
      color: options.color ?? BLACK,
    })
  })
}

// =====================================================
// GENERATE LIVE PRICE SCHEDULE PDF
// =====================================================

export async function generatePriceSchedulePreview(
  data = {}
) {
  const doc = await PDFDocument.create()

  const regular = await doc.embedFont(
    StandardFonts.TimesRoman
  )

  const bold = await doc.embedFont(
    StandardFonts.TimesRomanBold
  )

  const items = Array.isArray(data.items)
    ? data.items
    : []

  const values = data.priceValues ?? {}

  let page
  let cursor = 0
  let grandTotal = 0
  let pageNumber = 0

  // ===================================================
  // CREATE PAGE
  // TITLE AND TOP LINE ON FIRST PAGE ONLY
  // ===================================================

  function newPage() {
    pageNumber += 1

    page = doc.addPage([W, H])

    // Subsequent pages start with table headers.
    let top = H - 36

    if (pageNumber === 1) {
      // ===============================================
      // FIRST PAGE TITLE
      // ===============================================

      const title = 'PRICE SCHEDULE FOR GOODS'
      const titleSize = 12

      page.drawText(title, {
        x:
          (W -
            bold.widthOfTextAtSize(
              title,
              titleSize
            )) / 2,
        y: 562,
        font: bold,
        size: titleSize,
        color: BLACK,
      })

      // Horizontal line - first page only.
      line(
        page,
        LEFT,
        548,
        LEFT + TOTAL_W,
        548
      )

      top = 531

      // ===============================================
      // BIDDER DETAILS - FIRST PAGE ONLY
      // ===============================================

      page.drawText('Name of Bidder:', {
        x: LEFT,
        y: top,
        font: regular,
        size: 9.2,
      })

      page.drawText(
        safe(data.bidderName),
        {
          x: LEFT + 85,
          y: top,
          font: bold,
          size: 9.2,
        }
      )

      page.drawText('Project ID No.:', {
        x: 455,
        y: top,
        font: regular,
        size: 9.2,
      })

      page.drawText(
        safe(data.referenceNumber),
        {
          x: 540,
          y: top,
          font: bold,
          size: 9.2,
        }
      )

      top -= 18

      page.drawText(
        'Pricing Details for Goods Offered from Within the Philippines',
        {
          x: LEFT,
          y: top,
          font: regular,
          size: 9.2,
        }
      )

      top -= 11
    }

    // ===============================================
    // TABLE HEADER - ALL PAGES
    // ===============================================

    const headH = 81

    rect(
      page,
      LEFT,
      top,
      TOTAL_W,
      headH
    )

    for (
      let i = 1;
      i < EDGE.length - 1;
      i++
    ) {
      line(
        page,
        EDGE[i],
        top,
        EDGE[i],
        top - headH
      )
    }

    HEADERS.forEach((header, col) => {
      boxText(
        page,
        header,
        EDGE[col],
        top,
        WIDTHS[col],
        headH,
        bold,
        { size: 7.4 }
      )
    })

    cursor = top - headH
  }

  // Create the first page.
  newPage()

  // ===================================================
  // LOAD ALL ITEMS FROM TECHNICAL SPECIFICATIONS
  // ===================================================

  items.forEach((item, index) => {
    const entry = getEntry(
      values,
      item,
      index
    )

    // ===============================================
    // PRICE COMPUTATION
    // ===============================================

    const adjusted = Math.max(
      0,
      entry.price - entry.deduction
    )

    const unit50 = Math.round(
      adjusted * 0.5
    )

    const transport20 = Math.round(
      adjusted * 0.2
    )

    const sales30 =
      adjusted - unit50 - transport20

    const qty = Math.max(
      0,
      Number(
        String(item.qty ?? '').replace(/,/g, '')
      ) || 0
    )

    const finalPrice = Math.round(
      adjusted * qty
    )

    if (entry.hasPrice) {
      grandTotal += finalPrice
    }

    // ===============================================
    // TECHNICAL SPECIFICATION LINES
    // ===============================================

    const rows =
      Array.isArray(item.specificationLines) &&
      item.specificationLines.length
        ? item.specificationLines
        : [{ text: '' }]

    const specRows = rows.map((row) => {
      const chosenFont = row?.bold
        ? bold
        : regular

      const marker =
        row?.marker &&
        row.marker !== 'None'
          ? `${safe(row.marker)} `
          : ''

      const text =
        `${marker}${row?.text ?? ''}`

      const parts = wrap(
        text,
        chosenFont,
        8.3,
        WIDTHS[1] - 8
      )

      return {
        parts,
        font: chosenFont,
        height: Math.max(
          18,
          parts.length * 10.2 + 7
        ),
      }
    })

    // ===============================================
    // AUTOMATIC PAGE BREAKS
    // ===============================================

    let rowPosition = 0
    let firstFragment = true

    while (rowPosition < specRows.length) {
      if (cursor < BOTTOM + 26) {
        newPage()
      }

      const start = rowPosition
      let height = 0

      const maxHeight = cursor - BOTTOM

      // Add specification lines that fit on the page.
      while (
        rowPosition < specRows.length &&
        height + specRows[rowPosition].height <=
          maxHeight
      ) {
        height += specRows[rowPosition].height
        rowPosition += 1
      }

      // =============================================
      // SPLIT VERY LONG SPECIFICATION ROWS
      // =============================================

      if (start === rowPosition) {
        const current = specRows[rowPosition]

        const maxParts = Math.max(
          1,
          Math.floor(
            (maxHeight - 7) / 10.2
          )
        )

        const take = current.parts.splice(
          0,
          maxParts
        )

        const partialHeight = Math.max(
          18,
          take.length * 10.2 + 7
        )

        specRows.splice(rowPosition, 0, {
          parts: take,
          font: current.font,
          height: partialHeight,
        })

        current.height = Math.max(
          18,
          current.parts.length * 10.2 + 7
        )

        height = partialHeight
        rowPosition += 1
      }

      const top = cursor

      // =============================================
      // DRAW COMPLETE TABLE ROW
      // =============================================

      rect(
        page,
        LEFT,
        top,
        TOTAL_W,
        height
      )

      // Vertical column lines.
      for (
        let col = 1;
        col < EDGE.length - 1;
        col++
      ) {
        line(
          page,
          EDGE[col],
          top,
          EDGE[col],
          top - height
        )
      }

      // =============================================
      // SPECIFICATION ROW CONTENT
      // =============================================

      let subTop = top

      for (
        let i = start;
        i < rowPosition;
        i++
      ) {
        const row = specRows[i]

        boxText(
          page,
          row.parts.join('\n'),
          EDGE[1],
          subTop,
          WIDTHS[1],
          row.height,
          row.font,
          {
            align: 'left',
            size: 8.3,
          }
        )

        subTop -= row.height

        // Horizontal lines separating specifications.
        if (i < rowPosition - 1) {
          line(
            page,
            EDGE[1],
            subTop,
            EDGE[2],
            subTop
          )
        }
      }

      // =============================================
      // ITEM NUMBER, QTY, UNIT AND PRICES
      // =============================================

      if (firstFragment) {
        const display = (value) =>
          entry.hasPrice
            ? money(value)
            : ''

        const fields = [
          safe(item.itemNo || index + 1),
          null,
          safe(
            item.countryOfOrigin ||
            item.country ||
            'PHL'
          ),
          safe(item.qty),
          safe(item.unit),
          display(unit50),
          display(transport20),
          display(sales30),
          '',
          display(adjusted),
          display(finalPrice),
        ]

        fields.forEach((field, column) => {
          if (column === 1 || !field) {
            return
          }

          boxText(
            page,
            field,
            EDGE[column],
            top,
            WIDTHS[column],
            height,
            column >= 5 ? bold : regular,
            {
              size:
                column >= 5 ? 7.8 : 8.4,
              color:
                column === 2 ||
                column === 10
                  ? RED
                  : BLACK,
            }
          )
        })
      }

      cursor -= height
      firstFragment = false

      // Continue the same item on another page
      // without repeating the document title.
      if (rowPosition < specRows.length) {
        newPage()
      }
    }
  })

  // ===================================================
  // GRAND TOTAL
  // ===================================================

  if (cursor < BOTTOM + 135) {
    newPage()
  }

  const totalHeight = 24

  rect(
    page,
    LEFT,
    cursor,
    TOTAL_W,
    totalHeight
  )

  line(
    page,
    EDGE[9],
    cursor,
    EDGE[9],
    cursor - totalHeight
  )

  line(
    page,
    EDGE[10],
    cursor,
    EDGE[10],
    cursor - totalHeight
  )

  boxText(
    page,
    'TOTAL',
    EDGE[9],
    cursor,
    WIDTHS[9],
    totalHeight,
    bold,
    { size: 9 }
  )

  boxText(
    page,
    money(grandTotal),
    EDGE[10],
    cursor,
    WIDTHS[10],
    totalHeight,
    bold,
    {
      size: 8.5,
      color: RED,
    }
  )

  cursor -= totalHeight

 
  // ===================================================
  // SIGNATURE - LAST PAGE ONLY
  // FIXED ALIGNMENT AND SPACING
  // ===================================================

  const signTop = cursor - 28

  const labelX = LEFT
  const colonX = LEFT + 90
  const valueX = LEFT + 116

  function drawSignatureRow(label, value, y) {
    page.drawText(label, {
      x: labelX,
      y,
      font: regular,
      size: 9.5,
      color: BLACK,
    })

    page.drawText(':', {
      x: colonX,
      y,
      font: regular,
      size: 9.5,
      color: BLACK,
    })

    page.drawText(safe(value), {
      x: valueX,
      y,
      font: bold,
      size: 9.5,
      color: BLACK,
    })
  }

  // SUBMITTED BY
  drawSignatureRow(
    'Submitted by',
    data.submittedBy ||
      data.authorizedRepresentative,
    signTop
  )

  // PRINTED NAME & SIGNATURE
  page.drawText(
    '(Printed Name & Signature)',
    {
      x: valueX,
      y: signTop - 14,
      font: regular,
      size: 7.5,
      color: BLACK,
    }
  )

  // DESIGNATION - EXTRA SPACE BELOW SIGNATURE
  drawSignatureRow(
    'Designation',
    data.designation ||
      data.representativeDesignation,
    signTop - 36
  )

  // NAME OF FIRM
  drawSignatureRow(
    'Name of Firm',
    data.bidderName,
    signTop - 54
  )

  // DATE
  drawSignatureRow(
    'Date',
    dateLabel(data.date),
    signTop - 72
  )


  // ===================================================
  // SAVE PDF FOR LIVE PREVIEW AND DOWNLOAD
  // ===================================================

  const bytes = await doc.save({
    useObjectStreams: false,
  })

  return URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/pdf',
    })
  )
}
