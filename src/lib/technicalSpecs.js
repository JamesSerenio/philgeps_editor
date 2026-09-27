export function createSpecificationLine() {
  return { id: crypto.randomUUID(), text: '', compliance: 'COMPLY' }
}

export function createTechnicalItem(itemNo) {
  return { id: crypto.randomUUID(), itemNo: String(itemNo), qty: '', unit: '', specificationLines: [createSpecificationLine()] }
}

export function validateTechnicalItems(items) {
  return items.flatMap((item, index) => {
    const errors = []
    if (!String(item.itemNo ?? '').trim()) errors.push('Item ' + (index + 1) + ': Item No. is required.')
    if (!Array.isArray(item.specificationLines) || item.specificationLines.length === 0) errors.push('Item ' + (index + 1) + ': At least one specification line is required.')
    return errors
  })
}
