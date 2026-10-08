
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)

const ORIGINAL_COMPANY =
  'MIKATA PRIME CORPORATION'

const ORIGINAL_ADDRESS =
  'CDO Office: L-25 & 27 B-2, San Agustin Valley Homes Carmen Cagayan de Oro City'

const UNITS = [
  'zero', 'one', 'two', 'three', 'four',
  'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
]

const TENS = [
  '', '', 'twenty', 'thirty', 'forty',
  'fifty', 'sixty', 'seventy',
  'eighty', 'ninety',
]

function numberToWords(n) {
  if (n < 20) {
    return UNITS[n]
  }

  if (n < 100) {
    return (
      TENS[Math.floor(n / 10)] +
      (n % 10
        ? `-${numberToWords(n % 10)}`
        : '')
    )
  }

  if (n < 1000) {
    return (
      `${numberToWords(Math.floor(n / 100))} hundred` +
      (n % 100
        ? ` ${numberToWords(n % 100)}`
        : '')
    )
  }

  return (
    `${numberToWords(Math.floor(n / 1000))} thousand` +
    (n % 1000
      ? ` ${numberToWords(n % 1000)}`
      : '')
  )
}

function clean(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
}

export function serviceYearsText(years) {
  const n = Number(years)

  if (
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > 999999
  ) {
    throw new Error(
      'Service Warranty (Years) must be a whole number from 1 to 999999.'
    )
  }

  return (
    `${numberToWords(n)} (${n}) ` +
    (n === 1 ? 'year' : 'years')
  )
}

function formatDate(value) {
  const valueText = clean(value)

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(valueText)
  ) {
    return valueText
  }

  const [year, month, day] = valueText
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
    return valueText
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

// Cover only the text being replaced.
function cover(
  page,
  x,
  y,
  width,
  height
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: WHITE,
    borderWidth: 0,
  })
}

// Fit replacement text inside the original
// field without touching nearby content.
function fitText(
  page,
  text,
  font,
  x,
  y,
  maxWidth,
  preferredSize,
  minSize = 7
) {
  if (!text) return

  const natural =
    font.widthOfTextAtSize(
      text,
      preferredSize
    )

  const size =
    natural > maxWidth
      ? preferredSize * maxWidth / natural
      : preferredSize

  if (size < minSize) {
    throw new Error(
      `Text is too long for this original template: ${text}`
    )
  }

  page.drawText(text, {
    x,
    y,
    font,
    size,
    color: BLACK,
  })
}

// Preserve the original font hierarchy:
// normal, bold, and bold-italic.
function drawRichParagraph(
  page,
  sections,
  fonts,
  {
    x = 108,
    firstIndent = 36,
    topY,
    maxWidth = 435,
    preferredSize = 14,
    minSize = 9,
    lineHeightFactor = 1.15,
    maxLines = 6,
  }
) {
  const tokens = sections.flatMap(
    ({ text, style = 'normal' }) =>
      clean(text)
        .split(' ')
        .filter(Boolean)
        .map((word) => ({
          word,
          style,
        }))
  )

  function layout(size) {
    const lineHeight =
      size * lineHeightFactor

    let cx = x + firstIndent
    let cy = topY
    let lines = 1
    let beginning = true

    const placements = []

    for (const { word, style } of tokens) {
      const font = fonts[style]

      const space = beginning
        ? 0
        : font.widthOfTextAtSize(
            ' ',
            size
          )

      const wordWidth =
        font.widthOfTextAtSize(
          word,
          size
        )

      if (wordWidth > maxWidth) {
        return null
      }

      if (
        !beginning &&
        cx + space + wordWidth >
          x + maxWidth
      ) {
        lines += 1
        cx = x
        cy -= lineHeight
        beginning = true
      }

      if (lines > maxLines) {
        return null
      }

      if (!beginning) {
        cx += space
      }

      placements.push({
        word,
        font,
        x: cx,
        y: cy,
      })

      cx += wordWidth
      beginning = false
    }

    return placements
  }

  let chosen = null
  let size = preferredSize

  while (size >= minSize) {
    chosen = layout(size)

    if (chosen) break

    size -= 0.5
  }

  if (!chosen) {
    throw new Error(
      'The certificate text is too long to fit without covering other original sections.'
    )
  }

  for (const item of chosen) {
    page.drawText(item.word, {
      x: item.x,
      y: item.y,
      font: item.font,
      size,
      color: BLACK,
    })
  }
}

// =====================================================
// ORIGINAL PDF + EDITABLE TEXT OVERLAY
// =====================================================

export async function generateAfterSalesPreview(
  data = {}
) {
  const base =
    import.meta.env.BASE_URL || '/'

  const templateUrl =
    `${base.replace(/\/?$/, '/')}` +
    'pdf/templates/After%20Sales.pdf'

  const response = await fetch(
    templateUrl,
    {
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Cannot load original After Sales.pdf (${response.status}).`
    )
  }

  const originalBytes = new Uint8Array(
    await response.arrayBuffer()
  )

  const signature = new TextDecoder(
    'ascii'
  ).decode(
    originalBytes.slice(0, 5)
  )

  if (signature !== '%PDF-') {
    throw new Error(
      'After Sales.pdf URL returned HTML, not a PDF. Check the template path.'
    )
  }

  // Load original PDF, including its logo,
  // letterhead and all existing layout.
  const pdf = await PDFDocument.load(
    originalBytes
  )

  const page = pdf.getPages()[0]

  if (!page) {
    throw new Error(
      'After Sales.pdf has no page.'
    )
  }

  if (
    Math.abs(page.getWidth() - 612) > 2 ||
    Math.abs(page.getHeight() - 792) > 2
  ) {
    throw new Error(
      'Original After Sales.pdf must be Letter size (612 x 792 pt).'
    )
  }

  const normal = await pdf.embedFont(
    StandardFonts.TimesRoman
  )

  const bold = await pdf.embedFont(
    StandardFonts.TimesRomanBold
  )

  const boldItalic = await pdf.embedFont(
    StandardFonts.TimesRomanBoldItalic
  )

  const fonts = {
    normal,
    bold,
    boldItalic,
  }

  // Data from Document Setup at the top.
  const company = clean(data.bidderName)

  const address = clean(
    data.businessAddress ||
      data.companyAddress
  )

  const procuring =
    clean(data.procuringEntity) ||
    [
      clean(data.municipality),
      clean(data.province),
    ]
      .filter(Boolean)
      .join(', ')

  const project = clean(
    data.projectTitle
  )

  const submitter = clean(
    data.submittedBy ||
      data.authorizedRepresentative
  )

  const designation = clean(
    data.designation ||
      data.representativeDesignation
  )

  const date = formatDate(data.date)

  // The only editable After-Sales-specific field.
  const years = serviceYearsText(
    data.servicePeriodYears ?? 1
  )

  // Preserve original logo, mobile number,
  // email, title, labels, spacing and page.
  // Only cover the original text fields
  // when they require replacement.

  // COMPANY HEADING
  if (
    company.toUpperCase() !==
    ORIGINAL_COMPANY
  ) {
    cover(
      page,
      140,
      728,
      457,
      29
    )

    fitText(
      page,
      company.toUpperCase(),
      bold,
      142,
      736,
      440,
      22,
      10
    )
  }

  // BUSINESS ADDRESS
  if (
    address &&
    `CDO Office: ${address}` !==
      ORIGINAL_ADDRESS
  ) {
    cover(
      page,
      141,
      716,
      453,
      15
    )

    fitText(
      page,
      `CDO Office: ${address}`,
      boldItalic,
      142,
      721,
      438,
      10,
      7.2
    )
  }

  // FIRST PARAGRAPH
  // The original logo and heading are
  // outside this covered text area.
  cover(
    page,
    105,
    466,
    445,
    110
  )

  drawRichParagraph(
    page,
    [
      {
        text:
          'This serves to certify that',
      },
      {
        text: company,
        style: 'bold',
      },
      {
        text:
          'is fully committed to providing comprehensive after-sales support to the',
      },
      {
        text: procuring,
        style: 'bold',
      },
      {
        text:
          'for the project:',
      },
      {
        text: project.endsWith('.')
          ? project
          : `${project}.`,
        style: 'boldItalic',
      },
    ],
    fonts,
    {
      topY: 553,
      maxLines: 6,
    }
  )

  // AFTER-SALES SERVICE PARAGRAPH
  // Cover the old "one (1) year" paragraph,
  // then draw the correct warranty period.
  cover(
    page,
    105,
    342,
    445,
    120
  )

  drawRichParagraph(
    page,
    [
      {
        text:
          'Beyond the initial delivery of materials, our company pledges a dedicated',
      },
      {
        text: years,
        style: 'bold',
      },
      {
        text:
          'period of technical support and after-sales service. We remain at the full disposal of the municipal end-users to ensure that all operational needs are met and that our professional assistance is readily available throughout the agreed service period.',
      },
    ],
    fonts,
    {
      topY: 441,
      maxLines: 7,
      minSize: 10,
    }
  )

  // SIGNATURE VALUES
  // Original labels and colons remain.
  const signatureRows = [
    {
      value: submitter,
      yMask: 290,
      yText: 295,
    },
    {
      value: designation,
      yMask: 257,
      yText: 262,
    },
    {
      value: company.toUpperCase(),
      yMask: 240,
      yText: 245,
    },
    {
      value: date,
      yMask: 223,
      yText: 228,
    },
  ]

  for (
    let i = 0;
    i < signatureRows.length;
    i += 1
  ) {
    const row = signatureRows[i]

    cover(
      page,
      286,
      row.yMask,
      286,
      18
    )

    fitText(
      page,
      row.value,
      bold,
      288,
      row.yText,
      270,
      12,
      7.5
    )
  }

  // Save actual updated PDF, not the old file.
  const bytes = await pdf.save({
    useObjectStreams: false,
  })

  return URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/pdf',
    })
  )
}
