import { heading, paragraph, section, specificationLines, table, details, signatures } from './wordHelpers'
import { complianceText } from './wordContent'

export function technicalWord({
  setup,
  technical,
}) {
  return [
    section([
      heading(
        'TECHNICAL SPECIFICATIONS',
        11
      ),

      ...details(setup),

      paragraph(
        'Statement of Compliance',
        {
          run: { bold: true },
        }
      ),

      paragraph(
        complianceText,
        {
          run: { size: 19 },
        }
      ),

      table(
        [
          'Item No.',
          'Specification/s',
          'Qty',
          'Unit',
          'Statement of Compliance',
        ],

        technical.map(
          (item, i) => [
            i + 1,

            specificationLines(item),

            item.qty,

            item.unit,

            (
              item.specificationLines ?? []
            ).map(
              (line) =>
                paragraph(
                  line.compliance ?? 'COMPLY',
                  {
                    run: { size: 20 },
                  }
                )
            ),
          ]
        ),

        [8, 45, 10, 12, 25]
      ),

      ...signatures(setup),
    ]),
  ]
}
