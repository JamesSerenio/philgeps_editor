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

export function mergeTechnicalItems(items, from, through) {
  if (!Number.isInteger(from) || !Number.isInteger(through) || from < 1 || through <= from || through > items.length) {
    throw new Error('Choose at least two consecutive items to merge.')
  }
  const selected = items.slice(from - 1, through)
  const first = selected[0]
  return items.map((item, index) => index >= from - 1 && index < through
    ? { ...item, mergeGroup: first.id, sharedCompliance: first.sharedCompliance ?? first.specificationLines?.[0]?.compliance ?? 'COMPLY' }
    : item)
}

// Group shared values for calculation/export while preserving the source items.
export function groupTechnicalItems(items = []) {
  const groups = []
  items.forEach((item, index) => {
    const previous = groups.at(-1)
    const number = String(index + 1)
    const lines = (item.specificationLines ?? []).map(line => ({ ...line, sourceItemNumber: number }))
    if (item.mergeGroup && previous?.mergeGroup === item.mergeGroup) {
      previous.specificationLines.push(...lines)
      previous.itemNumbers.push(number)
      previous.itemNo = previous.itemNumbers.join(', ')
      previous.mergedCompliance = true
    } else {
      groups.push({ ...item, itemNo: number, itemNumbers: [number], specificationLines: lines,
        mergedCompliance: Boolean(item.mergeGroup) || item.mergedCompliance === true,
        sharedCompliance: item.sharedCompliance ?? item.specificationLines?.[0]?.compliance ?? 'COMPLY' })
    }
  })
  return groups
}
