
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

import {
  summaryRows,
  summaryTotal,
} from '../../lib/summaryPrices'

// =====================================================
// A4 PORTRAIT
// =====================================================

const PAGE_W = 595.28
const PAGE_H = 841.89

const MARGIN = 36
const TABLE_W = PAGE_W - 2 * MARGIN

const COL_ITEM = 42
const COL_PRICE = 145
const COL_DESC =
  TABLE_W - COL_ITEM - COL_PRICE

const ROW_LINE = 12

const GRID = rgb(0.3, 0.3, 0.3)
const INK = rgb(0.05, 0.05, 0.05)
const RED = rgb(0.7, 0.05, 0.05)

const FOOTER_LIMIT = 160

// =====================================================
// HELPERS
// =====================================================

function printable(value) {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u2713\u2714]/g, 'v')
    .replace(/[\u25cf\u25cb\u25a0\u2022]/g, '*')
    .replace(/[\u279e]/g, '>')
    .replace(/[^\x20-\x7e\xa1-\xff]/g, ' ')
}


function wrapText(value, font, size, width) {
  const text = printable(value)

  if (!text.trim()) {
    return ['']
  }

  const out = []
  let current = ''

  const words = text
    .split(/\s+/)
    .filter(Boolean)

  for (const word of words) {
    const joined = current
      ? `${current} ${word}`
      : word

    if (
      font.widthOfTextAtSize(joined, size) <= width
    ) {
      current = joined
      continue
    }

    if (current) {
      out.push(current)
    }

    // If the word fits, start a new line.
    if (
      font.widthOfTextAtSize(word, size) <= width
    ) {
      current = word
      continue
    }

    // Break long words without overflowing.
    let remaining = word

    while (
      remaining.length > 0 &&
      font.widthOfTextAtSize(
        remaining,
        size
      ) > width
    ) {
      let length = 1

      while (
        length < remaining.length &&
        font.widthOfTextAtSize(
          remaining.slice(0, length + 1),
          size
        ) <= width
      ) {
        length += 1
      }

      out.push(
        remaining.slice(0, length)
      )

      remaining = remaining.slice(length)
    }

    current = remaining
  }

  if (current) {
    out.push(current)
  }

  return out.length ? out : ['']
}


function fmt(cents) {
  return (cents / 100).toLocaleString(
    'en-PH',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )
}

// =====================================================
// MAIN PDF GENERATOR
// =====================================================

export async function generateSummaryPreview(
  data = {}
) {
  const pdf = await PDFDocument.create()

  const regular = await pdf.embedFont(
    StandardFonts.TimesRoman
  )

  const bold = await pdf.embedFont(
    StandardFonts.TimesRomanBold
  )

  const italic = await pdf.embedFont(
    StandardFonts.TimesRomanItalic
  )

  const rows = summaryRows(
    data.items,
    data.priceValues
  )

  const total = summaryTotal(rows)

  const hasPrice = rows.some(
    (row) => row.hasPrice
  )

  let page
  let cursor = 0
  let pageNo = 0

  // ===================================================
  // DRAWING HELPERS
  // ===================================================

  function drawBox(
    x,
    top,
    width,
    height
  ) {
    page.drawRectangle({
      x,
      y: top - height,
      width,
      height,
      borderColor: GRID,
      borderWidth: 0.55,
    })
  }

  function drawText(
    text,
    x,
    y,
    font = regular,
    size = 9,
    color = INK
  ) {
    page.drawText(
      printable(text),
      {
        x,
        y,
        size,
        font,
        color,
      }
    )
  }

  function centered(
    text,
    x,
    width,
    y,
    font = bold,
    size = 9,
    color = INK
  ) {
    const str = printable(text)

    const textWidth =
      font.widthOfTextAtSize(
        str,
        size
      )

    drawText(
      str,
      x + (width - textWidth) / 2,
      y,
      font,
      size,
      color
    )
  }

  // ===================================================
  // TABLE HEADER
  // ===================================================

  function tableHeader() {
    const h = 31

    drawBox(
      MARGIN,
      cursor,
      TABLE_W,
      h
    )

    page.drawLine({
      start: {
        x: MARGIN + COL_ITEM,
        y: cursor,
      },
      end: {
        x: MARGIN + COL_ITEM,
        y: cursor - h,
      },
      color: GRID,
      thickness: 0.55,
    })

    page.drawLine({
      start: {
        x: MARGIN + COL_ITEM + COL_DESC,
        y: cursor,
      },
      end: {
        x: MARGIN + COL_ITEM + COL_DESC,
        y: cursor - h,
      },
      color: GRID,
      thickness: 0.55,
    })

    centered(
      'Item',
      MARGIN,
      COL_ITEM,
      cursor - 13
    )

    centered(
      'No.',
      MARGIN,
      COL_ITEM,
      cursor - 24
    )

    centered(
      'Description/s',
      MARGIN + COL_ITEM,
      COL_DESC,
      cursor - 19,
      bold,
      10
    )

    cursor -= h
  }

  // ===================================================
  // CREATE PAGE
  // ===================================================

  function newPage() {
    page = pdf.addPage([
      PAGE_W,
      PAGE_H,
    ])

    pageNo += 1

    // Title only on first page.
    if (pageNo === 1) {
      centered(
        'SUMMARY OF BID PRICES',
        0,
        PAGE_W,
        PAGE_H - 52,
        bold,
        15
      )

      const subtitle =
        'The Procuring Entity may modify the table below as necessary to comply with the requirements of the Procurement Project'

      const parts = wrapText(
        subtitle,
        italic,
        9,
        TABLE_W
      )

      parts.forEach(
        (part, index) => {
          centered(
            part,
            MARGIN,
            TABLE_W,
            PAGE_H - 74 - index * 12,
            italic,
            9
          )
        }
      )

      cursor =
        PAGE_H -
        92 -
        (parts.length - 1) * 12
    } else {
      // Second page onwards:
      // No repeated document title or subtitle.
      cursor = PAGE_H - 42
    }

    tableHeader()

    // Specifications heading - first page only.
    if (pageNo === 1) {
      const h = 23

      drawBox(
        MARGIN,
        cursor,
        TABLE_W,
        h
      )

      drawText(
        'Specifications:',
        MARGIN + 4,
        cursor - 15,
        bold,
        10
      )

      cursor -= h
    }
  }

  newPage()

  // ===================================================
  // DRAW ALL ITEMS
  // ===================================================

  for (const row of rows) {
    const physicalLines = []

    for (
      const specification of row.specifications
    ) {
      const font = specification.bold
        ? bold
        : regular

      const marker =
        specification.marker &&
        specification.marker !== 'None'
          ? `${specification.marker} `
          : ''

      const parts = wrapText(
        marker + specification.text,
        font,
        9.5,
        COL_DESC - 10
      )

      for (const part of parts) {
        physicalLines.push({
          part,
          font,
        })
      }
    }

    if (!physicalLines.length) {
      physicalLines.push({
        part: '',
        font: regular,
      })
    }

    let offset = 0
    let firstFragment = true

    // =============================================
    // AUTOMATIC PAGE BREAKS
    // =============================================

    while (
      offset < physicalLines.length
    ) {
      if (
        cursor - FOOTER_LIMIT < 31
      ) {
        newPage()
      }

      const maxLines = Math.max(
        1,
        Math.floor(
          (cursor - FOOTER_LIMIT - 10) /
          ROW_LINE
        )
      )

      const take = physicalLines.slice(
        offset,
        offset + maxLines
      )

      const lastFragment =
        offset + take.length ===
        physicalLines.length

      const height = Math.max(
        27,
        take.length * ROW_LINE + 10
      )

      drawBox(
        MARGIN,
        cursor,
        TABLE_W,
        height
      )

      const firstX =
        MARGIN + COL_ITEM

      const priceX =
        MARGIN + COL_ITEM + COL_DESC

      // Vertical column lines.
      for (
        const x of [firstX, priceX]
      ) {
        page.drawLine({
          start: {
            x,
            y: cursor,
          },
          end: {
            x,
            y: cursor - height,
          },
          color: GRID,
          thickness: 0.55,
        })
      }

      // Item number - one time per item.
      if (firstFragment) {
        centered(
          row.itemNo,
          MARGIN,
          COL_ITEM,
          cursor - height / 2 - 4,
          regular,
          10
        )
      }

      // Technical specification text.
      take.forEach((item, i) => {
        drawText(
          item.part,
          firstX + 5,
          cursor - 15 - i * ROW_LINE,
          item.font,
          9.5
        )
      })

      // Price displayed once per item.
      if (
        lastFragment &&
        row.amountCents !== null
      ) {
        centered(
          fmt(row.amountCents),
          priceX,
          COL_PRICE,
          cursor - height / 2 - 4,
          bold,
          10,
          RED
        )
      }

      cursor -= height

      offset += take.length
      firstFragment = false

      if (!lastFragment) {
        newPage()
      }
    }
  }

  // ===================================================
  // GRAND TOTAL AND SIGNATURE
  // LAST PAGE ONLY
  // ===================================================

  if (
    cursor - FOOTER_LIMIT < 115
  ) {
    newPage()
  }

  const totalH = 27

  drawBox(
    MARGIN,
    cursor,
    TABLE_W,
    totalH
  )

  page.drawLine({
    start: {
      x: MARGIN + COL_ITEM + COL_DESC,
      y: cursor,
    },
    end: {
      x: MARGIN + COL_ITEM + COL_DESC,
      y: cursor - totalH,
    },
    color: GRID,
    thickness: 0.55,
  })

  centered(
    'TOTAL',
    MARGIN,
    COL_ITEM + COL_DESC,
    cursor - 18,
    bold,
    11
  )

  if (hasPrice) {
    centered(
      fmt(total),
      MARGIN + COL_ITEM + COL_DESC,
      COL_PRICE,
      cursor - 18,
      bold,
      10.5,
      RED
    )
  }

  cursor -= totalH + 30

  // ===================================================
  // SIGNATORY DETAILS
  // FROM DOCUMENT SETUP
  // ===================================================

  const name = printable(
    data.submittedBy ||
    data.authorizedRepresentative ||
    ''
  )

  const firm = printable(
    data.bidderName || ''
  )

  const labelFontSize = 9.8

  // NAME
  drawText(
    'Name:',
    MARGIN,
    cursor,
    bold,
    labelFontSize
  )

  const nameX = MARGIN + 40

  drawText(
    name,
    nameX,
    cursor,
    bold,
    labelFontSize
  )

  page.drawLine({
    start: {
      x: nameX,
      y: cursor - 2,
    },
    end: {
      x: Math.max(
        nameX + 115,
        nameX +
          bold.widthOfTextAtSize(
            name,
            labelFontSize
          ) +
          3
      ),
      y: cursor - 2,
    },
    color: GRID,
    thickness: 0.55,
  })

  cursor -= 20

  // SIGNATURE
  drawText(
    'Signature:',
    MARGIN,
    cursor,
    bold,
    labelFontSize
  )

  page.drawLine({
    start: {
      x: MARGIN + 67,
      y: cursor - 2,
    },
    end: {
      x: MARGIN + 185,
      y: cursor - 2,
    },
    color: GRID,
    thickness: 0.55,
  })

  cursor -= 20

  // AUTHORIZED COMPANY
  const label =
    'Duly authorized to sign the Bid for and behalf of:'

  drawText(
    label,
    MARGIN,
    cursor,
    bold,
    9.5
  )

  const firmX =
    MARGIN +
    bold.widthOfTextAtSize(
      label,
      9.5
    ) +
    6

  if (
    firmX +
      bold.widthOfTextAtSize(firm, 9.5) <=
    PAGE_W - MARGIN
  ) {
    drawText(
      firm,
      firmX,
      cursor,
      bold,
      9.5
    )

    page.drawLine({
      start: {
        x: firmX,
        y: cursor - 2,
      },
      end: {
        x:
          firmX +
          bold.widthOfTextAtSize(
            firm,
            9.5
          ) +
          3,
        y: cursor - 2,
      },
      color: GRID,
      thickness: 0.55,
    })
  } else {
    // Long company names wrap without overlapping.
    cursor -= 16

    const lines = wrapText(
      firm,
      bold,
      9.5,
      TABLE_W
    )

    lines.forEach(
      (part, index) => {
        drawText(
          part,
          MARGIN,
          cursor - index * 12,
          bold,
          9.5
        )
      }
    )
  }

  // ===================================================
  // GENERATE PDF
  // ===================================================

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
