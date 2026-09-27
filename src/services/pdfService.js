import { pdfTemplates } from '../lib/pdfTemplates'

// Preview-only sources. The reference PDF must never be a generation base.
const previewSources = {
  bidSecurity: pdfTemplates.bidSecurity,
  omnibus: pdfTemplates.initao,
  technical: pdfTemplates.reference,
  schedule: pdfTemplates.reference,
  manpower: pdfTemplates.reference,
  afterSales: pdfTemplates.reference,
  warranty: pdfTemplates.reference,
  bidForm: pdfTemplates.reference,
  priceSchedule: pdfTemplates.reference,
  summary: pdfTemplates.reference,
}

export function getDocumentPreview(documentId) {
  const src = previewSources[documentId] || null
  return { src, isReference: src === pdfTemplates.reference }
}
