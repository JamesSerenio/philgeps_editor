
import { PDFDocument } from 'pdf-lib'

import {
  projectDocuments,
} from '../../lib/projectDocuments'

import {
  generateNfccPreview,
  generateOngoingContractsPreview,
  generateTableOfContentsPreview,
  generateBidSecurityPreview,
  generateManpowerPreview,
  generateOmnibusPreview,
} from '../pdfService'

import {
  generateAfterSalesPreview,
} from './afterSalesPdf'

import {
  generateProductWarrantyPreview,
} from './warrantyPdf'

import {
  generateSlccPreview,
} from './slccPdf'

import {
  generateTechnicalSpecsPreview,
} from './technicalSpecsPdf'

import {
  generateScheduleRequirementsPreview,
} from './schedulePdf'

import {
  generatePriceSchedulePreview,
} from './priceSchedulePdf'

import {
  generateSummaryPreview,
} from './summaryPdf'

import {
  generateBidFormPreview,
} from './bidFormPdf'

import {
  generateSecretaryCertificatePreview,
} from './secretarysCertificatePdf'

// =====================================================
// CCTV OR STREETLIGHT SELECTION
// =====================================================

function chooseVariant(setup) {
  if (
    setup?.slccVariant === 'cctv' ||
    setup?.slccVariant === 'streetlight'
  ) {
    return setup.slccVariant
  }

  return /cctv|surveillance|camera/i.test(
    String(setup?.projectTitle ?? '')
  )
    ? 'cctv'
    : 'streetlight'
}

// =====================================================
// STATIC PDF FILES
// =====================================================

// Use filenames exactly as they appear in public/pdf/static.
// Add the full filenames of Mayor's Permit and tax returns
// here when confirmed.

const LEGAL_STATIC_FILES = [
  'PhilGEPS Platinum Certificate.pdf',
  'SEC Registration Certificate.pdf',
  'Certificate of Registration (COR).pdf',
]

const FINANCIAL_STATIC_FILES = [
  'Audited Financial Statements.pdf',
]

function staticDoc(filename) {
  return {
    id: `static:${filename}`,
    title: filename,
    staticPath: filename,
  }
}

// =====================================================
// DOCUMENT ORDER
// =====================================================

function documentOrder() {
  const docs = projectDocuments.filter(
    (doc) => doc.id !== 'slcc'
  )

  // Put the selected CCTV / Streetlight SLCC table
  // after Statement of Ongoing Contracts.
  const index = docs.findIndex(
    (doc) => doc.id === 'ongoing'
  )

  const slcc = projectDocuments.find(
    (doc) => doc.id === 'slcc'
  )

  if (index !== -1 && slcc) {
    docs.splice(
      index + 1,
      0,
      slcc
    )
  } else if (slcc) {
    docs.push(slcc)
  }

  // ===================================================
  // SECRETARY'S CERTIFICATE
  // ===================================================

  // Include even if it is not yet listed in
  // projectDocuments.js.
  if (
    !docs.some(
      (doc) => doc.id === 'secretaryCertificate'
    )
  ) {
    const index = docs.findIndex(
      (doc) => doc.id === 'omnibus'
    )

    const item = {
      id: 'secretaryCertificate',
      title: "SECRETARY'S CERTIFICATE",
    }

    if (index === -1) {
      docs.push(item)
    } else {
      docs.splice(
        index + 1,
        0,
        item
      )
    }
  }

  // ===================================================
  // LEGAL STATIC FILES
  // ===================================================

  const contentsIndex = docs.findIndex(
    (doc) => doc.id === 'contents'
  )

  const legal = LEGAL_STATIC_FILES
    .filter(
      (filename) =>
        !docs.some(
          (doc) =>
            doc.staticPath === filename
        )
    )
    .map(staticDoc)

  docs.splice(
    contentsIndex === -1
      ? 0
      : contentsIndex + 1,
    0,
    ...legal
  )

  // ===================================================
  // FINANCIAL STATIC FILES
  // ===================================================

  const financeIndex = docs.findIndex(
    (doc) => doc.id === 'nfcc'
  )

  const financial = FINANCIAL_STATIC_FILES
    .filter(
      (filename) =>
        !docs.some(
          (doc) =>
            doc.staticPath === filename
        )
    )
    .map(staticDoc)

  docs.splice(
    financeIndex === -1
      ? docs.length
      : financeIndex,
    0,
    ...financial
  )

  return docs
}

// =====================================================
// VALIDATE AND LOAD PDF
// =====================================================

async function readPdf(source, title) {
  const response = await fetch(source, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `${title}: PDF request failed (HTTP ${response.status}).`
    )
  }

  const bytes = await response.arrayBuffer()

  const header = new TextDecoder(
    'ascii'
  ).decode(
    bytes.slice(0, 8)
  )

  if (!header.startsWith('%PDF-')) {
    throw new Error(
      `${title}: URL returned an HTML page or non-PDF. Check the template path.`
    )
  }

  return PDFDocument.load(bytes)
}

// =====================================================
// EXISTING PDF GENERATORS
// =====================================================

const GENERATORS = {
  contents: generateTableOfContentsPreview,
  ongoing: generateOngoingContractsPreview,
  slcc: generateSlccPreview,
  nfcc: generateNfccPreview,
  technical: generateTechnicalSpecsPreview,
  bidSecurity: generateBidSecurityPreview,
  schedule: generateScheduleRequirementsPreview,
  manpower: generateManpowerPreview,
  omnibus: generateOmnibusPreview,
  priceSchedule: generatePriceSchedulePreview,
  summary: generateSummaryPreview,

  // NEW
  secretaryCertificate:
    generateSecretaryCertificatePreview,
}

// =====================================================
// GET DOCUMENT GENERATOR
// =====================================================

function getGenerator(doc) {
  if (GENERATORS[doc.id]) {
    return GENERATORS[doc.id]
  }

  const label =
    `${doc.id ?? ''} ${doc.title ?? ''}`

  if (/bid[\s_-]*form/i.test(label)) {
    return generateBidFormPreview
  }

  if (/after[\s-]*sales/i.test(label)) {
    return generateAfterSalesPreview
  }

  if (
    /certificate of product warranty/i.test(
      label
    )
  ) {
    return generateProductWarrantyPreview
  }

  return null
}

// =====================================================
// GENERATE COMPLETE BID PACKAGE
// =====================================================

export async function generateFullBidPackagePdf({
  setup,
  technical = [],
  schedule = [],
  priceValues = {},
  bidSecurity = {},
  omnibus = {},
}) {
  if (!setup?.referenceNumber) {
    throw new Error(
      'Reference Number is required.'
    )
  }

  const variant = chooseVariant(setup)

  const combined = await PDFDocument.create()

  const generatedUrls = []

  const common = {
    ...setup,

    items: technical,
    priceValues,

    slccVariant: variant,

    slccEntries:
      setup.slccEntries ?? {},

    slccContractTypes:
      setup.slccContractTypes ?? {},

    servicePeriodYears:
      setup.servicePeriodYears ?? 1,

    productWarrantyYears:
      setup.productWarrantyYears ?? 2,

    authorizedRepresentative:
      setup.submittedBy ?? '',

    representativeDesignation:
      setup.designation ?? '',
  }

  try {
    for (const doc of documentOrder()) {
      const generator =
        getGenerator(doc)

      let source

      if (generator) {
        const data = {
          ...common,

          items:
            doc.id === 'schedule'
              ? schedule
              : technical,

          templateVariant:
            doc.id === 'omnibus'
              ? (
                  omnibus?.templateVariant === 'initao_lgu'
                    ? 'initao_lgu'
                    : 'old_default'
                )
              : (
                  bidSecurity?.templateVariant === 'with_table'
                    ? 'with_table'
                    : 'without_table'
                ),
        }

        source = await generator(data)

        if (
          typeof source !== 'string' ||
          !source
        ) {
          throw new Error(
            `${doc.title ?? doc.id}: Generator returned no PDF URL.`
          )
        }

        if (source.startsWith('blob:')) {
          generatedUrls.push(source)
        }

      } else if (doc.staticPath) {
        // Load the original static PDF unchanged.
        source =
          `/pdf/static/${encodeURIComponent(doc.staticPath)}`

      } else if (doc.template) {
        source =
          `/pdf/templates/${encodeURIComponent(doc.template)}`

      } else {
        throw new Error(
          `${doc.title ?? doc.id}: No PDF generator or template configured.`
        )
      }

      const pdf = await readPdf(
        source,
        doc.title ?? doc.id
      )

      const pageNumbers =
        pdf.getPageIndices()

      const pages = await combined.copyPages(
        pdf,
        pageNumbers
      )

      for (const page of pages) {
        combined.addPage(page)
      }
    }

    if (combined.getPageCount() === 0) {
      throw new Error(
        'No pages to generate.'
      )
    }

    const bytes = await combined.save({
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
  } finally {
    for (const url of generatedUrls) {
      URL.revokeObjectURL(url)
    }
  }
}
