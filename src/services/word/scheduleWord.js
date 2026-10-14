import { heading, paragraph, section, specificationLines, table, details, signatures } from './wordHelpers'

export function scheduleWord({
  setup,
  schedule,
}) {
  return [
    section([
      heading(
        'SCHEDULE OF REQUIREMENTS / ' +
        'PRODUCTION DELIVERY SCHEDULE',
        13
      ),

      ...details(setup),

      paragraph(
        'The delivery schedule is expressed ' +
        'as weeks/month stipulated share ' +
        'after a delivery date which is ' +
        'the date of delivery to the project site.'
      ),

      table(
        [
          'Item No.',
          'Specification/s',
          'Qty',
          'Unit',
          'Delivery Period',
        ],

        schedule.map(
          (item, i) => [
            item.itemNo ?? i + 1,
            specificationLines(item),
            item.qty,
            item.unit,
            item.deliveryPeriod,
          ]
        ),

        [8, 45, 10, 12, 25]
      ),

      ...signatures(setup),
    ]),
  ]
}
