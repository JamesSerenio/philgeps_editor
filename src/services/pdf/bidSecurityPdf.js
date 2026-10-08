import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export async function generateBidSecurityPreview(project) {
  const clean = (value) => String(value ?? '').trim()

  const variant =
    project?.templateVariant === 'with_table'
      ? 'with_table'
      : 'without_table'

  const path =
    variant === 'with_table'
      ? '/pdf/templates/Bid Security with table.pdf'
      : '/pdf/templates/Bid Security without table.pdf'

  const response = await fetch(path)

  if (!response.ok) {
    throw new Error(`Cannot load PDF: ${path}`)
  }

  const doc = await PDFDocument.load(
    await response.arrayBuffer()
  )

  if (doc.getPageCount() < 2) {
    throw new Error('Bid Security PDF must have 2 pages.')
  }

  const black = rgb(0, 0, 0)
  const white = rgb(1, 1, 1)

  // Arial-like fonts for WITH TABLE
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const boldItalic = await doc.embedFont(
    StandardFonts.HelveticaBoldOblique
  )

  // Times New Roman-like fonts for WITHOUT TABLE
  const timesBold = await doc.embedFont(
    StandardFonts.TimesRomanBold
  )
  const timesItalic = await doc.embedFont(
    StandardFonts.TimesRomanItalic
  )
  const timesBoldItalic = await doc.embedFont(
    StandardFonts.TimesRomanBoldItalic
  )

  const titleCase = (value) =>
    clean(value)
      .toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase())

  const province = titleCase(project?.province)
  const municipality = titleCase(project?.municipality)

  const procuringEntity = clean(project?.procuringEntity) ||
    [
      municipality ? `MUNICIPALITY OF ${municipality.toUpperCase()}` : '',
      province.toUpperCase(),
    ].filter(Boolean).join(', ')

  const bidderName = titleCase(project?.bidderName)

  const submittedBy = titleCase(
    project?.submittedBy ||
    project?.authorizedRepresentative
  )

  const designation = clean(
    project?.designation ||
    project?.representativeDesignation
  ) || 'Authorized Representative'

  const referenceNumber = clean(project?.referenceNumber)

  function parseDate(value) {
    const text = clean(value)

    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/)

    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    }

    const parsed = new Date(text)

    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsedDate = parseDate(project?.date)

  const day = parsedDate
    ? String(parsedDate.getDate()).padStart(2, '0')
    : ''

  const month = parsedDate
    ? parsedDate.toLocaleDateString('en-US', { month: 'long' })
    : ''

  const year = parsedDate
    ? String(parsedDate.getFullYear())
    : '2026'

  const fullDate = parsedDate
    ? `${month} ${day}, ${year}`
    : clean(project?.date)

  function erase(page, x, y, width, height) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color: white,
      borderWidth: 0,
    })
  }

  function draw(page, value, x, y, font, size, width) {
    const text = clean(value)
    if (!text) return 0

    let finalSize = size

    if (width) {
      while (
        finalSize > 7 &&
        font.widthOfTextAtSize(text, finalSize) > width
      ) {
        finalSize -= 0.1
      }
    }

    page.drawText(text, {
      x,
      y,
      size: finalSize,
      font,
      color: black,
    })

    return font.widthOfTextAtSize(text, finalSize)
  }

  const page1 = doc.getPage(0)
  const page2 = doc.getPage(1)

  // ===================================================
  // WITH TABLE
  // Uses the uploaded PDF's actual text positions.
  // Does not erase the table or declaration paragraphs.
  // ===================================================

  if (variant === 'with_table') {
    // PAGE 1 - TO: MUNICIPALITY
    // Original position: top 141 pt

    erase(page1, 54, 638, 345, 16)

    draw(
      page1,
      procuringEntity.toUpperCase(),
      55,
      641,
      boldItalic,
      11,
      330
    )

    // PAGE 1 - WITNESS STATEMENT
    // Located at bottom of original first page.

    erase(page1, 35, 35, 545, 29)

    const witnessPrefix =
      'IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this'

    const witnessDate = `____ day of ${month || 'May'} ${year} at`

    const firstWidth = draw(
      page1,
      witnessPrefix,
      36,
      51,
      regular,
      11,
      405
    )

    const dateX = 36 + firstWidth + 5

    draw(
      page1,
      witnessDate,
      dateX,
      51,
      boldItalic,
      11,
      570 - dateX
    )

    draw(
      page1,
      `Municipality of ${municipality}, ${province}.`,
      36,
      37,
      boldItalic,
      11,
      525
    )

    // PAGE 2 - DULY AUTHORIZED
    // Preserve its original position.

    erase(page2, 35, 716, 380, 18)

    draw(
      page2,
      'Duly authorized to sign the Bid for and behalf of:',
      36,
      720,
      regular,
      11,
      375
    )

    // PAGE 2 - COMPANY NAME

    erase(page2, 35, 690, 355, 18)

    draw(
      page2,
      bidderName,
      36,
      695,
      boldItalic,
      11,
      335
    )

    // PAGE 2 - REPRESENTATIVE / DESIGNATION / DATE

    erase(page2, 30, 624, 340, 46)

    const nameWidth = draw(
      page2,
      submittedBy,
      31.5,
      659,
      boldItalic,
      11,
      320
    )

    // Underline representative name.
    if (submittedBy) {
      page2.drawLine({
        start: { x: 31.5, y: 657 },
        end: { x: 31.5 + nameWidth, y: 657 },
        color: black,
        thickness: 0.6,
      })
    }

    draw(
      page2,
      designation,
      31.5,
      644,
      italic,
      11,
      320
    )

    draw(
      page2,
      fullDate,
      31.5,
      630,
      boldItalic,
      11,
      320
    )

  } else {
    // =================================================
    // WITHOUT TABLE
    // Existing two-page template layout.
    // =================================================

    erase(page1, 70, 687, 202, 18)

    draw(
      page1,
      `MUNICIPALITY OF ${municipality.toUpperCase()}`,
      72,
      692,
      timesBold,
      11.04,
      205
    )

    erase(page1, 341, 632, 65, 17)

    draw(
      page1,
      referenceNumber,
      343,
      637,
      timesItalic,
      11.04,
      65
    )

    erase(page1, 90, 596, 175, 19)

    draw(
      page1,
      `Municipality of ${municipality}`,
      91.3,
      601,
      timesBoldItalic,
      11.04,
      170
    )

    // PAGE 2

    erase(page2, 70, 690, 475, 35)

    draw(
      page2,
      `IN WITNESS WHEREOF, I/We have hereunto set my/our hand/s this ${day} day of ${month} ${year} at`,
      72,
      707,
      timesBold,
      11.04,
      470
    )

    draw(
      page2,
      `Municipality of ${municipality}.`,
      72,
      692,
      timesBoldItalic,
      11.04,
      300
    )

    erase(page2, 69, 622, 390, 43)

    draw(
      page2,
      'Duly authorized to sign the Bid for and behalf of:',
      72,
      651,
      timesItalic,
      12,
      350
    )

    draw(
      page2,
      bidderName,
      72,
      633,
      timesBoldItalic,
      12,
      330
    )

    erase(page2, 69, 548, 320, 57)

    const signerWidth = draw(
      page2,
      submittedBy,
      72,
      593,
      timesBoldItalic,
      12,
      280
    )

    if (submittedBy) {
      page2.drawLine({
        start: { x: 72, y: 591 },
        end: { x: 72 + signerWidth, y: 591 },
        color: black,
        thickness: 0.7,
      })
    }

    draw(
      page2,
      designation,
      72,
      575,
      timesItalic,
      12,
      280
    )

    draw(
      page2,
      fullDate,
      72,
      559,
      timesBoldItalic,
      12,
      250
    )

    erase(page2, 407, 482, 139, 17)

    draw(
      page2,
      `Municipality of ${municipality},`,
      408.7,
      485,
      timesBoldItalic,
      11.04,
      134
    )
  }

  const bytes = await doc.save()

  return URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/pdf',
    })
  )
}
