
export function toCents(value) {
  const n = Number(
    String(value ?? '').replace(/,/g, '').trim()
  )

  return Number.isFinite(n) && n > 0
    ? Math.round(n * 100)
    : 0
}

export function peso(cents) {
  return `₱ ${new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((cents ?? 0) / 100)}`
}

export function summaryRows(
  items = [],
  priceValues = {}
) {
  return (Array.isArray(items) ? items : []).map(
    (item, index) => {
      const id = String(
        item?.id ?? `item-${index + 1}`
      )

      const stored =
        priceValues?.[id] ??
        priceValues?.[String(index + 1)] ??
        priceValues?.[index] ??
        {}

      const entry =
        typeof stored === 'object' &&
        stored !== null
          ? stored
          : { price: stored }

      const rawPrice =
        entry.price ??
        entry.totalPricePerUnit ??
        ''

      const hasPrice =
        String(rawPrice).trim() !== ''

      const priceCents = toCents(rawPrice)
      const deductionCents = toCents(
        entry.deduction
      )

      const unitCents = Math.max(
        0,
        priceCents - deductionCents
      )

      const quantity = Math.max(
        0,
        Number(
          String(item?.qty ?? '').replace(/,/g, '')
        ) || 0
      )

      const amountCents = hasPrice
        ? Math.round(unitCents * quantity)
        : null

      const specifications = (
        Array.isArray(item?.specificationLines)
          ? item.specificationLines
          : []
      )
        .map((line) => ({
          text: String(
            line?.text ?? ''
          ).trim(),
          marker:
            line?.marker === 'None'
              ? ''
              : String(line?.marker ?? ''),
          bold: line?.bold === true,
        }))
        .filter((line) => line.text)

      return {
        id,
        itemNo: String(
          item?.itemNo ?? index + 1
        ),
        quantity,
        unit: String(item?.unit ?? ''),
        specifications,
        amountCents,
        hasPrice,
      }
    }
  )
}

export function summaryTotal(rows) {
  return rows.reduce(
    (sum, row) =>
      sum + (row.amountCents ?? 0),
    0
  )
}
