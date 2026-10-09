
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// ==========================================
// A4 TECHNICAL SPECIFICATIONS
// ==========================================

const W = 595.28
const H = 841.89

const LEFT = 35
const RIGHT = 560
const BOTTOM = 790

const COL = [
  LEFT,
  91,
  335,
  392,
  446,
  RIGHT,
]

const INK = rgb(0, 0, 0)
const GREY = rgb(0.32, 0.32, 0.32)

const PAD = 5
const LEADING = 12.4
const MIN_ROW = 25

const PAR_SIZE = 9.65
const PAR_LEADING = 14

// ==========================================
// ORIGINAL COMPLIANCE STATEMENT
// ==========================================

const COMPLIANCE_TEXT = `Bidders must state here either "Comply" or "Not Comply" against each of the individual parameters of each Specification stating the corresponding performance parameter of the equipment offered. Statements of "Comply" or "Not Comply" must be supported by evidence in a Bidder's Bid and cross-referenced to that evidence. Evidence shall be in the form of manufacturer's un-amended sales literature, unconditional statements of specification and compliance issued by the manufacturer, samples, independent test data etc. as appropriate. A statement that is not supported by evidence or is subsequently found to be contradicted by the evidence presented will render the Bid under evaluation liable for rejection. A statement either in the Bidder's statement of compliance or the supporting evidence that is found to be false either during Bid evaluation, post qualification or the execution of the Contract may be regarded as fraudulent and render the Bidder or supplier liable for prosecution subject to the provisions of ITB Clause Error! Reference source not found and/or GCC Clause Error! Reference source not found.`

// ==========================================
// TEXT HELPERS
// ==========================================

function pdfText(value) {
  return Array.from(
    String(value ?? '')
      .replace(/\r/g, '')
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[—–]/g, '-')
      .replace(/₱/g, 'PHP ')
      .replace(/[^\S\n ]/g, ' ')
  )
    .map((char) => {
      const c = char.codePointAt(0)

      return (
        c === 10 ||
        (c >= 32 && c <= 126) ||
        (c >= 160 && c <= 255)
      )
        ? char
        : '?'
    })
    .join('')
    .trim()
}

function oneLine(value) {
  return pdfText(value).replace(/\s+/g, ' ')
}

function dateLabel(value) {
  const v = oneLine(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    return v
  }

  const [y, m, d] = v.split('-').map(Number)

  const date = new Date(
    Date.UTC(y, m - 1, d)
  )

  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
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

// ==========================================
// DRAW STRAIGHT TABLE LINES
// ==========================================

function line(page, x1, y1, x2, y2) {
  page.drawLine({
    start: {
      x: x1,
      y: H - y1,
    },
    end: {
      x: x2,
      y: H - y2,
    },
    thickness: 0.6,
    color: GREY,
  })
}

// ==========================================
// DRAW TEXT
// ==========================================

function draw(
  page,
  font,
  value,
  x,
  y,
  size = 10
) {
  const str = pdfText(value)

  if (!str) return

  page.drawText(str, {
    x,
    y: H - y - size,
    font,
    size,
    color: INK,
  })
}

// ==========================================
// CENTER CELL TEXT
// ==========================================

function center(
  page,
  font,
  value,
  x1,
  x2,
  top,
  bottom,
  size = 10
) {
  const str = oneLine(value)

  if (!str) return

  const max = x2 - x1 - 8

  const fitted = Math.min(
    size,
    size * max /
      Math.max(
        0.01,
        font.widthOfTextAtSize(str, size)
      )
  )

  const width = font.widthOfTextAtSize(
    str,
    fitted
  )

  draw(
    page,
    font,
    str,
    x1 + (x2 - x1 - width) / 2,
    top + (bottom - top - fitted) / 2,
    fitted
  )
}

// ==========================================
// AUTOMATIC TEXT WRAPPING
// ==========================================

function wrap(
  value,
  font,
  size,
  maxWidth
) {
  const lines = []

  for (
    const paragraph of pdfText(value).split('\n')
  ) {
    if (!paragraph.trim()) {
      lines.push('')
      continue
    }

    let current = ''

    for (
      const word of paragraph
        .trim()
        .split(/\s+/)
    ) {
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
        lines.push(current)
      }

      let remainder = word

      while (
        remainder &&
        font.widthOfTextAtSize(
          remainder,
          size
        ) > maxWidth
      ) {
        let count = 1

        while (
          count < remainder.length &&
          font.widthOfTextAtSize(
            remainder.slice(0, count + 1),
            size
          ) <= maxWidth
        ) {
          count++
        }

        lines.push(
          remainder.slice(0, count)
        )

        remainder =
          remainder.slice(count)
      }

      current = remainder
    }

    if (current) {
      lines.push(current)
    }
  }

  return lines.length
    ? lines
    : ['']
}

// ==========================================
// BOLD WORDS IN COMPLIANCE PARAGRAPH
//
// Bold:
// ITB
// GCC
// Error! Reference source not found
//
// NOT bold:
// Clause
// ==========================================

function paragraphLines(
  regular,
  bold,
  maxWidth
) {
  const pattern =
    /(\bITB\b|\bGCC\b|Error!\s+Reference\s+source\s+not\s+found\.?)/gi

  const words = COMPLIANCE_TEXT
    .split(pattern)
    .flatMap((part) => {
      const isBold =
        /^(ITB|GCC|Error!\s+Reference\s+source\s+not\s+found)/i.test(
          part.trim()
        )

      return part
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({
          word,
          font: isBold ? bold : regular,
        }))
    })

  const space =
    regular.widthOfTextAtSize(
      ' ',
      PAR_SIZE
    )

  const lines = []

  let current = []
  let width = 0

  for (const word of words) {
    const measured =
      word.font.widthOfTextAtSize(
        word.word,
        PAR_SIZE
      )

    const needed =
      measured +
      (current.length ? space : 0)

    if (
      current.length &&
      width + needed > maxWidth
    ) {
      lines.push(current)
      current = []
      width = 0
    }

    if (current.length) {
      width += space
    }

    current.push(word)
    width += measured
  }

  if (current.length) {
    lines.push(current)
  }

  return lines
}

function drawParagraph(
  page,
  regular,
  bold,
  top
) {
  const width =
    RIGHT - LEFT - 14

  const rows = paragraphLines(
    regular,
    bold,
    width
  )

  const normalSpace =
    regular.widthOfTextAtSize(
      ' ',
      PAR_SIZE
    )

  rows.forEach((parts, i) => {
    const contentWidth =
      parts.reduce(
        (sum, p) =>
          sum +
          p.font.widthOfTextAtSize(
            p.word,
            PAR_SIZE
          ),
        0
      )

    const justify =
      i !== rows.length - 1 &&
      parts.length > 1

    const spacing = justify
      ? (width - contentWidth) /
        (parts.length - 1)
      : normalSpace

    let x = LEFT + 7

    for (const part of parts) {
      draw(
        page,
        part.font,
        part.word,
        x,
        top + i * PAR_LEADING,
        PAR_SIZE
      )

      x +=
        part.font.widthOfTextAtSize(
          part.word,
          PAR_SIZE
        ) + spacing
    }
  })

  return rows.length * PAR_LEADING
}

// ==========================================
// DRAW SPECIFICATION SYMBOLS
// ==========================================

function symbol(
  page,
  mark,
  x,
  top
) {
  const y = H - top

  if (
    mark === '•' ||
    mark === '○'
  ) {
    page.drawCircle({
      x,
      y,
      size: mark === '•' ? 2.3 : 3.2,

      ...(mark === '•'
        ? { color: INK }
        : {
            borderColor: INK,
            borderWidth: 1,
          }),
    })
  } else if (mark === '■') {
    page.drawRectangle({
      x: x - 2.6,
      y: y - 2.6,
      width: 5.2,
      height: 5.2,
      color: INK,
    })
  } else if (mark === '✓') {
    page.drawLine({
      start: {
        x: x - 3,
        y,
      },
      end: {
        x: x - 0.5,
        y: y - 2.3,
      },
      thickness: 1.4,
      color: INK,
    })

    page.drawLine({
      start: {
        x: x - 0.5,
        y: y - 2.3,
      },
      end: {
        x: x + 4.5,
        y: y + 3,
      },
      thickness: 1.4,
      color: INK,
    })
  } else if (mark === '➢') {
    page.drawLine({
      start: {
        x: x - 4,
        y,
      },
      end: {
        x: x + 4,
        y,
      },
      thickness: 1,
      color: INK,
    })

    page.drawLine({
      start: {
        x: x + 4,
        y,
      },
      end: {
        x,
        y: y + 3,
      },
      thickness: 1,
      color: INK,
    })

    page.drawLine({
      start: {
        x: x + 4,
        y,
      },
      end: {
        x,
        y: y - 3,
      },
      thickness: 1,
      color: INK,
    })
  }
}

// ==========================================
// NORMALIZE TECHNICAL SPECIFICATIONS
//
// IMPORTANT:
// Keep the bold property from editor.
// ==========================================

function normalizeItems(items) {
  return (
    Array.isArray(items)
      ? items
      : []
  ).map((item, index) => {
    const src =
      Array.isArray(
        item?.specificationLines
      )
        ? item.specificationLines
        : Array.isArray(item?.lines)
          ? item.lines
          : Array.isArray(
              item?.specifications
            )
            ? item.specifications
            : typeof item?.specification ===
                'string'
              ? item.specification.split('\n')
              : []

    const rows = (
      src.length
        ? src
        : ['']
    ).map((value) => {
      const row =
        typeof value === 'string'
          ? { text: value }
          : value || {}

      const original = String(
        row.text ??
          row.specification ??
          ''
      )

      const leading = original.match(
        /^\s*([•○■➢✓])\s*/u
      )

      return {
        marker:
          row.marker ??
          leading?.[1] ??
          '',

        text:
          row.marker == null &&
          leading
            ? original.slice(
                leading[0].length
              )
            : original,

        compliance:
          row.compliance == null
            ? 'COMPLY'
            : String(row.compliance),

        // BOLD FROM THE EDITOR
        bold: row.bold === true,
      }
    })

    return {
      number: index + 1,
      qty: item?.qty ?? '',
      unit: item?.unit ?? '',
      rows,
    }
  })
}

// ==========================================
// MAIN PDF GENERATOR
// ==========================================

async function makePdf(
  project = {},
  sourceItems = []
) {
  const doc =
    await PDFDocument.create()

  const regular =
    await doc.embedFont(
      StandardFonts.TimesRoman
    )

  const bold =
    await doc.embedFont(
      StandardFonts.TimesRomanBold
    )

  const italic =
    await doc.embedFont(
      StandardFonts.TimesRomanItalic
    )

  let page
  let cursor = 0

  // ========================================
  // CONNECTED TABLE HEADER
  // ========================================

  function tableHeader(
    connected = false
  ) {
    const top = cursor
    const bottom = top + 44

    if (!connected) {
      line(
        page,
        LEFT,
        top,
        RIGHT,
        top
      )
    }

    line(
      page,
      LEFT,
      bottom,
      RIGHT,
      bottom
    )

    for (const x of COL) {
      line(
        page,
        x,
        top,
        x,
        bottom
      )
    }

    const headings = [
      'Item\nNo.',
      'Specification/s',
      'Qty',
      'Unit',
      'Statement\nof\nCompliance',
    ]

    headings.forEach(
      (heading, col) => {
        const lines =
          heading.split('\n')

        const used =
          lines.length * 11.5

        lines.forEach(
          (entry, j) => {
            const tw =
              bold.widthOfTextAtSize(
                entry,
                10
              )

            const x =
              COL[col] +
              (
                COL[col + 1] -
                COL[col] -
                tw
              ) / 2

            draw(
              page,
              bold,
              entry,
              x,
              top +
                (44 - used) / 2 +
                j * 11.5,
              10
            )
          }
        )
      }
    )

    cursor = bottom
  }

  // ========================================
  // ADD A4 PAGE
  // ========================================

  function newPage(
    first = false,
    includeTable = true
  ) {
    page = doc.addPage([
      W,
      H,
    ])

    let connected = false

    if (first) {
      const heading =
        'TECHNICAL SPECIFICATIONS'

      draw(
        page,
        bold,
        heading,
        (
          W -
          bold.widthOfTextAtSize(
            heading,
            14
          )
        ) / 2,
        36,
        14
      )

      const details = [
        [
          'NAME OF THE PROCURING ENTITY',
          project.procuringEntity ||
            [
              project.municipality,
              project.province,
            ]
              .filter(Boolean)
              .join(', '),
        ],

        [
          'PROJECT TITLE',
          project.projectTitle,
        ],

        [
          'REFERENCE NUMBER',
          project.referenceNumber,
        ],
      ]

      let top = 78

      for (
        const [label, value]
        of details
      ) {
        const lines = wrap(
          value,
          bold,
          10,
          RIGHT - 277
        )

        draw(
          page,
          regular,
          label,
          LEFT,
          top,
          9.2
        )

        draw(
          page,
          regular,
          ':',
          239,
          top,
          9.7
        )

        lines.forEach(
          (valueLine, j) => {
            draw(
              page,
              bold,
              valueLine,
              272,
              top + j * 12.5,
              10
            )
          }
        )

        top += Math.max(
          18,
          lines.length * 12.5 + 4
        )
      }

      // ====================================
      // COMPLIANCE BOX
      // ====================================

      const boxTop = top + 7

      const paragraphTop =
        boxTop + 31

      const boxBottom =
        paragraphTop +
        paragraphLines(
          regular,
          bold,
          RIGHT - LEFT - 14
        ).length *
          PAR_LEADING +
        8

      if (
        boxBottom +
          44 +
          MIN_ROW >
        BOTTOM
      ) {
        throw new Error(
          'Compliance statement is too long for the first A4 page.'
        )
      }

      line(
        page,
        LEFT,
        boxTop,
        RIGHT,
        boxTop
      )

      draw(
        page,
        bold,
        'Statement of Compliance',
        LEFT + 7,
        boxTop + 5,
        10.5
      )

      line(
        page,
        LEFT,
        boxTop + 26,
        RIGHT,
        boxTop + 26
      )

      drawParagraph(
        page,
        regular,
        bold,
        paragraphTop
      )

      line(
        page,
        LEFT,
        boxTop,
        LEFT,
        boxBottom
      )

      line(
        page,
        RIGHT,
        boxTop,
        RIGHT,
        boxBottom
      )

      // Shared border
      line(
        page,
        LEFT,
        boxBottom,
        RIGHT,
        boxBottom
      )

      cursor = boxBottom
      connected = true
    } else {
      // NO CONTINUED TITLE
      cursor = 66
    }

    if (includeTable) {
      tableHeader(connected)
    }
  }

  // ========================================
  // DRAW AN ITEM TABLE SEGMENT
  // ========================================

  function drawSegment(
    item,
    fragments,
    firstPart
  ) {
    const top = cursor

    const bottom =
      top +
      fragments.reduce(
        (n, f) =>
          n + f.height,
        0
      )

    line(
      page,
      LEFT,
      top,
      RIGHT,
      top
    )

    line(
      page,
      LEFT,
      bottom,
      RIGHT,
      bottom
    )

    // Full-height vertical borders
    for (const x of COL) {
      line(
        page,
        x,
        top,
        x,
        bottom
      )
    }

    let rowTop = top

    fragments.forEach(
      (fragment, index) => {
        // Each specification has
        // its own horizontal line.
        if (index > 0) {
          line(
            page,
            COL[1],
            rowTop,
            COL[2],
            rowTop
          )

          line(
            page,
            COL[4],
            rowTop,
            COL[5],
            rowTop
          )
        }

        const indent =
          fragment.first &&
          fragment.marker
            ? 19
            : 6

        if (
          fragment.first &&
          fragment.marker
        ) {
          symbol(
            page,
            fragment.marker,
            COL[1] + 10,
            rowTop + 12.8
          )
        }

        // ==================================
        // BOLD / NORMAL SPECIFICATION TEXT
        // ==================================

        fragment.lines.forEach(
          (entry, j) => {
            draw(
              page,

              // THIS CONTROLS BOLD
              fragment.bold
                ? bold
                : regular,

              entry,

              COL[1] + indent,

              rowTop +
                PAD +
                j * LEADING,

              10
            )
          }
        )

        // ==================================
        // INDIVIDUAL COMPLY PER LINE
        // ==================================

        if (
          fragment.first &&
          fragment.compliance
        ) {
          const complianceLines =
            wrap(
              fragment.compliance,
              bold,
              9.8,
              COL[5] -
                COL[4] -
                10
            )

          const height =
            complianceLines.length *
            12

          complianceLines.forEach(
            (entry, j) => {
              const used =
                bold.widthOfTextAtSize(
                  entry,
                  9.8
                )

              draw(
                page,
                bold,
                entry,

                COL[4] +
                  (
                    COL[5] -
                    COL[4] -
                    used
                  ) / 2,

                rowTop +
                  (
                    fragment.height -
                    height
                  ) / 2 +
                  j * 12,

                9.8
              )
            }
          )
        }

        rowTop += fragment.height
      }
    )

    // ====================================
    // ITEM NO., QTY, UNIT
    // Center once per item segment.
    // ====================================

    if (firstPart) {
      center(
        page,
        regular,
        item.number,
        COL[0],
        COL[1],
        top,
        bottom
      )

      center(
        page,
        regular,
        item.qty,
        COL[2],
        COL[3],
        top,
        bottom
      )

      center(
        page,
        regular,
        item.unit,
        COL[3],
        COL[4],
        top,
        bottom
      )
    }

    cursor = bottom
  }

  // ========================================
  // INITIALIZE
  // ========================================

  const items =
    normalizeItems(sourceItems)

  newPage(true)

  // ========================================
  // AUTOMATIC PAGE BREAKS
  // ========================================

  for (const item of items) {
    // Use correct font while wrapping.
    for (const row of item.rows) {
      row.lines = wrap(
        row.text,

        // BOLD AFFECTS TEXT WIDTH
        row.bold
          ? bold
          : regular,

        10,

        COL[2] -
          COL[1] -
          (row.marker ? 27 : 13)
      )
    }

    let rowIndex = 0
    let consumed = 0
    let firstPart = true

    while (
      rowIndex <
      item.rows.length
    ) {
      const fragments = []

      let available =
        BOTTOM - cursor

      while (
        rowIndex <
          item.rows.length &&
        available >= MIN_ROW
      ) {
        const row =
          item.rows[rowIndex]

        const rest =
          row.lines.slice(consumed)

        const complianceHeight =
          consumed === 0 &&
          row.compliance
            ? wrap(
                row.compliance,
                bold,
                9.8,

                COL[5] -
                  COL[4] -
                  10
              ).length *
                12 +
              2 * PAD
            : 0

        const fullHeight =
          Math.max(
            MIN_ROW,

            rest.length *
              LEADING +
              2 * PAD,

            complianceHeight
          )

        // ==================================
        // ROW FITS ON CURRENT PAGE
        // ==================================

        if (
          fullHeight <= available
        ) {
          fragments.push({
            lines: rest,

            marker: row.marker,

            compliance:
              row.compliance,

            // PRESERVE BOLD
            bold: row.bold,

            first:
              consumed === 0,

            height: fullHeight,
          })

          available -= fullHeight

          rowIndex++
          consumed = 0

          continue
        }

        // ==================================
        // SPLIT LONG ROW ACROSS PAGES
        // ==================================

        const count = Math.min(
          rest.length,

          Math.floor(
            (
              available -
              2 * PAD
            ) / LEADING
          )
        )

        if (
          count < 1 ||
          available <
            Math.max(
              MIN_ROW,
              complianceHeight
            )
        ) {
          break
        }

        const chunk =
          rest.slice(0, count)

        const height = Math.max(
          MIN_ROW,

          chunk.length *
            LEADING +
            2 * PAD,

          complianceHeight
        )

        if (height > available) {
          break
        }

        fragments.push({
          lines: chunk,

          marker: row.marker,

          compliance:
            row.compliance,

          // BOLD EVEN ON NEXT PAGE
          bold: row.bold,

          first:
            consumed === 0,

          height,
        })

        consumed += chunk.length

        if (
          consumed ===
          row.lines.length
        ) {
          rowIndex++
          consumed = 0
        }

        break
      }

      if (!fragments.length) {
        newPage(false)
        continue
      }

      drawSegment(
        item,
        fragments,
        firstPart
      )

      firstPart = false

      if (
        rowIndex <
        item.rows.length
      ) {
        newPage(false)
      }
    }
  }

  // ========================================
  // SIGNATURE ONLY AT THE END
  // ========================================

  if (
    cursor + 114 > BOTTOM
  ) {
    newPage(false, false)
  }

  const sigTop =
    cursor + 18

  const signature = [
    [
      'Submitted by',

      project.submittedBy ||
        project.authorizedRepresentative ||
        '',
    ],

    [
      'Designation',

      project.designation ||
        project.representativeDesignation ||
        '',
    ],

    [
      'Name of Firm',

      project.bidderName || '',
    ],

    [
      'Date',

      dateLabel(project.date),
    ],
  ]

  signature.forEach(
    ([label, value], i) => {
      const top =
        sigTop +
        (
          i === 0
            ? 0
            : 46 +
              (i - 1) * 20
        )

      draw(
        page,
        regular,
        label,
        LEFT,
        top,
        11
      )

      draw(
        page,
        regular,
        ':',
        LEFT + 92,
        top,
        11
      )

      const str = oneLine(value)

      const maxWidth =
        RIGHT -
        (LEFT + 125)

      const size = Math.min(
        11.3,

        11.3 * maxWidth /
          Math.max(
            0.001,

            bold.widthOfTextAtSize(
              str,
              11.3
            )
          )
      )

      draw(
        page,
        bold,
        str,
        LEFT + 125,
        top,
        size
      )

      if (i === 0) {
        line(
          page,

          LEFT + 125,
          top + 14,

          LEFT +
            125 +
            bold.widthOfTextAtSize(
              str,
              size
            ),

          top + 14
        )

        draw(
          page,
          italic,

          '(Printed Name & Signature)',

          LEFT + 125,

          top + 19,

          9
        )
      }
    }
  )

  return doc.save({
    useObjectStreams: false,
  })
}

// ==========================================
// PDF BYTES FOR DOWNLOAD
// ==========================================

export async function generateTechnicalSpecsBytes(
  data = {}
) {
  const project =
    data.project ||
    data.documentSetup ||
    data

  const items =
    data.items ||
    data.technicalSpecs ||
    data.technical ||
    []

  return makePdf(
    project,
    items
  )
}

// ==========================================
// LIVE PDF PREVIEW
// ==========================================

export async function generateTechnicalSpecsPreview(
  data = {}
) {
  const bytes =
    await generateTechnicalSpecsBytes(
      data
    )

  return URL.createObjectURL(
    new Blob(
      [bytes],
      {
        type: 'application/pdf',
      }
    )
  )
}
