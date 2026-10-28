// Accept a single copied money cell; never combine multiple spreadsheet cells
// or silently turn negative/invalid values into a different positive amount.
export function pastedAmount(value) {
  const text = String(value ?? '').trim()
    .replace(/^(?:PHP|₱|P)\s*/i, '')
    .replace(/\s*(?:PHP|₱)$/i, '')
    .trim()
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?$|^\.\d{1,2}$/.test(text)) return null
  return text.replace(/,/g, '')
}
