export const quantityUnitLayouts = [
  { value: 'separate', label: 'Separate Qty and Unit (unit optional)' },
  { value: 'quantity_only', label: 'Qty only (no Unit column)' },
  { value: 'merged', label: 'Merged Qty / Unit' },
]

export function quantityUnitLayout(value) {
  return quantityUnitLayouts.some(layout => layout.value === value) ? value : 'separate'
}

export function quantityText(item, layout) {
  const qty = String(item.qty ?? '').trim()
  const unit = String(item.unit ?? '').trim()
  return quantityUnitLayout(layout) === 'merged' ? [qty, unit].filter(Boolean).join(' ') : qty
}

// Keep existing column indices so pricing and compliance columns do not change.
// The zero-width unit slot is omitted when drawing borders and Word cells.
export function quantityColumnWidths(widths, qtyIndex, unitIndex, layout, descriptionIndex = 1) {
  const result = [...widths]
  const mode = quantityUnitLayout(layout)
  if (mode === 'merged') result[qtyIndex] += result[unitIndex]
  if (mode === 'quantity_only') result[descriptionIndex] += result[unitIndex]
  if (mode !== 'separate') result[unitIndex] = 0
  return result
}
