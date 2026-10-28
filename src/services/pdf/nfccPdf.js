import { getTemplatePath, fetchAsset } from '../../lib/bidderAssets'
import { fillBuiltechTable } from './builtechDataPdf'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatLongDate } from '../../lib/documentSetup'
import { clean } from './pdfHelpers'

export async function generateNfccPreview(project) {
  const response = await fetchAsset(getTemplatePath("NFCC_Template.pdf", project))

  if (!response.ok) {
    throw new Error('Unable to load NFCC_Template.pdf')
  }

  const sourceBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(sourceBytes)

  if (pdfDoc.getPageCount() === 0) {
    throw new Error('NFCC_Template.pdf has no pages.')
  }

  const page = pdfDoc.getPage(0)

  const regular = await pdfDoc.embedFont(
    StandardFonts.Helvetica,
  )

  const bold = await pdfDoc.embedFont(
    StandardFonts.HelveticaBold,
  )

  const italic = await pdfDoc.embedFont(
    StandardFonts.HelveticaOblique,
  )

  const white = rgb(1, 1, 1)
  const black = rgb(0, 0, 0)
  const red = rgb(0.85, 0, 0)

  // =========================================================
  // VALUES FROM DOCUMENT SETUP
  // =========================================================

  const procuringEntity = clean(
    project?.procuringEntity,
  ).toUpperCase()

  const referenceNumber = clean(
    project?.referenceNumber,
  )

  const projectTitle = clean(
    project?.projectTitle,
  ).toUpperCase()

  const bidderName = clean(
    project?.bidderName,
  ).toUpperCase()

  const businessAddress = clean(
    project?.businessAddress,
  ).toUpperCase()

  const submittedBy = clean(
    project?.submittedBy,
  ).toUpperCase()

  const designation = clean(
    project?.designation,
  )

  const date = formatLongDate(
    project?.date,
  )

  // =========================================================
  // LOCAL HELPERS
  // =========================================================

  const headerText = []
  function drawText(
    value,
    x,
    y,
    size = 9,
    font = regular,
    color = black,
  ) {
    const text = clean(value)

    if (!text) return

    const options = {
      x,
      y,
      size,
      font,
      color,
    }
    page.drawText(text, options)
    if (y >= 677) headerText.push({ text, options })
  }

  function fitFontSize(
    value,
    font,
    startSize,
    maxWidth,
    minSize = 6,
  ) {
    const text = clean(value)

    if (!text) {
      return startSize
    }

    let size = startSize

    while (
      size > minSize &&
      font.widthOfTextAtSize(
        text,
        size,
      ) > maxWidth
    ) {
      size -= 0.15
    }

    return Math.max(
      size,
      minSize,
    )
  }

  function drawFitText({
    value,
    x,
    y,
    width,
    size = 9,
    minSize = 6,
    font = regular,
    color = black,
  }) {
    const text = clean(value)

    if (!text) return

    const finalSize = fitFontSize(
      text,
      font,
      size,
      width,
      minSize,
    )

    const options = {
      x,
      y,
      size: finalSize,
      font,
      color,
    }
    page.drawText(text, options)
    if (y >= 677) headerText.push({ text, options })
  }

  // =========================================================
  // CLEAR OLD HEADER ONLY
  //
  // IMPORTANT:
  // Hindi gagalawin ang paragraph/body/table.
  // =========================================================

  page.drawRectangle({
    x: 18,
    y: 675,
    width: 560,
    height: 100,
    color: white,
  })

  // =========================================================
  // NEW HEADER
  //
  // SAME LABELS AS YOUR FIRST PDF:
  //
  // NAME OF THE PROCURING ENTITY
  // PROJECT TITLE
  // REFERENCE NUMBER
  // CONTRACTOR
  // ADDRESS
  //
  // Values = RED
  // Labels = BLACK
  // =========================================================

  const labelX = 29
  const colonX = 203
  const valueX = 220
  const valueWidth = 345

  const labelSize = 9.4
  const valueSize = 10.2

  // ---------------------------------------------------------
  // NAME OF THE PROCURING ENTITY
  // ---------------------------------------------------------

  drawText(
    'NAME OF THE PROCURING ENTITY',
    labelX,
    760,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    760,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: procuringEntity,
    x: valueX,
    y: 760,
    width: valueWidth,
    size: valueSize,
    minSize: 7.4,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // PROJECT TITLE
  // ---------------------------------------------------------

  drawText(
    'PROJECT TITLE',
    labelX,
    741,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    741,
    labelSize,
    regular,
    black,
  )

  // Draw after moving the body, keeping long titles at a readable size.
  const titleLines = wrapHeaderValue(projectTitle)

  // ---------------------------------------------------------
  // REFERENCE NUMBER
  // ---------------------------------------------------------

  drawText(
    'REFERENCE NUMBER',
    labelX,
    715,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    715,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: referenceNumber,
    x: valueX,
    y: 715,
    width: valueWidth,
    size: valueSize,
    minSize: 8,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // CONTRACTOR
  // ---------------------------------------------------------

  drawText(
    'CONTRACTOR',
    labelX,
    696,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    696,
    labelSize,
    regular,
    black,
  )

  drawFitText({
    value: bidderName,
    x: valueX,
    y: 696,
    width: valueWidth,
    size: valueSize,
    minSize: 7.4,
    font: bold,
    color: red,
  })

  // ---------------------------------------------------------
  // ADDRESS
  // ---------------------------------------------------------

  drawText(
    'ADDRESS',
    labelX,
    677,
    labelSize,
    regular,
    black,
  )

  drawText(
    ':',
    colonX,
    677,
    labelSize,
    regular,
    black,
  )

  // Keep the address as readable as the other header values. Wrap even a
  // single long token instead of squeezing the entire address into one line.
  function wrapHeaderValue(value) {
    const addressLines = []
    let addressLine = ''
    for (const word of value.split(/\s+/).filter(Boolean)) {
      const next = addressLine ? addressLine + ' ' + word : word
      if (addressLine && bold.widthOfTextAtSize(next, valueSize) > valueWidth) {
        addressLines.push(addressLine)
        addressLine = ''
      }
      for (const character of (addressLine ? ' ' : '') + word) {
        if (bold.widthOfTextAtSize(addressLine + character, valueSize) > valueWidth) {
          addressLines.push(addressLine)
          addressLine = ''
        }
        addressLine += character
      }
    }
    if (addressLine) addressLines.push(addressLine)
    return addressLines
    }
    const addressLines = wrapHeaderValue(businessAddress)
  
    // =========================================================
    // REMOVE OLD SIGNATORY ONLY
    //
    // Hindi gagalawin ang NFCC computation table.
    // =========================================================
  
    page.drawRectangle({
      x: 18,
      y: 155,
      width: 560,
      height: 132,
      color: white,
    })
  
    // =========================================================
    // NEW SIGNATORY
    // =========================================================
  
    const footerLabelX = 32
    const footerColonX = 128
    const footerValueX = 155
  
    const footerLabelSize = 10
    const footerValueSize = 10.3
  
    // ---------------------------------------------------------
    // SUBMITTED
    // ---------------------------------------------------------
  
    const submittedY = 258
  
    drawText(
      'Submitted',
      footerLabelX,
      submittedY,
      footerLabelSize,
      regular,
      black,
    )
  
    drawText(
      ':',
      footerColonX,
      submittedY,
      footerLabelSize,
      regular,
      black,
    )
  
    const submittedSize = fitFontSize(
      submittedBy,
      bold,
      footerValueSize,
      300,
      8,
    )
  
    drawText(
      submittedBy,
      footerValueX,
      submittedY,
      submittedSize,
      bold,
      black,
    )
  
    if (submittedBy) {
      const submittedWidth =
        bold.widthOfTextAtSize(
          submittedBy,
          submittedSize,
        )
  
      page.drawLine({
        start: {
          x: footerValueX,
          y: submittedY - 2,
        },
        end: {
          x:
            footerValueX +
            submittedWidth,
          y: submittedY - 2,
        },
        thickness: 0.7,
        color: black,
      })
    }
  
    drawText(
      '(Printed Name & Signature)',
      footerValueX,
      246,
      6.3,
      regular,
      black,
    )
  
    // ---------------------------------------------------------
    // DESIGNATION
    // ---------------------------------------------------------
  
    drawText(
      'Designation',
      footerLabelX,
      223,
      footerLabelSize,
      regular,
      black,
    )
  
    drawText(
      ':',
      footerColonX,
      223,
      footerLabelSize,
      regular,
      black,
    )
  
    drawFitText({
      value: designation,
      x: footerValueX,
      y: 223,
      width: 300,
      size: footerValueSize,
      minSize: 8,
      font: italic,
      color: black,
    })
  
    // ---------------------------------------------------------
    // NAME OF FIRM
    // ---------------------------------------------------------
  
    drawText(
      'Name of Firm',
      footerLabelX,
      200,
      footerLabelSize,
      regular,
      black,
    )
  
    drawText(
      ':',
      footerColonX,
      200,
      footerLabelSize,
      regular,
      black,
    )
  
    drawFitText({
      value: bidderName,
      x: footerValueX,
      y: 200,
      width: 300,
      size: footerValueSize,
      minSize: 8,
      font: bold,
      color: black,
    })
  
    // ---------------------------------------------------------
    // DATE
    // ---------------------------------------------------------
  
    drawText(
      'Date',
      footerLabelX,
      177,
      footerLabelSize,
      regular,
      black,
    )
  
    drawText(
      ':',
      footerColonX,
      177,
      footerLabelSize,
      regular,
      black,
    )
  
    drawFitText({
      value: date,
      x: footerValueX,
      y: 177,
      width: 300,
      size: footerValueSize,
      minSize: 8,
      font: regular,
      color: black,
    })
  
    // =========================================================
    // SAVE
    // =========================================================
  
    await fillBuiltechTable(pdfDoc, project, 'nfcc')
    const addressLeading = 14
    const titleExtraHeight = Math.max(0, titleLines.length - 1) * addressLeading
    const extraHeight = titleExtraHeight + Math.max(0, addressLines.length - 1) * addressLeading
    if (extraHeight) {
      // Translate the complete existing body, table and signature together so
      // extra address lines never cover the original NFCC paragraph.
      const bodyHeight = 668
      // Mask the copied header as well as clipping it. Text extraction for Word
      // can otherwise read invisible header text outside a PDF form's clip box.
      const bodyDocument = await PDFDocument.create()
      const [bodyPage] = await bodyDocument.copyPages(pdfDoc, [0])
      bodyDocument.addPage(bodyPage)
      bodyPage.drawRectangle({ x: 0, y: bodyHeight, width: page.getWidth(),
        height: page.getHeight() - bodyHeight, color: white })
      const body = await pdfDoc.embedPage(bodyPage, { left: 0, bottom: 0, right: page.getWidth(), top: bodyHeight })
      await pdfDoc.flush()
      page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: bodyHeight, color: white })
      if (extraHeight <= 120) {
        page.drawPage(body, { x: 0, y: -extraHeight, width: page.getWidth(), height: bodyHeight })
      } else {
        const continuation = pdfDoc.addPage([page.getWidth(), page.getHeight()])
        continuation.drawPage(body, { x: 0, y: continuation.getHeight() - bodyHeight - 36,
          width: page.getWidth(), height: bodyHeight })
      }
      // Draw the header last so editable Word extraction honors the same paint
      // order as the PDF, including the copied body's invisible header mask.
      page.drawRectangle({ x: 0, y: bodyHeight, width: page.getWidth(),
        height: page.getHeight() - bodyHeight, color: white })
      const title = 'NET FINANCIAL CONTRACTING CAPACITY (NFCC)'
      drawText(title, (page.getWidth() - bold.widthOfTextAtSize(title, 12)) / 2,
        page.getHeight() - 45, 12, bold, black)
      page.drawLine({ start: { x: 18, y: page.getHeight() - 49 },
        end: { x: page.getWidth() - 18, y: page.getHeight() - 49 }, thickness: 1, color: black })
      // Use a snapshot: drawText above also recorded the new title.
      for (const { text, options } of headerText.slice(0, -1)) {
        page.drawText(text, { ...options,
          y: options.y <= 715 ? options.y - titleExtraHeight : options.y })
      }
    }
    titleLines.forEach((line, index) => drawText(line, valueX, 741 - index * addressLeading, valueSize, bold, red))
    addressLines.forEach((line, index) => drawText(line, valueX, 677 - titleExtraHeight - index * addressLeading, valueSize, bold, red))
    const bytes =
      await pdfDoc.save()
  
    const blob =
      new Blob(
        [bytes],
        {
          type: 'application/pdf',
        },
      )
  
    return URL.createObjectURL(
      blob,
    )
  }
