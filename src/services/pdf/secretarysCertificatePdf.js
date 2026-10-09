
import {
  PDFDocument,
  StandardFonts,
  rgb,
} from 'pdf-lib'

// =====================================================
// PAGE SETTINGS
// =====================================================

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89
const A4 = [PAGE_WIDTH, PAGE_HEIGHT]

const LEFT = 48
const RIGHT = 48
const BOTTOM = 62

const FONT_SIZE = 10.4
const LINE_HEIGHT = 15.1

const INK = rgb(0, 0, 0)

// =====================================================
// TEXT HELPERS
// =====================================================

function normalizeText(value) {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
}

// Use for values from Document Setup.
function clean(value) {
  return normalizeText(value).trim()
}

// =====================================================
// DATE HELPERS
// =====================================================

function parseDate(input) {
  const text = clean(input)

  const iso =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(text)

  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ]

  let year
  let month
  let day

  if (iso) {
    year = Number(iso[1])
    month = Number(iso[2]) - 1
    day = Number(iso[3])
  } else {
    const longDate =
      /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i.exec(text)

    if (!longDate) {
      throw new Error(
        'Invalid document date.'
      )
    }

    month = months.indexOf(
      longDate[1].toLowerCase()
    )

    if (month < 0) {
      throw new Error(
        'Invalid month.'
      )
    }

    day = Number(longDate[2])
    year = Number(longDate[3])
  }

  const date = new Date(
    Date.UTC(year, month, day)
  )

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day
  ) {
    throw new Error(
      'Invalid date in Secretary Certificate.'
    )
  }

  return date
}

function fullDate(date) {
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

function ordinalDate(date) {
  const day = date.getUTCDate()

  const suffix =
    day % 100 >= 11 &&
    day % 100 <= 13
      ? 'th'
      : ({
          1: 'st',
          2: 'nd',
          3: 'rd',
        }[day % 10] ?? 'th')

  const month =
    new Intl.DateTimeFormat(
      'en-US',
      {
        month: 'long',
        timeZone: 'UTC',
      }
    ).format(date)

  return (
    `${day}${suffix} day of ${month} ` +
    date.getUTCFullYear()
  )
}

// =====================================================
// GENERATE SECRETARY'S CERTIFICATE
// =====================================================

export async function generateSecretaryCertificatePreview(
  setup = {}
) {
  const formDate = parseDate(setup.date)

  // Draft default: 3 days before document date.
  // Use actual boardMeetingDate when available.

  const draftMeetingDate = new Date(
    formDate.getTime()
  )

  draftMeetingDate.setUTCDate(
    draftMeetingDate.getUTCDate() - 3
  )

  const meetingDate =
    setup.boardMeetingDate
      ? parseDate(setup.boardMeetingDate)
      : draftMeetingDate

  // ===================================================
  // DOCUMENT SETUP VALUES
  // ===================================================

  const bidder = clean(
    setup.bidderName
  )

  const project = clean(
    setup.projectTitle
  )

  const representative = clean(
    setup.submittedBy ||
    setup.authorizedRepresentative
  )

  const address = clean(
    setup.businessAddress ||
    setup.companyAddress
  )

  const entity = clean(
    setup.procuringEntity ||
    (
      setup.municipality && setup.province
        ? `Municipality of ${setup.municipality}, ${setup.province}`
        : ''
    )
  )

  const secretary = clean(
    setup.corporateSecretaryName ||
    'ALYSSA LYNN TALINGTING'
  )

  const president = clean(
    setup.companyPresidentName ||
    'PATRICK CARLO P. DEDEL'
  )

  if (
    !bidder ||
    !project ||
    !representative ||
    !address ||
    !entity
  ) {
    throw new Error(
      'Please complete Document Setup first.'
    )
  }

  // ===================================================
  // CREATE PDF
  // ===================================================

  const pdf = await PDFDocument.create()

  const regular = await pdf.embedFont(
    StandardFonts.TimesRoman
  )

  const bold = await pdf.embedFont(
    StandardFonts.TimesRomanBold
  )

  let page = pdf.addPage(A4)

  let y = PAGE_HEIGHT - 59

  function newPage() {
    page = pdf.addPage(A4)
    y = PAGE_HEIGHT - 65
  }

  function draw(
    text,
    x,
    baseline,
    font = regular,
    size = FONT_SIZE
  ) {
    page.drawText(
      clean(text),
      {
        x,
        y: baseline,
        font,
        size,
        color: INK,
      }
    )
  }

  function line(
    text,
    x = LEFT,
    font = regular,
    size = FONT_SIZE
  ) {
    if (
      y < BOTTOM + LINE_HEIGHT
    ) {
      newPage()
    }

    draw(text, x, y, font, size)

    y -= LINE_HEIGHT
  }

  // ===================================================
  // RICH TEXT PARAGRAPH
  //
  // Supports:
  // - Normal text
  // - Bold text
  // - Multiple bold sections
  // - Automatic line wrapping
  // - Correct spaces between text spans
  // ===================================================

  function paragraph(
    spans,
    options = {}
  ) {
    const x = options.x ?? LEFT

    const width =
      options.width ??
      PAGE_WIDTH - x - RIGHT

    const size =
      options.size ?? FONT_SIZE

    const leading =
      options.leading ?? LINE_HEIGHT

    const gap =
      options.gap ?? 7

    const maxX = x + width

    let cursor = x
    let hasWord = false
    let pendingSpace = false
    let wroteAny = false

    function nextLine() {
      y -= leading

      if (y < BOTTOM) {
        newPage()
      }

      cursor = x
      hasWord = false
      pendingSpace = false
    }

    for (const span of spans) {
      const font = span.bold
        ? bold
        : regular

      // Preserve whitespace between spans.
      const tokens =
        normalizeText(span.text).match(/\s+|\S+/g) || []

      for (const token of tokens) {
        if (/^\s+$/.test(token)) {
          pendingSpace = true
          continue
        }

        const wordWidth =
          font.widthOfTextAtSize(
            token,
            size
          )

        const spaceWidth =
          pendingSpace && hasWord
            ? regular.widthOfTextAtSize(
                ' ',
                size
              )
            : 0

        if (
          hasWord &&
          cursor + spaceWidth + wordWidth > maxX
        ) {
          nextLine()
        } else {
          cursor += spaceWidth
        }

        let remaining = token

        while (remaining.length > 0) {
          let length = remaining.length

          while (
            length > 1 &&
            font.widthOfTextAtSize(
              remaining.slice(0, length),
              size
            ) > maxX - cursor
          ) {
            length -= 1
          }

          if (
            cursor > x &&
            font.widthOfTextAtSize(
              remaining.slice(0, length),
              size
            ) > maxX - cursor
          ) {
            nextLine()
            continue
          }

          const part =
            remaining.slice(0, length)

          draw(
            part,
            cursor,
            y,
            font,
            size
          )

          cursor +=
            font.widthOfTextAtSize(
              part,
              size
            )

          remaining =
            remaining.slice(length)

          if (remaining) {
            nextLine()
          }
        }

        hasWord = true
        wroteAny = true
        pendingSpace = false
      }
    }

    if (wroteAny) {
      nextLine()
    }

    y -= gap
  }

  // ===================================================
  // NUMBERED PARAGRAPH
  // ===================================================

  function numbered(
    number,
    spans,
    gap = 8
  ) {
    if (
      y < BOTTOM + LINE_HEIGHT
    ) {
      newPage()
    }

    draw(
      `${number}.`,
      60,
      y
    )

    paragraph(
      spans,
      {
        x: 78,
        width: PAGE_WIDTH - 78 - RIGHT,
        gap,
      }
    )
  }

  // ===================================================
  // PAGE 1 - HEADER
  // ===================================================

  line(
    'REPUBLIC OF THE PHILIPPINES )'
  )

  line(
    `${entity} ) S.S.`
  )

  y -= 37

  const heading =
    "SECRETARY'S CERTIFICATE"

  const headingSize = 16

  draw(
    heading,
    (
      PAGE_WIDTH -
      bold.widthOfTextAtSize(
        heading,
        headingSize
      )
    ) / 2,
    y,
    bold,
    headingSize
  )

  y -= 54

  // ===================================================
  // INTRODUCTION
  // ===================================================

  paragraph(
    [
      {
        text: 'I, ',
      },
      {
        text: secretary,
        bold: true,
      },
      {
        text:
          `, of legal age, Filipino, and with office address at ${address}, after having been duly sworn in accordance with law, hereby depose and state that:`,
      },
    ],
    {
      gap: 11,
    }
  )

  // ===================================================
  // NUMBER 1
  // ===================================================

  numbered(
    1,
    [
      {
        text:
          'I am the duly elected and qualified Corporate Secretary of ',
      },
      {
        text: bidder,
        bold: true,
      },
      {
        text:
          `, a corporation duly organized and existing under and by virtue of the laws of the Republic of the Philippines, with principal office address at ${address};`,
      },
    ],
    10
  )

  // ===================================================
  // NUMBER 2
  // ===================================================

  numbered(
    2,
    [
      {
        text:
          'As Corporate Secretary, I have custody of and access to the corporate records, minutes of the meetings of the Board of Directors, and other official documents of the Corporation;',
      },
    ],
    10
  )

  // ===================================================
  // NUMBER 3
  // ===================================================

  numbered(
    3,
    [
      {
        text:
          `At the special meeting of the Board of Directors of Corporation held on ${fullDate(meetingDate)} at its principal office, during which a quorum was present and acting throughout, the following resolutions were unanimously passed and approved:`,
      },
    ],
    16
  )

  // ===================================================
  // RESOLVED
  //
  // BOLD:
  // - RESOLVED,
  // - BIDDER NAME
  // - PROCURING ENTITY
  // - PROJECT TITLE
  // ===================================================

  paragraph(
    [
      {
        text: '"',
      },
      {
        text: 'RESOLVED,',
        bold: true,
      },
      {
        text: ' that ',
      },
      {
        text: bidder,
        bold: true,
      },
      {
        text:
          ' is hereby authorized to participate in the public bidding, negotiate, and enter into a contract with the ',
      },
      {
        text: entity,
        bold: true,
      },
      {
        text:
          ' for the project entitled: "',
      },
      {
        text: project,
        bold: true,
      },
      {
        text: '";',
      },
    ],
    {
      x: 92,
      width: PAGE_WIDTH - 92 - RIGHT,
      gap: 13,
    }
  )

  // ===================================================
  // RESOLVED FURTHER
  //
  // BOLD:
  // - RESOLVED FURTHER,
  // - AUTHORIZED REPRESENTATIVE
  // ===================================================

  paragraph(
    [
      {
        text: '"',
      },
      {
        text: 'RESOLVED FURTHER,',
        bold: true,
      },
      {
        text:
          ' that the Corporation hereby designates ',
      },
      {
        text: representative,
        bold: true,
      },
      {
        text:
          ', as the Authorized Representative of the Corporation, to represent, sign, execute, submit, and deliver any and all documents, agreements, forms, and proposals necessary to effectively participate in the bidding and implement the aforementioned project, granting unto the said representative full power and authority to do and perform any and all acts required;',
      },
    ],
    {
      x: 92,
      width: PAGE_WIDTH - 92 - RIGHT,
      gap: 13,
    }
  )

  // ===================================================
  // RESOLVED FINALLY
  //
  // BOLD:
  // - RESOLVED FINALLY,
  // - PRESIDENT NAME
  // ===================================================

  paragraph(
    [
      {
        text: '"',
      },
      {
        text: 'RESOLVED FINALLY,',
        bold: true,
      },
      {
        text:
          ' that any and all prior actions taken by the Authorized Representative, as well as the Proprietor/President of the Corporation, ',
      },
      {
        text: president,
        bold: true,
      },
      {
        text:
          ', in connection with the foregoing are hereby approved, ratified, and confirmed as the acts of the Corporation."',
      },
    ],
    {
      x: 92,
      width: PAGE_WIDTH - 92 - RIGHT,
      gap: 13,
    }
  )

  // ===================================================
  // NUMBER 4
  // ===================================================

  numbered(
    4,
    [
      {
        text:
          'The foregoing resolutions have not been altered, modified, or revoked, and the same remain in full force and effect as of the date hereof;',
      },
    ],
    10
  )

  // ===================================================
  // NUMBER 5
  // ===================================================

  numbered(
    5,
    [
      {
        text:
          'I am executing this Certificate to attest to the truth of the foregoing facts and for whatever legal purpose it may serve.',
      },
    ],
    8
  )

  // ===================================================
  // PAGE 2 - REFERENCE LAYOUT
  // ===================================================

  newPage()

  // ===================================================
  // IN WITNESS WHEREOF
  // ===================================================

  y = PAGE_HEIGHT - 65

  paragraph(
    [
      {
        text:
          'IN WITNESS WHEREOF,',
        bold: true,
      },
      {
        text:
          ' I have hereunto set my hand this ',
      },
      {
        text: ordinalDate(formDate),
        bold: true,
      },
      {
        text: ' at',
      },
    ],
    {
      x: LEFT,
      size: 11,
      leading: 16,
      gap: 0,
    }
  )

  paragraph(
    [
      {
        text:
          'Municipality of ____________, ____________, Philippines.',
      },
    ],
    {
      x: LEFT,
      size: 11,
      leading: 16,
      gap: 0,
    }
  )

  // ===================================================
  // SECRETARY SIGNATURE LINE
  // ===================================================

  const signatureX = 344
  const signatureWidth = 195

  const signatureLineY =
    PAGE_HEIGHT - 134

  page.drawLine({
    start: {
      x: signatureX,
      y: signatureLineY,
    },
    end: {
      x: signatureX + signatureWidth,
      y: signatureLineY,
    },
    thickness: 0.8,
    color: INK,
  })

  // ===================================================
  // SECRETARY NAME
  // ===================================================

  const nameSize = 10.5

  const nameWidth =
    bold.widthOfTextAtSize(
      secretary,
      nameSize
    )

  draw(
    secretary,
    signatureX +
      (signatureWidth - nameWidth) / 2,
    signatureLineY - 14,
    bold,
    nameSize
  )

  // ===================================================
  // SECRETARY DESIGNATION
  // ===================================================

  const role =
    'Corporate Secretary'

  const roleSize = 10.5

  const roleWidth =
    regular.widthOfTextAtSize(
      role,
      roleSize
    )

  draw(
    role,
    signatureX +
      (signatureWidth - roleWidth) / 2,
    signatureLineY - 29,
    regular,
    roleSize
  )

  // ===================================================
  // SUBSCRIBED AND SWORN
  // ===================================================

  const swornDate =
    setup.notarizationDate
      ? ordinalDate(
          parseDate(setup.notarizationDate)
        )
      : ordinalDate(formDate)

  y = PAGE_HEIGHT - 225

  paragraph(
    [
      {
        text:
          'SUBSCRIBED AND SWORN',
        bold: true,
      },
      {
        text:
          ` to before me this ${swornDate} at Municipality of ____________, ____________, Philippines, affiant exhibiting to me competent evidence of identity.`,
      },
    ],
    {
      x: LEFT,
      size: 11,
      leading: 16,
      gap: 0,
    }
  )

  // ===================================================
  // NOTARIAL DETAILS
  // ===================================================

  y = PAGE_HEIGHT - 323

  line(
    'Doc. No. _____;',
    LEFT,
    regular,
    11
  )

  line(
    'Page No. _____;',
    LEFT,
    regular,
    11
  )

  line(
    'Book No. _____;',
    LEFT,
    regular,
    11
  )

  line(
    'Series of _______.',
    LEFT,
    regular,
    11
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
    }
  )

  return URL.createObjectURL(blob)
}
