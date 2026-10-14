import { heading, paragraph, section, specificationLines, table, details } from './wordHelpers'
import { summaryRows, summaryTotal, peso } from '../../lib/summaryPrices'

export function summaryWord({
  setup,
  technical,
  priceValues,
}) {
  const rows = summaryRows(
    technical,
    priceValues
  )

  return [
    section([
      heading(
        'SUMMARY OF BID PRICES',
        21
      ),

      ...details(setup),

      table(
        [
          'Item No.',
          'Specification/s',
          'Qty',
          'Unit',
          'Amount',
        ],

        rows.map(
          (row, i) => [
            row.itemNo,

            specificationLines(
              technical[i]
            ),

            technical[i].qty,

            row.unit,

            row.amountCents == null
              ? ''
              : peso(row.amountCents),
          ]
        ),

        [8, 48, 10, 12, 22]
      ),

      paragraph(
        'TOTAL BID PRICE: ' +
        peso(summaryTotal(rows)),
        {
          run: { bold: true },
        }
      ),

      paragraph(
        'Name: ' +
        (setup.submittedBy ?? '')
      ),

      paragraph(
        'In the capacity of: ' +
        (setup.designation ?? '')
      ),

      paragraph(
        'Signature: ____________________'
      ),

      paragraph(
        'Duly authorized to sign the Bid ' +
        'for and behalf of: ' +
        (setup.bidderName ?? '')
      ),
    ]),
  ]
}
