
import { groupTechnicalItems } from './technicalSpecs.js'
import { preciseCents, priceAmounts } from './pricePrecision.js'

export function toCents(value) {
  return preciseCents(value)
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
  return groupTechnicalItems(Array.isArray(items) ? items : []).map(
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

      const quantity = Math.max(
        0,
        Number(
          String(item?.qty ?? '').replace(/,/g, '')
        ) || 0
      )

      const amountCents = hasPrice
        ? priceAmounts(rawPrice, entry.deduction, quantity).totalCents
        : null

      const specifications = (
        Array.isArray(item?.specificationLines)
          ? item.specificationLines
          : []
      )
        .map((line) => ({
          sourceItemNumber: line.sourceItemNumber,
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
