
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

const WHITE = rgb(1, 1, 1)
const BLACK = rgb(0, 0, 0)

const ONES = [
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

function words(n) {
  if (n < 20) return ONES[n]

  if (n < 100) {
    return TENS[Math.floor(n / 10)] +
      (n % 10 ? `-${words(n % 10)}` : '')
  }

  if (n < 1000) {
    return `${words(Math.floor(n / 100))} hundred` +
      (n % 100 ? ` ${words(n % 100)}` : '')
  }

  return `${words(Math.floor(n / 1000))} thousand` +
    (n % 1000 ? ` ${words(n % 1000)}` : '')
}

export function formatWarrantyYears(input) {
  const n = Number(input)

  if (
    !Number.isSafeInteger(n) ||
    n < 1 ||
    n > 999999 ||
    input === ''
  ) {
    throw new Error(
      'Warranty Years must be a whole number from 1 to 999999.'
    )
  }

  return `${words(n)} (${n}) ${
    n === 1 ? 'year' : 'years'
  }`
}

function clean(value, fallback = '') {
  return (
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim() || fallback
  )
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
}

function formatDate(value) {
  const str = clean(value)

  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str
  }

  const [y, m, d] = str
    .split('-')
    .map(Number)

  const utc = new Date(
    Date.UTC(y, m - 1, d)
  )

  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    return str
  }

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }
  ).format(utc)
}

// White overlay over the old field.
function mask(page, x, y, width, height) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: WHITE,
    borderWidth: 0,
  })
}

// Fit a single-line field without overlap.
function fitted(
  page,
  value,
  font,
  {
    x,
    y,
    maxWidth,
    size = 12,
    minSize = 7,
  }
) {
  const text = clean(value)

  if (!text) return

  const width = font.widthOfTextAtSize(
    text,
    size
  )

  const finalSize =
    width > maxWidth
      ? (size * maxWidth) / width
      : size

  if (finalSize < minSize) {
    throw new Error(
      `Text is too long for the warranty template: ${text}`
    )
  }

  page.drawText(text, {
    x,
    y,
    font,
    size: finalSize,
    color: BLACK,
  })
}

// Mixed normal/bold/italic text with wrapping.
function rich(
  page,
  runs,
  fonts,
  {
    x = 108,
    y,
    maxWidth = 435,
    size = 14,
    minSize = 10.5,
    maxLines = 6,
    lineHeight = 16.1,
  }
) {
  const tokens = runs.flatMap(
    ({ text, style = 'normal' }) =>
      clean(text)
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => ({
          word,
          font: fonts[style],
        }))
  )

  function layout(fontSize) {
    let cx = x
    let cy = y
    let lines = 1
    let first = true

    const placed = []

    for (const { word, font } of tokens) {
      const wordWidth =
        font.widthOfTextAtSize(
          word,
          fontSize
        )

      if (wordWidth > maxWidth) {
        return null
      }

      const sp = first
        ? 0
        : fonts.normal.widthOfTextAtSize(
            ' ',
            fontSize
          )

      if (
        !first &&
        cx + sp + wordWidth > x + maxWidth
      ) {
        cx = x
        cy -= lineHeight * (fontSize / size)
        lines += 1
        first = true
      }

      if (lines > maxLines) {
        return null
      }

      if (!first) cx += sp

      placed.push({
        word,
        font,
        x: cx,
        y: cy,
      })

      cx += wordWidth
      first = false
    }

    return {
      placed,
      fontSize,
    }
  }

  let out = null

  for (
    let s = size;
    s >= minSize;
    s -= 0.25
  ) {
    out = layout(s)

    if (out) break
  }

  if (!out) {
    throw new Error(
      'Warranty content is too long to fit safely in the original layout.'
    )
  }

  for (const item of out.placed) {
    page.drawText(item.word, {
      x: item.x,
      y: item.y,
      font: item.font,
      size: out.fontSize,
      color: BLACK,
    })
  }
}

// =====================================================
// ORIGINAL WARRANTY PDF + OVERLAY
// =====================================================

export async function generateProductWarrantyPreview(
  data = {}
) {
  const base =
    import.meta.env?.BASE_URL || '/'

  const url =
    `${base.replace(/\/?$/, '/')}` +
    'pdf/templates/Warranty.pdf'

  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `Unable to load original Warranty.pdf (${response.status}).`
    )
  }

  const bytes = new Uint8Array(
    await response.arrayBuffer()
  )

  if (
    new TextDecoder('ascii').decode(
      bytes.slice(0, 5)
    ) !== '%PDF-'
  ) {
    throw new Error(
      'Warranty.pdf URL is not returning a PDF. Check public/pdf/templates/Warranty.pdf.'
    )
  }

  const doc = await PDFDocument.load(bytes)

  if (doc.getPageCount() !== 1) {
    throw new Error(
      'Warranty template must have exactly one page.'
    )
  }

  const page = doc.getPage(0)

  if (
    Math.abs(page.getWidth() - 612) > 2 ||
    Math.abs(page.getHeight() - 792) > 2
  ) {
    throw new Error(
      'Warranty.pdf must be a 612 x 792 Letter-size PDF.'
    )
  }

  const fonts = {
    normal: await doc.embedFont(
      StandardFonts.TimesRoman
    ),
    bold: await doc.embedFont(
      StandardFonts.TimesRomanBold
    ),
    italic: await doc.embedFont(
      StandardFonts.TimesRomanBoldItalic
    ),
  }

  // All values come from Document Setup.
  const company = clean(
    data.bidderName,
    'MIKATA PRIME CORPORATION'
  )

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

  const municipality = clean(
    data.municipality
  )

  const province = clean(
    data.province
  )

  const place =
    [municipality, province]
      .filter(Boolean)
      .join(', ') || procuring

  const project = clean(
    data.projectTitle
  )

  const submittedBy = clean(
    data.submittedBy ||
      data.authorizedRepresentative
  )

  const designation = clean(
    data.designation ||
      data.representativeDesignation
  )

  const date = formatDate(data.date)

  // Product Warranty has its own years value.
  const warranty = formatWarrantyYears(
    data.productWarrantyYears ?? 2
  )

  // ==================================================
  // COMPANY HEADER
  // ==================================================

  const isMikata = /mikata/i.test(company)

  if (!isMikata) {
    // Remove the unrelated Mikata logo/contact
    // details when a different bidder is selected.
    mask(page, 24, 684, 113, 86)
    mask(page, 136, 683, 453, 78)

    fitted(
      page,
      company.toUpperCase(),
      fonts.bold,
      {
        x: 144,
        y: 738.5,
        maxWidth: 437,
        size: 22,
        minSize: 10,
      }
    )

    fitted(
      page,
      address ? `Office: ${address}` : '',
      fonts.italic,
      {
        x: 144,
        y: 723.9,
        maxWidth: 437,
        size: 10,
        minSize: 7,
      }
    )
  } else {
    // Keep the Mikata logo/contact details,
    // while updating its company name if needed.
    if (
      company.toUpperCase() !==
      'MIKATA PRIME CORPORATION'
    ) {
      mask(page, 143, 733.7, 443, 25)

      fitted(
        page,
        company.toUpperCase(),
        fonts.bold,
        {
          x: 144,
          y: 738.5,
          maxWidth: 437,
          size: 22,
          minSize: 10,
        }
      )
    }

    const defaultAddress =
      'L-25 & 27 B-2, San Agustin Valley Homes Carmen Cagayan de Oro City'

    if (
      address &&
      clean(address).toLowerCase() !==
        clean(defaultAddress).toLowerCase()
    ) {
      mask(page, 143, 721.5, 444, 12.1)

      fitted(
        page,
        `Office: ${address}`,
        fonts.italic,
        {
          x: 144,
          y: 723.9,
          maxWidth: 437,
          size: 10,
          minSize: 7,
        }
      )
    }
  }

  // ==================================================
  // FIRST PARAGRAPH
  // Only this paragraph is replaced.
  // ==================================================

  mask(page, 106.5, 463.5, 442, 97.5)

  rich(
    page,
    [
      {
        text: 'This is to certify that',
      },
      {
        text: company,
        style: 'bold',
      },
      {
        text: 'provides a limited warranty of',
      },
      {
        text: warranty,
        style: 'bold',
      },
      {
        text:
          'on all materials supplied for the',
      },
      {
        text: project.endsWith('.')
          ? project
          : `${project}.`,
        style: 'italic',
      },
      {
        text: 'in',
      },
      {
        text: place,
        style: 'bold',
      },
    ],
    fonts,
    {
      x: 108,
      y: 547.08,
      maxWidth: 435,
      size: 14,
      minSize: 10.5,
      maxLines: 6,
    }
  )

  // ==================================================
  // STATIC WARRANTY CONDITIONS REMAIN UNCHANGED
  //
  // "We guarantee that all products..."
  // and exclusions i, ii, iii are preserved.
  // ==================================================

  // ==================================================
  // CLOSING PARAGRAPH
  // ==================================================

  mask(page, 106.5, 220, 442, 68)

  rich(
    page,
    [
      {
        text: company,
        style: 'bold',
      },
      {
        text:
          "remains committed to ensuring the quality and durability of our contributions to the Municipality's infrastructure.",
      },
    ],
    fonts,
    {
      x: 108,
      y: 273.33,
      maxWidth: 435,
      size: 14,
      minSize: 10.5,
      maxLines: 4,
    }
  )

  // ==================================================
  // SIGNATURE DETAILS
  // Keep original labels and colons.
  // ==================================================

  const rows = [
    {
      value: submittedBy,
      y: 191.73,
      maskY: 187.5,
    },
    {
      value: designation,
      y: 159.13,
      maskY: 155,
    },
    {
      value: company.toUpperCase(),
      y: 142.33,
      maskY: 138.5,
    },
    {
      value: date,
      y: 125.4,
      maskY: 122,
    },
  ]

  for (const row of rows) {
    mask(
      page,
      286.5,
      row.maskY,
      295,
      16
    )

    fitted(
      page,
      row.value,
      fonts.bold,
      {
        x: 288.05,
        y: row.y,
        maxWidth: 282,
        size: 12,
        minSize: 7,
      }
    )
  }

  // ==================================================
  // SAVE UPDATED PDF
  // ==================================================

  const saved = await doc.save({
    useObjectStreams: false,
  })

  return URL.createObjectURL(
    new Blob([saved], {
      type: 'application/pdf',
    })
  )
}
