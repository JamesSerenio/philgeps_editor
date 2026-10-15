import { buildBidFormData } from '../../lib/bidFormData'
import { generateBidFormPreview } from '../pdf/bidFormPdf'
import { templateWord } from './templateWord'

export async function bidFormWord(options = {}) {
  const { setup = {}, technical = [], priceValues = {} } = options
  const data = { ...setup, items: technical, priceValues }
  const bid = buildBidFormData(data)
  if (!bid.complete) {
    throw new Error(
      bid.rows.length
        ? 'Complete saved Price Schedule for items: ' +
            bid.missingPriceItems.join(', ')
        : 'Add Technical Specifications and saved Price Schedule prices first.',
    )
  }
  const required = [
    ['Reference Number', bid.referenceNumber],
    ['Procuring Entity', bid.procuringEntity],
    ['Project Title', bid.projectTitle],
    ['Bidder Name', bid.bidderName],
    ['Submitted By', bid.submittedBy],
    ['Date', bid.date],
  ]
  const missing = required.filter(([, value]) => !String(value ?? '').trim())
  if (missing.length)
    throw new Error(
      'Complete Document Setup: ' +
        missing.map(([label]) => label).join(', ') +
        '.',
    )
  const document = options.document ?? {
    name: 'BID_FORM_CLEAN_TEMPLATE.pdf',
    generate: () => generateBidFormPreview(data),
  }
  return templateWord({ ...options, document }, 18, {
    tables: false,
    paragraphStyle: 'BidForm',
    exactLineSpacing: true,
    positionedGaps: true,
    preserveBlankLines: true,
    rightAllowance: 20,
    preparePage(page) {
      // Only visible rules should become text underlines, never erased template rules.
      page.fragments.forEach((part) => {
        part.underline = page.lines.some(
          (rule) =>
            Math.abs(rule.y1 - rule.y2) < 0.1 &&
            rule.y1 >= part.y &&
            rule.y1 <= part.y + 3 &&
            rule.x1 <= part.x + 2 &&
            rule.x2 >= part.x + part.width - 2,
        )
      })
    },
  })
}
