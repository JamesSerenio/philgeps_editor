import { heading, paragraph, section, specificationLines, table, details, signatures } from './wordHelpers'
import { summaryRows, summaryTotal, toCents, peso } from '../../lib/summaryPrices'

export function priceScheduleWord({
  setup,
  technical,
  priceValues,
}) {
  const rows = summaryRows(
    technical,
    priceValues
  )

  const moneyRows = rows.map(
    (row, i) => {
      const item = technical[i]

      const stored =
        priceValues[
          item.id ?? ('item-' + (i + 1))
        ] ??
        priceValues[String(i + 1)] ??
        priceValues[i] ??
        {}

      const entry =
        stored !== null &&
        typeof stored === 'object'
          ? stored
          : { price: stored }

      const unit = Math.max(
        0,
        toCents(
          entry.price ??
          entry.totalPricePerUnit
        ) -
        toCents(entry.deduction)
      )

      const cost = Math.round(
        unit * 0.5
      )

      const transport = Math.round(
        unit * 0.2
      )

      const tax =
        unit - cost - transport

      const display = (amount) =>
        row.hasPrice
          ? peso(amount)
          : ''

      return [
        row.itemNo,

        specificationLines(item),

        item.countryOfOrigin ||
        item.country ||
        'PHL',

        item.qty,

        item.unit,

        display(cost),

        display(transport),

        display(tax),

        '',

        display(unit),

        row.hasPrice
          ? peso(row.amountCents)
          : '',
      ]
    }
  )

  return [
    section(
      [
        heading(
          'PRICE SCHEDULE FOR GOODS',
          20
        ),

        ...details(setup),

        paragraph(
          'Name of Bidder: ' +
          (setup.bidderName ?? '')
        ),

        table(
          [
            'Item No.',
            'Specification/s',
            'Country of Origin',
            'Qty',
            'Unit',
            'Unit Price/Item',
            'Transportation & Insurance and All Other Costs Incidental to',
            'Sales & Other Taxes Payable if Contract is Awarded per Item',
            'Cost of Incidental Services, if applicable, per Item',
            'Total Price per Unit (100%)',
            'Total Price Delivered Final Destination',
          ],

          moneyRows,

          [
            5, 22, 6, 5, 5, 9,
            10, 10, 8, 10, 10,
          ]
        ),

        paragraph(
          'GRAND TOTAL: ' +
          peso(summaryTotal(rows)),
          {
            run: { bold: true },
          }
        ),

        ...signatures(setup),
      ],

      true
    ),
  ]
}
