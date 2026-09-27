function createScheduleLine() {
  return { id: crypto.randomUUID(), text: '' }
}

function createScheduleItem(itemNo) {
  return { id: crypto.randomUUID(), itemNo: String(itemNo), qty: '', unit: '', deliveryPeriod: '', specificationLines: [createScheduleLine()] }
}

export function createInitialScheduleItems() {
  return [createScheduleItem(1)]
}

export function addScheduleItem(items) {
  return [...items, createScheduleItem(items.length + 1)]
}

export function updateScheduleItem(items, itemId, changes) {
  return items.map((item) => item.id === itemId ? { ...item, ...changes } : item)
}

export function addScheduleLine(items, itemId) {
  return items.map((item) => item.id === itemId ? { ...item, specificationLines: [...item.specificationLines, createScheduleLine()] } : item)
}

export function updateScheduleLine(items, itemId, lineId, changes) {
  return items.map((item) => item.id === itemId ? { ...item, specificationLines: item.specificationLines.map((line) => line.id === lineId ? { ...line, ...changes } : line) } : item)
}

export function removeScheduleLine(items, itemId, lineId) {
  return items.map((item) => item.id === itemId && item.specificationLines.length > 1 ? { ...item, specificationLines: item.specificationLines.filter((line) => line.id !== lineId) } : item)
}

export function renumberScheduleItems(items) {
  return items.map((item, index) => ({ ...item, itemNo: String(index + 1) }))
}

export function removeScheduleItem(items, itemId) {
  return renumberScheduleItems(items.filter((item) => item.id !== itemId))
}

export function validateScheduleItems(items) {
  return items.flatMap((item, index) => {
    const errors = []
    if (!String(item.itemNo ?? '').trim()) errors.push('Item ' + (index + 1) + ': Item No. is required.')
    if (!Array.isArray(item.specificationLines) || item.specificationLines.length === 0) errors.push('Item ' + (index + 1) + ': At least one specification line is required.')
    return errors
  })
}
