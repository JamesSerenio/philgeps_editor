
import {
  PDFDocument,
  degrees,
} from 'pdf-lib'

import * as pdfService from '../pdfService'

import * as schedulePdf from './schedulePdf'
import * as slccPdf from './slccPdf'
import * as technicalSpecsPdf from './technicalSpecsPdf'
import * as afterSalesPdf from './afterSalesPdf'
import * as warrantyPdf from './warrantyPdf'
import * as priceSchedulePdf from './priceSchedulePdf'
import * as summaryPdf from './summaryPdf'
import * as bidFormPdf from './bidFormPdf'
import * as secretarysCertificatePdf from './secretarysCertificatePdf'

// =====================================================
// CONFIGURATION
// =====================================================

const STATIC_FOLDER = '/pdf/static'

// A4 paper in PDF points: 210 mm x 297 mm
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89

// Only these static documents are resized to A4.
const A4_DOCUMENTS = new Set([
  'TAX_template.pdf',
])

// Margin for resized document content.
const A4_MARGIN = 20

function staticFile(filename) {
  return (
    `${STATIC_FOLDER}/` +
    encodeURIComponent(filename)
  )
}

// =====================================================
// COMMON HELPERS
// =====================================================

function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
}

// =====================================================
// SELECT SLCC TEMPLATE
// =====================================================

function chooseSlccVariant(setup, selected) {
  const value = normalize(
    selected ??
    setup?.slccVariant ??
    setup?.slccType ??
    setup?.selectedSlcc
  )

  if (
    value.includes('cctv') ||
    value.includes('camera')
  ) {
    return 'cctv'
  }

  if (
    value.includes('streetlight') ||
    value.includes('street_light') ||
    value.includes('solar')
  ) {
    return 'streetlight'
  }

  return /cctv|surveillance|camera/i.test(
    String(setup?.projectTitle ?? '')
  )
    ? 'cctv'
    : 'streetlight'
}

// =====================================================
// SELECT BID SECURITY TEMPLATE
// =====================================================

function chooseBidSecurityVariant(
  setup,
  bidSecurity,
  selected
) {
  const value = normalize(
    selected ??
    setup?.bidSecurityVariant ??
    setup?.bidSecurityTemplate ??
    bidSecurity?.selectedTemplate ??
    bidSecurity?.variant ??
    bidSecurity?.templateVariant
  )

  if (
    [
      'with_table',
      'withtable',
      'table',
      'bid_security_with_table',
    ].includes(value)
  ) {
    return 'with_table'
  }

  if (
    [
      'without_table',
      'withouttable',
      'no_table',
      'bid_security_without_table',
    ].includes(value)
  ) {
    return 'without_table'
  }

  if (
    typeof bidSecurity?.withTable === 'boolean'
  ) {
    return bidSecurity.withTable
      ? 'with_table'
      : 'without_table'
  }

  if (
    typeof setup?.bidSecurityWithTable ===
    'boolean'
  ) {
    return setup.bidSecurityWithTable
      ? 'with_table'
      : 'without_table'
  }

  return 'without_table'
}

// =====================================================
// SELECT OMNIBUS TEMPLATE
// =====================================================

function chooseOmnibusVariant(
  setup,
  omnibus,
  selected
) {
  const value = normalize(
    selected ??
    setup?.omnibusVariant ??
    setup?.omnibusTemplate ??
    omnibus?.selectedTemplate ??
    omnibus?.templateVariant
  )

  return value.includes('initao')
    ? 'initao_lgu'
    : 'old_default'
}

// =====================================================
// FIND EXISTING PDF GENERATOR
// =====================================================

function generatedDocument(
  name,
  candidates,
  data
) {
  return {
    name,

    async generate() {
      for (const candidate of candidates) {
        const [
          moduleNamespace,
          functionName,
        ] = candidate

        const generator =
          moduleNamespace?.[functionName]

        if (
          typeof generator === 'function'
        ) {
          return await generator(data)
        }
      }

      throw new Error(
        `PDF generator not found for ${name}. ` +
        `Expected: ${candidates
          .map((candidate) => candidate[1])
          .join(', ')}`
      )
    },
  }
}

// =====================================================
// STATIC PDF
// =====================================================

function staticDocument(filename) {
  return {
    name: filename,
    path: staticFile(filename),
  }
}

// =====================================================
// LOAD AND VERIFY PDF
// =====================================================

async function loadPdf(source, name) {
  let bytes

  if (
    source &&
    typeof source.getPageCount === 'function' &&
    typeof source.copyPages === 'function'
  ) {
    return source
  }

  if (
    typeof source === 'string'
  ) {
    const response = await fetch(
      source,
      {
        cache: 'no-store',
      }
    )

    if (!response.ok) {
      throw new Error(
        `${name}: Failed to load PDF. ` +
        `HTTP ${response.status}.`
      )
    }

    bytes = await response.arrayBuffer()
  } else if (
    typeof Blob !== 'undefined' &&
    source instanceof Blob
  ) {
    bytes = await source.arrayBuffer()
  } else if (
    source instanceof Uint8Array ||
    source instanceof ArrayBuffer
  ) {
    bytes = source
  } else {
    throw new Error(
      `${name}: Invalid PDF source.`
    )
  }

  const buffer =
    bytes instanceof Uint8Array
      ? bytes
      : new Uint8Array(bytes)

  const header = new TextDecoder(
    'ascii'
  ).decode(
    buffer.slice(0, 8)
  )

  if (!header.startsWith('%PDF-')) {
    throw new Error(
      `${name}: Invalid PDF file. ` +
      'Check its path in public/pdf.'
    )
  }

  try {
    return await PDFDocument.load(buffer)
  } catch (error) {
    throw new Error(
      `${name}: Failed to read PDF. ` +
      (error.message || String(error)),
      { cause: error }
    )
  }
}

// =====================================================
// NEW: AUTOMATIC A4 PDF CONVERSION
//
// Used ONLY for TAX_template.pdf.
//
// Features:
// - A4 portrait page
// - Proportional resizing
// - Centered content
// - Preserves aspect ratio
// - Handles page rotation
// - Keeps every source page
// =====================================================

async function appendPdfAsA4(
  combined,
  sourcePdf
) {
  const sourcePages = sourcePdf.getPages()

  for (const sourcePage of sourcePages) {
    const embedded = await combined.embedPage(
      sourcePage
    )

    const originalWidth = embedded.width
    const originalHeight = embedded.height

    if (
      originalWidth <= 0 ||
      originalHeight <= 0
    ) {
      throw new Error(
        'Invalid Tax Template page dimensions.'
      )
    }

    // Preserve the visual page orientation.
    const rotation = (
      (
        sourcePage.getRotation().angle %
        360
      ) + 360
    ) % 360

    const sideways =
      rotation === 90 ||
      rotation === 270

    const visualWidth = sideways
      ? originalHeight
      : originalWidth

    const visualHeight = sideways
      ? originalWidth
      : originalHeight

    // Available space inside A4 margins.
    const availableWidth =
      A4_WIDTH - A4_MARGIN * 2

    const availableHeight =
      A4_HEIGHT - A4_MARGIN * 2

    // Fit without cropping or stretching.
    // Do not enlarge smaller source pages.
    const scale = Math.min(
      1,
      availableWidth / visualWidth,
      availableHeight / visualHeight
    )

    const contentWidth =
      visualWidth * scale

    const contentHeight =
      visualHeight * scale

    // Center source content on the A4 page.
    const left =
      (A4_WIDTH - contentWidth) / 2

    const bottom =
      (A4_HEIGHT - contentHeight) / 2

    const scaledWidth =
      originalWidth * scale

    const scaledHeight =
      originalHeight * scale

    const a4Page = combined.addPage([
      A4_WIDTH,
      A4_HEIGHT,
    ])

    // Rotate around the correct origin,
    // keeping the visible area inside A4.
    let x = left
    let y = bottom

    if (rotation === 90) {
      x = left + scaledHeight
      y = bottom
    } else if (rotation === 180) {
      x = left + scaledWidth
      y = bottom + scaledHeight
    } else if (rotation === 270) {
      x = left
      y = bottom + scaledWidth
    }

    a4Page.drawPage(
      embedded,
      {
        x,
        y,
        width: scaledWidth,
        height: scaledHeight,
        rotate: degrees(rotation),
      }
    )
  }

  return sourcePages.length
}

// =====================================================
// COPY ORIGINAL PDF PAGES
//
// Used for the other 20 document sections.
// =====================================================

async function appendOriginalPdf(
  combined,
  sourcePdf
) {
  const pages = await combined.copyPages(
    sourcePdf,
    sourcePdf.getPageIndices()
  )

  for (const page of pages) {
    combined.addPage(page)
  }

  return pages.length
}

// =====================================================
// COPY PDF WITH OPTIONAL A4 CONVERSION
// =====================================================

async function appendDocument(
  combined,
  sourcePdf,
  documentName
) {
  if (
    A4_DOCUMENTS.has(documentName)
  ) {
    console.info(
      `Converting ${documentName} to A4...`
    )

    return appendPdfAsA4(
      combined,
      sourcePdf
    )
  }

  return appendOriginalPdf(
    combined,
    sourcePdf
  )
}

// =====================================================
// PREPARE DOCUMENT DATA
// =====================================================

function createDocumentData({
  setup,
  technical,
  schedule,
  priceValues,
  bidSecurity,
  omnibus,
  slccVariant,
  bidSecurityVariant,
  omnibusVariant,
}) {
  const common = {
    ...setup,

    items: technical,
    technical,
    technicalSpecs: technical,

    schedule,
    priceValues,

    bidSecurity,
    omnibus,
    slccVariant,

    slccEntries:
      setup?.slccEntries ?? {},

    slccContractTypes:
      setup?.slccContractTypes ?? {},

    servicePeriodYears:
      setup?.servicePeriodYears ?? 1,

    productWarrantyYears:
      setup?.productWarrantyYears ?? 2,

    authorizedRepresentative:
      setup?.submittedBy ??
      setup?.authorizedRepresentative ??
      '',

    representativeDesignation:
      setup?.designation ??
      setup?.representativeDesignation ??
      '',
  }

  return {
    common,

    scheduleData: {
      ...common,
      items: schedule,
    },

    slccData: {
      ...common,
      slccVariant,

      slccTemplate:
        slccVariant === 'cctv'
          ? 'SLCC_table_cctv.pdf'
          : 'SLCC_table_streetlight.pdf',
    },

    bidSecurityData: {
      ...common,
      ...bidSecurity,
      templateVariant: bidSecurityVariant,
      bidSecurityVariant,
    },

    omnibusData: {
      ...common,
      ...omnibus,
      templateVariant: omnibusVariant,
      omnibusVariant,
    },
  }
}

// =====================================================
// EXACT 21-DOCUMENT ORDER
// =====================================================

function buildDocumentOrder({
  common,
  scheduleData,
  slccData,
  bidSecurityData,
  omnibusData,
}) {
  return [
    // 01
    generatedDocument(
      'TABLE OF CONTENTS.pdf',
      [
        [
          pdfService,
          'generateTableOfContentsPreview',
        ],
      ],
      common
    ),

    // 02
    staticDocument(
      'SEC Registration Certificate.pdf'
    ),

    // 03
    // AUTOMATIC A4 CONVERSION
    staticDocument(
      'TAX_template.pdf'
    ),

    // 04
    staticDocument(
      'Certificate of Registration (COR).pdf'
    ),

    // 05
    staticDocument(
      'Latest Income and Business Tax Returns.pdf'
    ),

    // 06
    generatedDocument(
      'Statement of Ongoing Government and Private Contracts,.pdf',
      [
        [
          pdfService,
          'generateOngoingContractsPreview',
        ],
      ],
      common
    ),

    // 07
    generatedDocument(
      slccData.slccVariant === 'cctv'
        ? 'SLCC_table_cctv.pdf'
        : 'SLCC_table_streetlight.pdf',
      [
        [
          slccPdf,
          'generateSlccPreview',
        ],
        [
          pdfService,
          'generateSlccPreview',
        ],
      ],
      slccData
    ),

    // 08
    staticDocument(
      'PhilGEPS Platinum Certificate.pdf'
    ),

    // 09
    staticDocument(
      'Audited Financial Statements.pdf'
    ),

    // 10
    generatedDocument(
      'NFCC_Template.pdf',
      [
        [
          pdfService,
          'generateNfccPreview',
        ],
      ],
      common
    ),

    // 11
    generatedDocument(
      'Technical Specifications.pdf',
      [
        [
          technicalSpecsPdf,
          'generateTechnicalSpecsPreview',
        ],
        [
          pdfService,
          'generateTechnicalSpecsPreview',
        ],
      ],
      common
    ),

    // 12
    generatedDocument(
      bidSecurityData.bidSecurityVariant ===
      'with_table'
        ? 'Bid Security with table.pdf'
        : 'Bid Security without table.pdf',
      [
        [
          pdfService,
          'generateBidSecurityPreview',
        ],
      ],
      bidSecurityData
    ),

    // 13
    generatedDocument(
      'Production Delivery Schedule.pdf',
      [
        [
          schedulePdf,
          'generateScheduleRequirementsPreview',
        ],
        [
          schedulePdf,
          'generateSchedulePreview',
        ],
      ],
      scheduleData
    ),

    // 14
    generatedDocument(
      'Manpower Requirements.pdf',
      [
        [
          pdfService,
          'generateManpowerPreview',
        ],
      ],
      common
    ),

    // 15
    generatedDocument(
      omnibusData.omnibusVariant ===
      'initao_lgu'
        ? 'Omnibus Sworn Statement Initao.pdf'
        : 'Omnibus Sworn Statement.pdf',
      [
        [
          pdfService,
          'generateOmnibusPreview',
        ],
      ],
      omnibusData
    ),

    // 16
    generatedDocument(
      'After Sales.pdf',
      [
        [
          afterSalesPdf,
          'generateAfterSalesPreview',
        ],
      ],
      common
    ),

    // 17
    generatedDocument(
      'Warranty.pdf',
      [
        [
          warrantyPdf,
          'generateProductWarrantyPreview',
        ],
      ],
      common
    ),

    // 18
    generatedDocument(
      'BID_FORM_CLEAN_TEMPLATE.pdf',
      [
        [
          bidFormPdf,
          'generateBidFormPreview',
        ],
      ],
      common
    ),

    // 19
    generatedDocument(
      "SECRETARY'S CERTIFICATE.pdf",
      [
        [
          secretarysCertificatePdf,
          'generateSecretaryCertificatePreview',
        ],
      ],
      common
    ),

    // 20
    generatedDocument(
      'PRICE SCHEDULE FOR GOODS.pdf',
      [
        [
          priceSchedulePdf,
          'generatePriceSchedulePreview',
        ],
      ],
      common
    ),

    // 21
    generatedDocument(
      'SUMMARY OF BID PRICES.pdf',
      [
        [
          summaryPdf,
          'generateSummaryPreview',
        ],
      ],
      common
    ),
  ]
}

// =====================================================
// GENERATE FULL BID PACKAGE
// =====================================================

export async function generateFullBidPackagePdf({
  setup = {},

  technical = [],
  schedule = [],

  priceValues = {},

  bidSecurity = {},
  omnibus = {},

  slccVariant: selectedSlcc,
  bidSecurityVariant: selectedBidSecurity,
  omnibusVariant: selectedOmnibus,
} = {}) {
  if (!setup?.referenceNumber) {
    throw new Error(
      'Reference Number is required.'
    )
  }

  // ---------------------------------------------------
  // SELECT TEMPLATES
  // ---------------------------------------------------

  const slccVariant =
    chooseSlccVariant(
      setup,
      selectedSlcc
    )

  const bidSecurityVariant =
    chooseBidSecurityVariant(
      setup,
      bidSecurity,
      selectedBidSecurity
    )

  const omnibusVariant =
    chooseOmnibusVariant(
      setup,
      omnibus,
      selectedOmnibus
    )

  // ---------------------------------------------------
  // BUILD DATA
  // ---------------------------------------------------

  const data = createDocumentData({
    setup,
    technical,
    schedule,
    priceValues,
    bidSecurity,
    omnibus,
    slccVariant,
    bidSecurityVariant,
    omnibusVariant,
  })

  // ---------------------------------------------------
  // BUILD DOCUMENT ORDER
  // ---------------------------------------------------

  const documents =
    buildDocumentOrder(data)

  if (documents.length !== 21) {
    throw new Error(
      'The bid package must contain 21 sections.'
    )
  }

  // ---------------------------------------------------
  // CREATE FINAL PDF
  // ---------------------------------------------------

  const combined =
    await PDFDocument.create()

  combined.setTitle(
    `Bid Documents - ${setup.referenceNumber}`
  )

  combined.setSubject(
    String(
      setup.projectTitle ??
      'PhilGEPS Bid Documents'
    )
  )

  const temporaryUrls = []

  try {
    for (
      let index = 0;
      index < documents.length;
      index += 1
    ) {
      const document =
        documents[index]

      try {
        let source

        // ---------------------------------------------
        // DYNAMIC OR STATIC PDF
        // ---------------------------------------------

        if (document.generate) {
          source =
            await document.generate()
        } else if (document.path) {
          source = document.path
        } else {
          throw new Error(
            'No PDF generator configured.'
          )
        }

        if (!source) {
          throw new Error(
            'No PDF was returned.'
          )
        }

        // ---------------------------------------------
        // TRACK GENERATED BLOB URLS
        // ---------------------------------------------

        if (
          typeof source === 'string' &&
          source.startsWith('blob:')
        ) {
          temporaryUrls.push(source)
        }

        // ---------------------------------------------
        // LOAD DOCUMENT
        // ---------------------------------------------

        const pdf = await loadPdf(
          source,
          document.name
        )

        if (
          pdf.getPageCount() === 0
        ) {
          throw new Error(
            'PDF has no pages.'
          )
        }

        // ---------------------------------------------
        // ADD TO FINAL PDF
        //
        // TAX_template.pdf => A4
        // All other PDFs => Original dimensions
        // ---------------------------------------------

        const addedPages =
          await appendDocument(
            combined,
            pdf,
            document.name
          )

        console.info(
          `[${index + 1}/21] ` +
          `${document.name} - ` +
          `${addedPages} pages added`
        )

      } catch (error) {
        console.error(
          `Failed to generate ${document.name}`,
          error
        )

        throw new Error(
          `Document ${index + 1}/21 - ` +
          `${document.name}: ` +
          (error.message || String(error)),
          { cause: error }
        )
      }
    }

    // -------------------------------------------------
    // VALIDATE FINAL DOCUMENT
    // ---------------------------------------------------

    if (
      combined.getPageCount() === 0
    ) {
      throw new Error(
        'No PDF pages were generated.'
      )
    }

    // -------------------------------------------------
    // SAVE COMPLETE BID PACKAGE
    // ---------------------------------------------------

    const bytes =
      await combined.save({
        useObjectStreams: false,
      })

    const blob = new Blob(
      [bytes],
      {
        type: 'application/pdf',
      }
    )

    console.info(
      'Final bid package generated:',
      combined.getPageCount(),
      'pages'
    )

    return URL.createObjectURL(blob)

  } finally {
    // Clean up temporary individual PDFs.
    for (const url of temporaryUrls) {
      URL.revokeObjectURL(url)
    }
  }
}
