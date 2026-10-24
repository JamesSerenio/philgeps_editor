
import {
  Document,
  Packer,
} from 'docx'
import { incompleteDocumentText } from '../../lib/incompleteDocument'
import { documentBidderName } from '../../lib/bidderCompanies'
import { heading, paragraph, section } from './wordHelpers'

import {
  getBidPackageDocuments,
} from '../pdf/fullBidPackagePdf'

import {
  editableDocuments,
} from './editableDocuments'

import {
  pdfPageImages,
} from './pdfPageImages'

// ==========================================
// GENERATE FULL WORD PACKAGE
// ==========================================

export async function generateFullBidPackageWord(
  options = {}
) {
  options = { ...options, setup: { ...options.setup, bidderName: documentBidderName(options.setup) } }
  const {
    onProgress = () => {},
  } = options

  const documents =
    getBidPackageDocuments(options)

  const sections = []
  const manifest = []

  const total = documents.length

  // ========================================
  // PROCESS ALL DOCUMENTS IN ORDER
  // ========================================

  for (
    let index = 0;
    index < total;
    index += 1
  ) {
    const entry = documents[index]
    const number = index + 1

    let source

    try {
      entry.validate?.()
      onProgress({
        completed: index,
        total,
        message:
          'Preparing ' + entry.name,
      })

      const editable =
        editableDocuments[entry.wordSection ?? number]

      // ====================================
      // EDITABLE WORD OR ORIGINAL PDF IMAGE
      // ====================================

      const parts = editable
        ? await editable({ ...options, document: entry, sectionNumber: number, documentCount: total })
        : await (async () => {
            if (!entry.path?.startsWith('/pdf/static/') && !entry.path?.startsWith('data:application/pdf;base64,')) {
              throw new Error('Editable Word generator is required for this template; image fallback is prohibited.')
            }
            source = entry.path

            return pdfPageImages(
              source,
              entry.name,
              number,
              (page, count) => {
                onProgress({
                  completed: index,
                  total,
                  message:
                    entry.name +
                    ' - page ' +
                    page +
                    ' of ' +
                    count,
                })
              }
            )
          })()

      // ====================================
      // ADD WORD SECTIONS
      // ====================================

      sections.push(...parts)

      manifest.push({
        number,
        name: entry.name,
        editable: !!editable,

        imagePages: editable
          ? 0
          : parts.length,
      })

      onProgress({
        completed: number,
        total,
        message: entry.name,
      })
    } catch (error) {
      console.warn('Unavailable bid section:', entry.name, error)
      const [title, ...lines] = incompleteDocumentText(entry.name, number, total)
      sections.push(section([heading(title, number), ...lines.map(line => paragraph(line))]))
      manifest.push({ number, name: entry.name, editable: true, imagePages: 0, missing: true })
      onProgress({ completed: number, total, message: entry.name + ' - placeholder added' })
    } finally {
      if (
        typeof source === 'string' &&
        source.startsWith('blob:')
      ) {
        URL.revokeObjectURL(source)
      }
    }
  }

  // ========================================
  // PACKAGE MICROSOFT WORD
  // ========================================

  onProgress({
    completed: total,
    total,
    message:
      'Packaging Microsoft Word document...',
  })

  const wordDocument = new Document({
    hyphenation: { autoHyphenation: false },
    creator:
      'PhilGEPS Bid Docs Editor',

    title:
      options.setup?.projectTitle ||
      'Bid Documents',

    description:
      'Bid sections in original order; ' +
      'all 15 template sections use native ' +
      'editable Word text and tables; seven static certificate sections retain page images.',

    styles: {
      paragraphStyles: [{
        id: 'Tabbing',
        name: 'Tabbing Cover',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 20 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'TabbingLogo',
        name: 'Tabbing Logo',
        basedOn: 'Normal',
        paragraph: { spacing: { before: 0, after: 0 } },
      }, {
        id: 'InitaoDivider',
        name: 'Initao Component Divider',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 20 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'SummaryPrices',
        name: 'Summary of Bid Prices',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 19 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'PriceSchedule',
        name: 'Price Schedule for Goods',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 15 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'SecretarysCertificate',
        name: 'Secretary Certificate',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 21 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'BidForm',
        name: 'Bid Form',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 23 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'Warranty',
        name: 'Product Warranty Certificate',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 20 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'WarrantyBody',
        name: 'Product Warranty Body',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 26 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'WarrantyLogo',
        name: 'Product Warranty Logo',
        basedOn: 'Normal',
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'AfterSalesBody',
        name: 'After-Sales Body',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 26 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'AfterSales',
        name: 'After-Sales Service Certificate',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 26 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'AfterSalesLogo',
        name: 'After-Sales Logo',
        basedOn: 'Normal',
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'Manpower',
        name: 'List of Manpower',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 20 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'ManpowerLogo',
        name: 'Manpower Logo',
        basedOn: 'Normal',
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'ScheduleRequirements',
        name: 'Schedule of Requirements',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 19 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'BidSecurity',
        name: 'Bid Securing Declaration',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 20 },
        paragraph: { spacing: { after: 0 } },
      }, {
        id: 'TechnicalSpecifications',
        name: 'Technical Specifications',
        basedOn: 'Normal',
        run: { font: 'Times New Roman', size: 20 },
        paragraph: { spacing: { after: 0 } },
      }],
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 22,
          },
        },
      },
    },

    sections,
  })

  // ========================================
  // CREATE DOCX BLOB
  // ========================================

  const blob = await Packer.toBlob(
    wordDocument
  )

  return {
    blob,
    manifest,
  }
}
