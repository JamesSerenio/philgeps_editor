import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatLongDate } from '../../lib/documentSetup'

export async function generateManpowerPreview(project) {
  const response = await fetch(
    '/pdf/templates/Manpower Requirements.pdf'
  )

  if (!response.ok) {
    throw new Error(
      'Unable to load Manpower Requirements.pdf'
    )
  }

  const pdfDoc = await PDFDocument.load(
    await response.arrayBuffer()
  )

  if (pdfDoc.getPageCount() === 0) {
    throw new Error(
      'Manpower Requirements.pdf has no pages.'
    )
  }

  const page = pdfDoc.getPage(0)

  // =========================================================
  // FONTS
  // =========================================================

  const regular = await pdfDoc.embedFont(
    StandardFonts.TimesRoman
  )

  const bold = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBold
  )

  const black = rgb(0, 0, 0)
  const white = rgb(1, 1, 1)

  // =========================================================
  // HELPERS
  // =========================================================

  const cleanValue = (value) =>
    String(value ?? '').trim()

  function fitSize(
    value,
    font,
    startSize,
    maxWidth,
    minimumSize = 8
  ) {
    const text = cleanValue(value)

    let size = startSize

    while (
      text &&
      size > minimumSize &&
      font.widthOfTextAtSize(text, size) > maxWidth
    ) {
      size -= 0.1
    }

    return size
  }

  function drawFitText({
    text,
    x,
    y,
    font = regular,
    size = 10,
    maxWidth = 200,
    minimumSize = 8,
  }) {
    const value = cleanValue(text)

    if (!value) return 0

    const actualSize = fitSize(
      value,
      font,
      size,
      maxWidth,
      minimumSize
    )

    page.drawText(value, {
      x,
      y,
      size: actualSize,
      font,
      color: black,
    })

    return font.widthOfTextAtSize(
      value,
      actualSize
    )
  }

  // =========================================================
  // VALUES FROM DOCUMENT SETUP
  // =========================================================

  const submittedBy = cleanValue(
    project?.submittedBy ||
    project?.authorizedRepresentative
  ).toUpperCase()

  const designation =
    cleanValue(
      project?.designation ||
      project?.representativeDesignation
    ) || 'Authorized Representative'

  const bidderName = cleanValue(
    project?.bidderName
  ).toUpperCase()

  const date = formatLongDate(project?.date)

  // =========================================================
  // ERASE OLD VALUES ONLY
  // =========================================================
  // HINDI gagalawin:
  // - Submitted by:
  // - Designation
  // - Name of Firm
  // - Date
  // - table
  // - manpower names
  // - positions
  // - logo/header
  // =========================================================

  page.drawRectangle({
    x: 301,
    y: 224,
    width: 235,
    height: 84,
    color: white,
    borderWidth: 0,
  })

  // =========================================================
  // SUBMITTED BY
  // =========================================================

  const submittedY = 295

  const submittedWidth = drawFitText({
    text: submittedBy,
    x: 306,
    y: submittedY,
    font: bold,
    size: 10,
    maxWidth: 210,
    minimumSize: 8,
  })

  if (submittedBy && submittedWidth > 0) {
    page.drawLine({
      start: {
        x: 306,
        y: submittedY - 1.5,
      },
      end: {
        x: 306 + submittedWidth,
        y: submittedY - 1.5,
      },
      thickness: 0.6,
      color: black,
    })
  }

  // Printed Name & Signature
  page.drawText(
    '(Printed Name & Signature)',
    {
      x: 306,
      y: 279,
      size: 7.5,
      font: regular,
      color: black,
    }
  )

  // =========================================================
  // DESIGNATION
  // =========================================================

  drawFitText({
    text: designation,
    x: 306,
    y: 262,
    font: bold,
    size: 10,
    maxWidth: 210,
    minimumSize: 8,
  })

  // =========================================================
  // NAME OF FIRM
  // =========================================================

  const firmY = 245

  const firmWidth = drawFitText({
    text: bidderName,
    x: 306,
    y: firmY,
    font: bold,
    size: 10,
    maxWidth: 230,
    minimumSize: 7.5,
  })

  if (bidderName && firmWidth > 0) {
    page.drawLine({
      start: {
        x: 306,
        y: firmY - 1.5,
      },
      end: {
        x: 306 + firmWidth,
        y: firmY - 1.5,
      },
      thickness: 0.6,
      color: black,
    })
  }

  // =========================================================
  // DATE
  // =========================================================

  drawFitText({
    text: date,
    x: 306,
    y: 231,
    font: bold,
    size: 10,
    maxWidth: 180,
    minimumSize: 8,
  })

  // =========================================================
  // SAVE
  // =========================================================

  const bytes = await pdfDoc.save()

  return URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/pdf',
    })
  )
}
