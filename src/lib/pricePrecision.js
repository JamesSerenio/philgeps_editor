// A unit price may contain five decimal places; delivered amounts use cents.
export function formatPriceCents(cents, roundToTwoDecimals = false) {
  const amount = roundToTwoDecimals ? Math.round(Math.round(cents * 1000) / 1000) : cents
  return (amount / 100).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: roundToTwoDecimals ? 2 : 5,
  })
}

export function priceUnits(value) {
  const number = Number(String(value ?? '').replace(/,/g, ''))
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100000) : 0
}

export function preciseCents(value) {
  return priceUnits(value) / 1000
}

export function priceAmounts(price, deduction, quantity) {
  const adjusted = Math.max(0, priceUnits(price) - priceUnits(deduction))
  const cost = Math.round(adjusted * 0.5)
  const transport = Math.round(adjusted * 0.2)
  const qty = Math.max(0, Number(String(quantity ?? '').replace(/,/g, '')) || 0)
  return {
    adjustedCents: adjusted / 1000,
    costCents: cost / 1000,
    transportCents: transport / 1000,
    taxCents: (adjusted - cost - transport) / 1000,
    totalCents: Math.round(adjusted * qty / 1000),
  }
}
