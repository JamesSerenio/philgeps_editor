export function incompleteDocumentText(name, number, total) {
  return [
    'DOCUMENT NOT YET AVAILABLE',
    'Section ' + number + ' of ' + total,
    String(name).replace(/\.pdf$/i, ''),
    'This document or its required information has not been provided yet.',
    'This page preserves its position in the bid package. Add the missing document or details and generate again.',
  ]
}
