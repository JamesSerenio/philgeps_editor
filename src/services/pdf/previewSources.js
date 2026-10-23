import { pdfTemplates } from '../../lib/pdfTemplates'
import { getTemplatePath } from '../../lib/bidderAssets'

const previewSources = {
  bidSecurity: 'Bid Security without table.pdf',
  omnibus: 'New_tab_and_pages_Initao_LGU_template.pdf',
}
export function getDocumentPreview(documentId, bidder) {
  const filename = previewSources[documentId]
  if (filename) {
    try { return { src: getTemplatePath(filename, bidder), isReference: false } }
    catch (error) { return { src: null, isReference: false, error: error.message } }
  }
  const referenceIds = ['technical', 'schedule', 'manpower', 'afterSales', 'warranty', 'bidForm', 'priceSchedule', 'summary']
  const src = referenceIds.includes(documentId) ? pdfTemplates.reference : null
  return { src, isReference: !!src }
}
