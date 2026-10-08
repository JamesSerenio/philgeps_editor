import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function generateOmnibusPreview(project) {
  // =========================================================
  // HELPERS
  // =========================================================

  const clean = (value) =>
    String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim()

  const normalizeName = (value) =>
    clean(value).toUpperCase()

  const titleCase = (value) =>
    clean(value)
      .toLowerCase()
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      )

  // =========================================================
  // TEMPLATE VARIANT
  // =========================================================

  const variant =
    String(project?.templateVariant ?? '')
      .trim()
      .toLowerCase() === 'initao_lgu'
      ? 'initao_lgu'
      : 'old_default'

  // =========================================================
  // EXACT TEMPLATE
  // =========================================================

  const templatePath =
    variant === 'initao_lgu'
      ? '/pdf/templates/Omnibus Sworn Statement Initao.pdf'
      : '/pdf/templates/Omnibus Sworn Statement.pdf'

  // =========================================================
  // LOAD PDF
  // =========================================================

  const response = await fetch(
    `${templatePath}?variant=${variant}&v=${Date.now()}`,
    {
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    throw new Error(
      `Cannot load Omnibus PDF: ${templatePath}`
    )
  }

  const pdfDoc = await PDFDocument.load(
    await response.arrayBuffer()
  )

  if (pdfDoc.getPageCount() < 3) {
    throw new Error(
      `Expected a 3-page Omnibus PDF: ${templatePath}`
    )
  }

  // =========================================================
  // FONTS
  // =========================================================

  const regular = await pdfDoc.embedFont(
    StandardFonts.TimesRoman
  )

  const italic = await pdfDoc.embedFont(
    StandardFonts.TimesRomanItalic
  )

  const boldItalic = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBoldItalic
  )

  const black = rgb(0, 0, 0)
  const white = rgb(1, 1, 1)

  const BODY_SIZE = 12
  const INLINE_SIZE = 11.4
  const LINE_HEIGHT = 13.8

  // =========================================================
  // DOCUMENT SETUP VALUES
  // =========================================================

  const municipality =
    titleCase(project?.municipality)

  const province =
    titleCase(project?.province)

  const projectTitle =
    clean(project?.projectTitle)

  const bidderName =
    clean(project?.bidderName)

  // IMPORTANT:
  // Ito ang gagamitin sa mga inline company names.
  const bidderInlineName =
    bidderName.toUpperCase()

  const businessAddress =
    clean(
      project?.businessAddress ||
        project?.companyAddress
    )

  const submittedBy =
    clean(
      project?.submittedBy ||
        project?.authorizedRepresentative
    )

  const designation =
    clean(
      project?.designation ||
        project?.representativeDesignation
    ) ||
    'Authorized Representative'

  // =========================================================
  // REPRESENTATIVE PROFILES
  // =========================================================

  const representativeProfiles = {
    'JHO ANN Q. CLEOPAS': {
      displayName:
        'Jho Ann Q. Cleopas',
      civilStatus:
        'married',
      residence:
        'Tankulan, Manolo Fortich, Bukidnon',
    },

    'CARLOS RAFAEL A. JAMILO': {
      displayName:
        'Carlos Rafael A. Jamilo',
      civilStatus:
        'single',
      residence:
        'Camaman-an, Cagayan de Oro City, Misamis Oriental',
    },

    'MARLJONE BLAIRE B. TINGTING': {
      displayName:
        'Marljone Blaire B. Tingting',
      civilStatus:
        'single',
      residence:
        'Tankulan, Manolo Fortich, Bukidnon',
    },
  }

  const representative =
    representativeProfiles[
      normalizeName(submittedBy)
    ] || {
      displayName:
        titleCase(submittedBy),
      civilStatus: '',
      residence: '',
    }

  // =========================================================
  // DATE
  // =========================================================

  function parseDate(value) {
    const text = clean(value)

    if (!text) {
      return null
    }

    const iso = text.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    )

    if (iso) {
      return new Date(
        Number(iso[1]),
        Number(iso[2]) - 1,
        Number(iso[3])
      )
    }

    const parsed = new Date(text)

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null
    }

    return parsed
  }

  const parsedDate =
    parseDate(project?.date)

  const day =
    parsedDate
      ? String(
          parsedDate.getDate()
        ).padStart(2, '0')
      : ''

  const month =
    parsedDate
      ? parsedDate.toLocaleDateString(
          'en-US',
          {
            month: 'long',
          }
        )
      : ''

  const year =
    parsedDate
      ? String(
          parsedDate.getFullYear()
        )
      : ''

  const fullDate =
    parsedDate
      ? `${month} ${day}, ${year}`
      : clean(project?.date)

  // =========================================================
  // PDF HELPERS
  // =========================================================

  function eraseTop(
    page,
    x,
    top,
    width,
    height
  ) {
    page.drawRectangle({
      x,
      y:
        page.getHeight() -
        top -
        height,
      width,
      height,
      color: white,
      borderWidth: 0,
    })
  }

  function drawTop({
    page,
    text,
    x,
    top,
    font = regular,
    size = BODY_SIZE,
  }) {
    const value = clean(text)

    if (!value) {
      return 0
    }

    page.drawText(value, {
      x,
      y:
        page.getHeight() -
        top -
        size,
      font,
      size,
      color: black,
    })

    return font.widthOfTextAtSize(
      value,
      size
    )
  }

  function drawFitTop({
    page,
    text,
    x,
    top,
    font = regular,
    size = BODY_SIZE,
    maxWidth,
    minimumSize = 8,
  }) {
    const value = clean(text)

    if (!value) {
      return 0
    }

    let actualSize = size

    while (
      actualSize > minimumSize &&
      font.widthOfTextAtSize(
        value,
        actualSize
      ) > maxWidth
    ) {
      actualSize -= 0.1
    }

    page.drawText(value, {
      x,
      y:
        page.getHeight() -
        top -
        actualSize,
      font,
      size: actualSize,
      color: black,
    })

    return font.widthOfTextAtSize(
      value,
      actualSize
    )
  }

  function drawRichWrapped({
    page,
    segments,
    firstX,
    nextX,
    top,
    maxX = 543,
    size = BODY_SIZE,
    lineHeight = LINE_HEIGHT,
  }) {
    let x = firstX
    let line = 0

    const getY = () =>
      page.getHeight() -
      top -
      size -
      line * lineHeight

    function newLine() {
      line += 1
      x = nextX
    }

    for (const segment of segments) {
      const font =
        segment.font || regular

      const words =
        String(segment.text ?? '')
          .split(/(\s+)/)
          .filter(Boolean)

      for (const word of words) {
        if (/^\s+$/.test(word)) {
          const width =
            font.widthOfTextAtSize(
              ' ',
              size
            )

          if (
            x + width <= maxX
          ) {
            x += width
          }

          continue
        }

        const width =
          font.widthOfTextAtSize(
            word,
            size
          )

        if (
          x + width > maxX &&
          x > nextX
        ) {
          newLine()
        }

        page.drawText(word, {
          x,
          y: getY(),
          size,
          font,
          color: black,
        })

        x += width
      }
    }

    return line + 1
  }

  // =========================================================
  // INLINE COMPANY
  //
  // Ito ang fix para maging straight ang:
  // MIKATA CORPORATION declares...
  // MIKATA CORPORATION complies...
  // MIKATA CORPORATION is aware...
  //
  // Hindi na gumagamit ng malaking erase rectangle.
  // =========================================================

function replaceInlineCompany({
  page,
  x,
  top,
  originalEndX,
  nextTextX,
  yOffset = 0,
}) {
  if (!bidderInlineName) {
    return
  }

  // Exact erase lang sa lumang company name.
  const eraseX = x - 1

  const eraseWidth = Math.max(
    originalEndX - eraseX,
    5
  )

  eraseTop(
    page,
    eraseX,
    top - 0.8,
    eraseWidth,
    12.8
  )

  let actualSize = INLINE_SIZE

  const availableWidth =
    nextTextX
      ? nextTextX - x - 2
      : eraseWidth

  while (
    actualSize > 8 &&
    boldItalic.widthOfTextAtSize(
      bidderInlineName,
      actualSize
    ) > availableWidth
  ) {
    actualSize -= 0.1
  }

  // Gumamit ng fixed baseline para pantay sa original sentence.
  page.drawText(
    bidderInlineName,
    {
      x,
      y:
        page.getHeight() -
        top -
        INLINE_SIZE +
        1.5 +
        yOffset,
      font: boldItalic,
      size: actualSize,
      color: black,
    }
  )
}

  // =========================================================
  // PAGE 1 AFFIANT
  // =========================================================

  function drawAffiant(page) {
    eraseTop(
      page,
      68,
      138,
      480,
      49
    )

    drawRichWrapped({
      page,
      firstX: 108,
      nextX: 72,
      top: 143.8,
      maxX: 543,
      segments: [
        {
          text: 'I, ',
          font: regular,
        },

        {
          text:
            representative.displayName,
          font: boldItalic,
        },

        {
          text:
            ', of legal age, ',
          font: regular,
        },

        {
          text:
            representative.civilStatus,
          font: boldItalic,
        },

        {
          text: ', ',
          font: regular,
        },

        {
          text:
            'Filipino',
          font: boldItalic,
        },

        {
          text:
            ', and with residence at ',
          font: regular,
        },

        {
          text:
            representative.residence,
          font: boldItalic,
        },

        {
          text:
            ', after having been duly sworn in accordance with law, do hereby depose and state that:',
          font: regular,
        },
      ],
    })
  }

  // =========================================================
  // PAGE 1 REPRESENTATIVE
  // =========================================================

  function drawRepresentativeInfo(
    page,
    numbered
  ) {
    eraseTop(
      page,
      68,
      188,
      480,
      44
    )

    drawRichWrapped({
      page,
      firstX: 108,
      nextX: 72,
      top: 193.3,
      maxX: 543,
      segments: [
        ...(numbered
          ? [
              {
                text: '1. ',
                font: regular,
              },
            ]
          : []),

        {
          text:
            'I am the duly authorized and designated representative of ',
          font: regular,
        },

        {
          text: bidderName,
          font: boldItalic,
        },

        {
          text:
            ' with office address at ',
          font: regular,
        },

        {
          text:
            businessAddress,
          font: boldItalic,
        },

        {
          text: ';',
          font: regular,
        },
      ],
    })
  }

  // =========================================================
  // PAGE 1 PROJECT
  // =========================================================

  function drawProjectInfo(
    page,
    numbered
  ) {
    eraseTop(
      page,
      68,
      236,
      480,
      79
    )

    drawRichWrapped({
      page,
      firstX: 108,
      nextX: 72,
      top: 241,
      maxX: 543,
      segments: [
        ...(numbered
          ? [
              {
                text: '2. ',
                font: regular,
              },
            ]
          : []),

        {
          text:
            'I am granted full power and authority to do, execute and perform any and all acts necessary to participate, submit the bid, and to sign and execute the ensuing contract for ',
          font: regular,
        },

        {
          text:
            projectTitle,
          font: boldItalic,
        },

        {
          text:
            ` of the Municipality of ${municipality}, ${province} as supported by the attached duly notarized Special Power of Attorney, Board/Partnership Resolution, or Secretary's Certificate, whichever is applicable;`,
          font: regular,
        },
      ],
    })
  }

  // =========================================================
  // PAGE 2 ITEM D
  // =========================================================

  function replaceProcurementTitle(
    page
  ) {
    // Important:
    // Huwag burahin yung line:
    //
    // Inquire or secure Supplemental Bid Bulletin(s) issued for the

    eraseTop(
      page,
      145,
      336,
      397,
      27
    )

    drawRichWrapped({
      page,
      firstX: 148.5,
      nextX: 148.5,
      top: 339,
      maxX: 540,
      size: 11,
      lineHeight: 12.3,
      segments: [
        {
          text:
            projectTitle,
          font: boldItalic,
        },
      ],
    })
  }

  // =========================================================
  // PAGE 2 SIGNATURE
  // =========================================================

  function drawWitnessBlock(page) {
    eraseTop(
      page,
      68,
      496,
      480,
      166
    )

    drawRichWrapped({
      page,
      firstX: 108,
      nextX: 72,
      top: 501.2,
      maxX: 543,
      segments: [
        {
          text:
            'IN WITNESS WHEREOF, I have hereunto set my hand this ',
          font: regular,
        },

        {
          text: day,
          font: boldItalic,
        },

        {
          text:
            ' day of ',
          font: regular,
        },

        {
          text:
            `${month} ${year}`,
          font: boldItalic,
        },

        {
          text:
            ' at ',
          font: regular,
        },

        {
          text:
            `Municipality of ${municipality}, ${province}`,
          font: boldItalic,
        },

        {
          text:
            ', Philippines.',
          font: regular,
        },
      ],
    })

    drawTop({
      page,
      text:
        'Duly authorized to sign the Bid for and behalf of:',
      x: 252,
      top: 542.6,
      font: regular,
      size: BODY_SIZE,
    })

    drawFitTop({
      page,
      text:
        bidderName,
      x: 252,
      top: 570.2,
      font: boldItalic,
      size: BODY_SIZE,
      maxWidth: 270,
      minimumSize: 8.5,
    })

    drawFitTop({
      page,
      text:
        representative.displayName,
      x: 252,
      top: 609.8,
      font: boldItalic,
      size: BODY_SIZE,
      maxWidth: 270,
      minimumSize: 8.5,
    })

    drawFitTop({
      page,
      text:
        designation,
      x: 252,
      top: 625.7,
      font: italic,
      size: BODY_SIZE,
      maxWidth: 270,
      minimumSize: 8.5,
    })

    drawFitTop({
      page,
      text:
        fullDate,
      x: 252,
      top: 641.6,
      font: boldItalic,
      size: BODY_SIZE,
      maxWidth: 270,
      minimumSize: 8.5,
    })
  }

  // =========================================================
  // PAGE 3 JURAT
  // =========================================================

  function drawJurat(page) {
    // =======================================================
    // SUBSCRIBED AND SWORN
    // =======================================================

    eraseTop(
      page,
      68,
      136,
      480,
      79
    )

    drawRichWrapped({
      page,
      firstX: 72,
      nextX: 72,
      top: 141.5,
      maxX: 543,
      segments: [
        {
          text:
            'SUBSCRIBED AND SWORN to before me this _____ day of ',
          font: regular,
        },

        {
          text:
            `${month} ${year}`,
          font: boldItalic,
        },

        {
          text:
            ' at ',
          font: regular,
        },

        {
          text:
            `Municipality of ${municipality}, ${province}`,
          font: boldItalic,
        },

        {
          text:
            ', Philippines. Affiant/s is/are personally known to me and was/were identified by me through competent evidence of identity as defined in the 2004 Rules on Notarial Practice (A.M. No. 02-8-13-SC). Affiant/s exhibited to me his/her ',
          font: regular,
        },

        {
          text:
            'National ID',
          font: boldItalic,
        },

        {
          text:
            ', with his/her photograph and signature appearing thereon, with no. ____________________.',
          font: regular,
        },
      ],
    })

    // =======================================================
    // WITNESS MY HAND
    // =======================================================

    eraseTop(
      page,
      68,
      220,
      360,
      23
    )

    drawRichWrapped({
      page,
      firstX: 72,
      nextX: 72,
      top: 224.3,
      maxX: 543,
      segments: [
        {
          text:
            'WITNESS MY HAND AND SEAL this ___ day of ',
          font: regular,
        },

        {
          text:
            `${month} ${year}`,
          font: boldItalic,
        },

        {
          text: '.',
          font: regular,
        },
      ],
    })

    // =======================================================
    // IMPORTANT
    //
    // Hindi gagalawin:
    // NAME OF NOTARY PUBLIC
    // Notarial Commission No.
    // Notary Public for
    // Roll of Attorneys No.
    //
    // PTR at IBP lang papalitan.
    // =======================================================

    eraseTop(
      page,
      286,
      334,
      255,
      14
    )

    drawTop({
      page,
      text:
        `PTR No. __, ${fullDate}`,
      x: 288,
      top: 335.5,
      font: regular,
      size: BODY_SIZE,
    })

    eraseTop(
      page,
      286,
      349,
      255,
      14
    )

    drawTop({
      page,
      text:
        `IBP No. __, ${fullDate}`,
      x: 288,
      top: 350.5,
      font: regular,
      size: BODY_SIZE,
    })
  }

  // =========================================================
  // GET PAGES
  // =========================================================

  const page1 =
    pdfDoc.getPage(0)

  const page2 =
    pdfDoc.getPage(1)

  const page3 =
    pdfDoc.getPage(2)

  // =========================================================
  // PAGE 1
  // =========================================================

  drawAffiant(page1)

  drawRepresentativeInfo(
    page1,
    variant === 'initao_lgu'
  )

  drawProjectInfo(
    page1,
    variant === 'initao_lgu'
  )

  // =========================================================
  // PAGE 1 INLINE COMPANY NAMES
  // =========================================================

  replaceInlineCompany({
    page: page1,
    x: 108,
    top: 338.3,
    originalEndX: 241,
    nextTextX: 244,
  })

  replaceInlineCompany({
    page: page1,
    x: 108,
    top: 490.2,
    originalEndX: 245,
    nextTextX: 248,
  })

  replaceInlineCompany({
    page: page1,
    x: 121.6,
    top: 545.4,
    originalEndX: 256,
    nextTextX: 259,
  })

  // =========================================================
  // PAGE 2 INLINE COMPANY NAMES
  // =========================================================

  // Beneficial Ownership paragraph
  replaceInlineCompany({
    page: page2,
    x: 129,
    top: 116.1,
    originalEndX: 265,
    nextTextX: 268,
  })

// 8. MIKATA CORPORATION complies...
eraseTop(
  page2,
  106,
  194.5,
  437,
  18
)

const item8Size = 11.4
const item8Top = 197.4

// Convert TOP coordinate to actual PDF Y coordinate
const item8Y =
  page2.getHeight() -
  item8Top -
  item8Size

const company8X = 108

// COMPANY NAME
page2.drawText(
  bidderInlineName,
  {
    x: company8X,
    y: item8Y,
    size: item8Size,
    font: boldItalic,
    color: black,
  }
)

// Measure company width
const company8Width =
  boldItalic.widthOfTextAtSize(
    bidderInlineName,
    item8Size
  )

// TEXT AFTER COMPANY
page2.drawText(
  'complies with existing labor laws and standards; and',
  {
    x:
      company8X +
      company8Width +
      7,
    y: item8Y,
    size: item8Size,
    font: regular,
    color: black,
  }
)

  // 9. company is aware...
  replaceInlineCompany({
    page: page2,
    x: 108,
    top: 226.4,
    originalEndX: 243,
    nextTextX: 246,
  })

  // Project title under item d
  replaceProcurementTitle(
    page2
  )

  // 10. company did not give...
  replaceInlineCompany({
    page: page2,
    x: 108,
    top: 364.4,
    originalEndX: 244,
    nextTextX: 247,
  })

  // 11. given to COMPANY, failure...
  eraseTop(
    page2,
    349,
    429.5,
    194,
    17
  )

  drawRichWrapped({
    page: page2,
    firstX: 351.6,
    nextX: 351.6,
    top: 431.7,
    maxX: 543,
    size: 11.4,
    lineHeight: 13.8,
    segments: [
      {
        text: bidderInlineName,
        font: boldItalic,
      },
      {
        text: ', failure to',
        font: regular,
      },
    ],
  })

  // =========================================================
  // PAGE 2 WITNESS
  // =========================================================

  drawWitnessBlock(page2)

  // =========================================================
  // PAGE 3
  // =========================================================

  drawJurat(page3)

  // =========================================================
  // SAVE
  // =========================================================

  const bytes =
    await pdfDoc.save()

  return URL.createObjectURL(
    new Blob(
      [bytes],
      {
        type: 'application/pdf',
      }
    )
  )
}
