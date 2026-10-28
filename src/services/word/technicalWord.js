import {
  AlignmentType,
  BorderStyle,
  HeightRule,
  LineRuleType,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
} from 'docx'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { section, sectionMarker } from './wordHelpers'
import { complianceText } from './wordContent'
import { formatBidDate } from '../../lib/bidFormData'
import { quantityUnitLayout, quantityText, quantityColumnWidths } from '../../lib/quantityUnitLayout'

// Match the existing PDF's Times text, A4 margins, column widths, and page budget.
// All text and tables remain native editable Word content.
const pt = (value) => Math.round(value * 20)
const widths = [56, 244, 57, 54, 114]
const border = { style: BorderStyle.SINGLE, size: 5, color: '525252' }
const none = { style: BorderStyle.NONE, size: 0 }
const borders = (value) =>
  Object.fromEntries(
    [
      'top',
      'bottom',
      'left',
      'right',
      'insideHorizontal',
      'insideVertical',
    ].map((key) => [key, value]),
  )
const font = 'Times New Roman'
function run(text, size = 10, bold = false, options = {}) {
  return new TextRun({
    text: String(text ?? ''),
    font,
    size: Math.round(size * 2),
    bold,
    ...options,
  })
}
function para(
  text,
  {
    size = 10,
    bold = false,
    align = AlignmentType.LEFT,
    line = 12.4,
    before = 0,
    after = 0,
    children,
    ...options
  } = {},
) {
  return new Paragraph({
    alignment: align,
    style: 'TechnicalSpecifications',
    run: { font, size: Math.round(size * 2) },
    spacing: {
      before: pt(before),
      after: pt(after),
      line: pt(line),
      lineRule: LineRuleType.EXACT,
    },
    children:
      children ??
      String(text ?? '')
        .split('\n')
        .map((value, i) =>
          run(value, size, bold, { break: i ? 1 : undefined }),
        ),
    ...options,
  })
}
function cell(
  children,
  width,
  { bordered = true, center = false, rowSpan, left = 6, right = 5 } = {},
) {
  return new TableCell({
    width: { size: pt(width), type: 'dxa' },
    borders: borders(bordered ? border : none),
    margins: { top: 0, bottom: 0, left: pt(left), right: pt(right) },
    verticalAlign: center ? VerticalAlign.CENTER : VerticalAlign.TOP,
    rowSpan,
    children: Array.isArray(children) ? children : [children],
  })
}
function table(rows, columns = widths, bordered = true) {
  return new Table({
    width: { size: pt(columns.reduce((a, b) => a + b, 0)), type: 'dxa' },
    columnWidths: columns.map(pt),
    layout: TableLayoutType.FIXED,
    borders: borders(bordered ? border : none),
    rows,
  })
}
// Use PDF font metrics for wrapping without discarding editable Unicode text.
function measure(metric, value, size) {
  try {
    return metric.widthOfTextAtSize(value, size)
  } catch {
    return Array.from(value).reduce((total, char) => {
      try {
        return total + metric.widthOfTextAtSize(char, size)
      } catch {
        return total + metric.widthOfTextAtSize('?', size)
      }
    }, 0)
  }
}
function wrap(value, metric, size, width) {
  const result = []
  for (const line of String(value ?? '').split('\n')) {
    let current = ''
    for (const word of line.trim().split(/\s+/).filter(Boolean)) {
      if (
        measure(metric, current ? current + ' ' + word : word, size) <= width
      ) {
        current = current ? current + ' ' + word : word
        continue
      }
      if (current) result.push(current)
      let rest = word
      while (measure(metric, rest, size) > width) {
        let n = 1
        while (
          n < rest.length &&
          measure(metric, rest.slice(0, n + 1), size) <= width
        )
          n++
        result.push(rest.slice(0, n))
        rest = rest.slice(n)
      }
      current = rest
    }
    result.push(current)
  }
  return result.length ? result : ['']
}
function complianceLines(regular, bold) {
  const pattern =
    /(\bITB\b|\bGCC\b|Error!\s+Reference\s+source\s+not\s+found\.?)/gi
  const words = complianceText.split(pattern).flatMap((part) =>
    part
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => ({
        text: word,
        bold: /^(ITB|GCC|Error!\s+Reference\s+source\s+not\s+found)/i.test(
          part.trim(),
        ),
      })),
  )
  const lines = []
  let current = []
  let width = 0
  const space = regular.widthOfTextAtSize(' ', 9.65)
  for (const word of words) {
    const measured = (word.bold ? bold : regular).widthOfTextAtSize(
      word.text,
      9.65,
    )
    if (current.length && width + space + measured > 511) {
      lines.push(current)
      current = []
      width = 0
    }
    width += measured + (current.length ? space : 0)
    current.push(word)
  }
  if (current.length) lines.push(current)
  return lines
}
function tableHeader(columns = widths, layout = 'separate') {
  return new TableRow({
    height: { value: pt(44), rule: HeightRule.EXACT },
    children: [
      'Item\nNo.',
      'Specification/s',
      layout === 'merged' ? 'Qty / Unit' : 'Qty',
      'Unit',
      'Statement\nof\nCompliance',
    ].flatMap((text, i) => i === 3 && layout !== 'separate' ? [] : [
      cell(
        para(text, { bold: true, align: AlignmentType.CENTER, line: 11.5 }),
        columns[i],
        { center: true, left: 0, right: 0 },
      )],
    ),
  })
}
function segmentRows(segment, widths, layout) {
  return segment.fragments.map((fragment, i) => {
    const children = []
    if (!i)
      children.push(
        cell(
          para(segment.first ? segment.number : '', {
            align: AlignmentType.CENTER,
          }),
          widths[0],
          { center: true, rowSpan: segment.fragments.length },
        ),
      )
    const mark =
      fragment.first && fragment.marker && fragment.marker !== 'None'
        ? fragment.marker + ' '
        : ''
    children.push(
      cell(
        para(mark + fragment.lines.join('\n'), {
          bold: fragment.bold,
          before: 5,
          after: 5,
        }),
        widths[1],
        { left: fragment.first && fragment.marker ? 19 : 6 },
      ),
    )
    if (!i) {
      children.push(
        cell(
          para(segment.first ? quantityText(segment, layout) : '', {
            align: AlignmentType.CENTER,
          }),
          widths[2],
          { center: true, rowSpan: segment.fragments.length },
        ),
      )
      if (layout === 'separate') children.push(
        cell(
          para(segment.first ? segment.unit : '', {
            align: AlignmentType.CENTER,
          }),
          widths[3],
          { center: true, rowSpan: segment.fragments.length },
        ),
      )
    }
    children.push(
      cell(
        para(fragment.first ? fragment.compliance : '', {
          size: 9.8,
          bold: true,
          align: AlignmentType.CENTER,
          line: 12,
        }),
        widths[4],
        { center: true, left: 5, right: 5 },
      ),
    )
    return new TableRow({
      cantSplit: true,
      height: { value: pt(fragment.height), rule: HeightRule.EXACT },
      children,
    })
  })
}
function signature(setup) {
  const values = [
    setup.submittedBy || setup.authorizedRepresentative || '',
    setup.designation || setup.representativeDesignation || '',
    setup.bidderName || '',
    formatBidDate(setup.date),
  ]
  return table(
    ['Submitted by', 'Designation', 'Name of Firm', 'Date'].map(
      (label, i) =>
        new TableRow({
          height: { value: pt(i ? 20 : 46), rule: HeightRule.ATLEAST },
          children: [
            cell(para(label, { size: 11 }), 92, {
              bordered: false,
              left: 0,
              right: 0,
            }),
            cell(para(':', { size: 11 }), 33, {
              bordered: false,
              left: 0,
              right: 0,
            }),
            cell(
              [
                para(values[i], {
                  size: 11.3,
                  bold: true,
                  children: [
                    run(values[i], 11.3, true, {
                      underline: i === 0 ? {} : undefined,
                    }),
                  ],
                }),
                ...(i === 0
                  ? [
                      para('(Printed Name & Signature)', {
                        size: 9,
                        line: 12,
                        before: 5,
                        children: [
                          run('(Printed Name & Signature)', 9, false, {
                            italics: true,
                          }),
                        ],
                      }),
                    ]
                  : []),
              ],
              400,
              { bordered: false, left: 0, right: 0 },
            ),
          ],
        }),
    ),
    [92, 33, 400],
    false,
  )
}
export async function technicalWord({ setup = {}, technical = [], sectionNumber = 12 }) {
  const layout = quantityUnitLayout(setup.qtyUnitLayout)
  const columns = quantityColumnWidths(widths, 2, 3, layout)
  const metrics = await PDFDocument.create()
  const regular = await metrics.embedFont(StandardFonts.TimesRoman)
  const bold = await metrics.embedFont(StandardFonts.TimesRomanBold)
  const statement = complianceLines(regular, bold)
  const info = [
    [
      'NAME OF THE PROCURING ENTITY',
      setup.procuringEntity ||
        [setup.municipality, setup.province].filter(Boolean).join(', '),
    ],
    ['PROJECT TITLE', setup.projectTitle],
    ['REFERENCE NUMBER', setup.referenceNumber],
  ].map(([label, value]) => ({ label, lines: wrap(value, bold, 10, 283) }))
  const infoHeight = info.reduce(
    (n, row) => n + Math.max(18, row.lines.length * 12.5 + 4),
    0,
  )
  const boxHeight = 39 + statement.length * 14
  let cursor = 78 + infoHeight + 7 + boxHeight + 44
  const pages = [{ segments: [], first: true, includeTable: true }]
  let page = pages[0]
  const nextPage = (includeTable = true) => {
    page = { segments: [], first: false, includeTable }
    pages.push(page)
    cursor = 66 + (includeTable ? 44 : 0)
  }
  technical.forEach((item, index) => {
    const source =
      item.specificationLines ??
      item.lines ??
      item.specifications ??
      (typeof item.specification === 'string'
        ? item.specification.split('\n')
        : [])
    const rows = (source.length ? source : ['']).map((value) => {
      const row = typeof value === 'string' ? { text: value } : value || {}
      const original = String(row.text ?? row.specification ?? '')
      const leading = original.match(
        /^\s*([\u2022\u25cb\u25a0\u27a2\u2713])\s*/u,
      )
      const marker = row.marker ?? leading?.[1] ?? ''
      const text =
        row.marker == null && leading
          ? original.slice(leading[0].length)
          : original
      return {
        marker,
        bold: row.bold === true,
        compliance: row.compliance == null ? 'COMPLY' : String(row.compliance),
        lines: wrap(
          text,
          row.bold === true ? bold : regular,
          10,
          columns[1] - (marker ? 27 : 13),
        ),
      }
    })
    let rowIndex = 0
    let consumed = 0
    let first = true
    while (rowIndex < rows.length) {
      const fragments = []
      let available = 790 - cursor
      while (rowIndex < rows.length && available >= 25) {
        const row = rows[rowIndex]
        const rest = row.lines.slice(consumed)
        const complianceHeight =
          !consumed && row.compliance
            ? wrap(row.compliance, bold, 9.8, 104).length * 12 + 10
            : 0
        const fullHeight = Math.max(
          25,
          rest.length * 12.4 + 10,
          complianceHeight,
        )
        const fits = fullHeight <= available
        const count = fits
          ? rest.length
          : Math.min(rest.length, Math.floor((available - 10) / 12.4))
        const height = fits
          ? fullHeight
          : Math.max(25, count * 12.4 + 10, complianceHeight)
        if (count < 1 || height > available) break
        fragments.push({
          ...row,
          lines: rest.slice(0, count),
          first: consumed === 0,
          height,
        })
        available -= height
        if (fits || consumed + count === row.lines.length) {
          rowIndex++
          consumed = 0
        } else consumed += count
        if (!fits) break
      }
      if (!fragments.length) {
        nextPage()
        continue
      }
      page.segments.push({
        number: index + 1,
        qty: item.qty ?? '',
        unit: item.unit ?? '',
        first,
        fragments,
      })
      cursor += fragments.reduce((n, f) => n + f.height, 0)
      first = false
      if (rowIndex < rows.length) nextPage()
    }
  })
  if (cursor + 114 > 790) nextPage(false)
  page.signature = true
  return pages.map((page) => {
    const children = []
    if (page.first) {
      children.push(
        para('TECHNICAL SPECIFICATIONS', {
          size: 14,
          bold: true,
          align: AlignmentType.CENTER,
          line: 20,
          after: 22,
          children: [
            sectionMarker(sectionNumber),
            run('TECHNICAL SPECIFICATIONS', 14, true),
          ],
        }),
      )
      children.push(
        table(
          info.map(
            (row) =>
              new TableRow({
                height: {
                  value: pt(Math.max(18, row.lines.length * 12.5 + 4)),
                  rule: HeightRule.EXACT,
                },
                children: [
                  cell(para(row.label, { size: 9.2, line: 12.5 }), 204, {
                    bordered: false,
                    left: 0,
                    right: 0,
                  }),
                  cell(para(':', { size: 9.7, line: 12.5 }), 33, {
                    bordered: false,
                    left: 0,
                    right: 0,
                  }),
                  cell(
                    para(row.lines.join('\n'), { bold: true, line: 12.5 }),
                    288,
                    { bordered: false, left: 0, right: 0 },
                  ),
                ],
              }),
          ),
          [204, 33, 288],
          false,
        ),
      )
      children.push(para('', { size: 1, line: 7 }))
      const rich = statement.flatMap((line, i) =>
        line.map((word, j) =>
          // Keep a continuous paragraph: forced line breaks prevent browsers
          // from justifying the right edge of each preceding line.
          run((i || j ? ' ' : '') + word.text, 9.65, word.bold),
        ),
      )
      children.push(
        table(
          [
            new TableRow({
              height: { value: pt(26), rule: HeightRule.EXACT },
              children: [
                cell(
                  para('Statement of Compliance', {
                    size: 10.5,
                    bold: true,
                    before: 5,
                  }),
                  525,
                  { left: 7, right: 6 },
                ),
              ],
            }),
            new TableRow({
              height: { value: pt(boxHeight - 26), rule: HeightRule.EXACT },
              children: [
                cell(
                  para('', {
                    size: 9.65,
                    line: 14,
                    before: 5,
                    after: 8,
                    align: AlignmentType.JUSTIFIED,
                    children: rich,
                  }),
                  525,
                  { left: 7, right: 7 },
                ),
              ],
            }),
          ],
          [525],
        ),
      )
    }
    if (page.includeTable)
      children.push(
        table([tableHeader(columns, layout), ...page.segments.flatMap(segment => segmentRows(segment, columns, layout))], columns.filter(width => width > 0)),
      )
    if (page.signature)
      children.push(para('', { size: 1, line: 18 }), signature(setup))
    const result = section(children)
    result.properties.page.margin = {
      top: pt(page.first ? 36 : 66),
      bottom: pt(35),
      left: pt(35),
      right: pt(35.28),
    }
    return result
  })
}
