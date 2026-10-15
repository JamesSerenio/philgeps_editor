import {
  AlignmentType,
  BorderStyle,
  HeightRule,
  LineRuleType,
  PageOrientation,
  Paragraph,
  SectionType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'

import { formatLongDate } from '../../lib/documentSetup'
import { sectionMarker } from './wordHelpers'

// ============================================
// NFCC - EDITABLE WORD DOCUMENT
// Layout based on the existing NFCC PDF
// A4 PORTRAIT
// ============================================

const PT = (value) => Math.round(value * 20)

const FONT = 'Arial'
const RED = 'FF0000'
const BLACK = '000000'

const PAGE_WIDTH = PT(595.3)
const PAGE_HEIGHT = PT(841.9)

const BORDER = {
  style: BorderStyle.SINGLE,
  size: 5,
  color: BLACK,
}

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
}

const NONE = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
}

const ALL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
  insideHorizontal: BORDER,
  insideVertical: BORDER,
}

// ============================================
// BASIC HELPERS
// ============================================

function text(value, fallback = '') {
  const output = String(value ?? '').trim()
  return output || fallback
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return value
    }
  }

  return undefined
}

function numeric(value, fallback = 0) {
  if (value === undefined || value === null || value === '') {
    return fallback
  }

  const result = Number(String(value).replace(/[₱,\s]/g, ''))

  return Number.isFinite(result) ? result : fallback
}

function peso(value) {
  return numeric(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function run(content, options = {}) {
  return new TextRun({
    text: String(content ?? ''),
    font: options.font ?? FONT,
    size: Math.round((options.size ?? 9.5) * 2),
    // PDF uses Arial/Helvetica at these sizes; Word stores half-point sizes.
    color: options.color ?? BLACK,
    bold: options.bold ?? false,
    italics: options.italic ?? false,
    underline: options.underline ? {} : undefined,
    break: options.break ?? 0,
  })
}

function paragraph(content = '', options = {}) {
  const {
    size = 9.5,
    bold = false,
    italic = false,
    color = BLACK,
    align = AlignmentType.LEFT,
    before = 0,
    after = 0,
    line = 12,
    indent = 0,
    keepNext = false,
    border,
    bookmark = false,
    firstLine = 0,
    hanging = 0,
    underline = false,
    font = FONT,
  } = options

  const children = []

  if (bookmark) {
    children.push(sectionMarker(typeof bookmark === 'number' ? bookmark : 11))
  }

  String(content ?? '')
    .split('\n')
    .forEach((part, index) => {
      children.push(
        run(part, {
          size,
          bold,
          italic,
          color,
          break: index ? 1 : 0,
          underline,
          font,
        }),
      )
    })

  return new Paragraph({
    alignment: align,
    keepNext,
    border,
    indent:
      indent || firstLine || hanging
        ? {
            left: PT(indent),
            firstLine: firstLine ? PT(firstLine) : undefined,
            hanging: hanging ? PT(hanging) : undefined,
          }
        : undefined,
    spacing: {
      before: PT(before),
      after: PT(after),
      line: PT(line),
      lineRule: LineRuleType.EXACT,
    },
    children,
  })
}

function blank(height = 9) {
  return paragraph('', {
    size: 2,
    line: height,
    after: 0,
  })
}

function cell(content, width, options = {}) {
  const children = Array.isArray(content) ? content : [content]

  return new TableCell({
    width: {
      size: width,
      type: WidthType.DXA,
    },

    verticalAlign: VerticalAlign.CENTER,

    borders: options.borders ?? NONE,

    margins: {
      top: PT(options.top ?? 1),
      bottom: PT(options.bottom ?? 1),
      left: PT(options.left ?? 2),
      right: PT(options.right ?? 2),
    },

    children,
  })
}

// ============================================
// PROJECT INFORMATION
// ============================================

function informationTable(setup) {
  const widths = [PT(174), PT(17), PT(345)]

  const entries = [
    ['NAME OF THE PROCURING ENTITY', setup.procuringEntity],
    ['PROJECT TITLE', setup.projectTitle],
    ['REFERENCE NUMBER', setup.referenceNumber],
    ['CONTRACTOR', setup.bidderName],
    [
      'ADDRESS',
      firstValue(
        setup.businessAddress,
        setup.bidderAddress,
        setup.companyAddress,
      ),
    ],
  ]

  const rows = entries.map(([label, value], index) => {
    return new TableRow({
      height: {
        value: PT(index === 1 ? 26 : 19),
        rule: HeightRule.ATLEAST,
      },

      children: [
        cell(paragraph('', { size: 1, line: 1 }), PT(9), { left: 0, right: 0 }),
        cell(
          paragraph(label, {
            size: 9.4,
            line: 11,
          }),
          widths[0],
        ),

        cell(
          paragraph(':', {
            size: 9,
          }),
          widths[1],
        ),

        cell(
          paragraph(text(value).toUpperCase(), {
            size:
              label === 'PROJECT TITLE' || label === 'ADDRESS' ? 9.5 : 10.2,
            bold: true,
            color: RED,
            line: 11,
          }),
          widths[2],
        ),
      ],
    })
  })

  return new Table({
    width: {
      size: PT(9) + widths.reduce((a, b) => a + b, 0),
      type: WidthType.DXA,
    },

    columnWidths: [PT(9), ...widths],
    layout: TableLayoutType.FIXED,
    borders: NONE,
    rows,
  })
}

// ============================================
// FINANCIAL VALUES
// ============================================

function financialData(options, setup) {
  const values = {
    ...(setup.nfcc ?? {}),
    ...(setup.financials ?? {}),
    ...(options.financials ?? {}),
    ...(options.nfcc ?? {}),
    ...(options.nfccValues ?? {}),
  }

  // Existing PDF sample values for reference
  // number 13261581 only.
  // For other projects, values must come from
  // the provided NFCC/financial data.
  const sample = String(setup.referenceNumber ?? '') === '13261581'

  const defaultAssets = sample ? 2441561 : 0
  const defaultLiabilities = sample ? 566693 : 0

  const currentAssets = numeric(
    firstValue(
      values.currentAssets,
      values.current_assets,
      values.assets,
      options.currentAssets,
      setup.currentAssets,
    ),
    defaultAssets,
  )

  const currentLiabilities = numeric(
    firstValue(
      values.currentLiabilities,
      values.current_liabilities,
      values.liabilities,
      options.currentLiabilities,
      setup.currentLiabilities,
    ),
    defaultLiabilities,
  )

  const netWorkingCapital = numeric(
    firstValue(
      values.netWorkingCapital,
      values.net_working_capital,
      options.netWorkingCapital,
    ),
    currentAssets - currentLiabilities,
  )

  const multiplier = numeric(
    firstValue(values.multiplier, values.k, values.K, options.multiplier),
    15,
  )

  const outstanding = numeric(
    firstValue(
      values.outstandingContracts,
      values.outstanding,
      values.outstandingWorks,
      values.outstanding_contracts,
      options.outstandingContracts,
    ),
    0,
  )

  return {
    currentAssets,
    currentLiabilities,
    netWorkingCapital,
    multiplier,
    multipliedAmount: netWorkingCapital * multiplier,
    outstanding,
    computedNfcc: netWorkingCapital * multiplier - outstanding,
  }
}

// ============================================
// NFCC FINANCIAL TABLE
// ============================================

function amountTable(data) {
  const widths = [PT(246), PT(221)]

  function amountRow(label, amount, options = {}) {
    const labelParagraph = paragraph(label, {
      size: 10,
      bold: options.bold ?? false,
      italic: options.italic ?? false,
      line: options.small ? 12.4 : 11.5,
    })

    const amountParagraph = paragraph(peso(amount), {
      size: options.numberSize ?? 16,
      line: 16.5,
      align: AlignmentType.RIGHT,
    })

    return new TableRow({
      cantSplit: true,

      height: {
        value: PT(options.height ?? 17),
        rule: HeightRule.ATLEAST,
      },

      children: [
        cell(labelParagraph, widths[0], {
          borders: ALL_BORDERS,
          left: 4,
          top: 1,
          bottom: 1,
        }),

        cell(amountParagraph, widths[1], {
          borders: ALL_BORDERS,
          right: 6,
          top: 1,
          bottom: 1,
        }),
      ],
    })
  }

  const header = new TableRow({
    cantSplit: true,

    height: {
      value: PT(13),
      rule: HeightRule.ATLEAST,
    },

    children: [
      cell(
        paragraph('Net Financial Contracting Capacity', {
          size: 10,
          bold: true,
          line: 11,
        }),
        widths[0],
        { borders: ALL_BORDERS, left: 4 },
      ),

      cell(
        paragraph('Amount', {
          size: 10,
          bold: true,
          line: 11,
          align: AlignmentType.CENTER,
        }),
        widths[1],
        { borders: ALL_BORDERS },
      ),
    ],
  })

  const rows = [
    header,

    amountRow('Current Assets', data.currentAssets, { bold: true }),

    amountRow('Current Liabilities', data.currentLiabilities, { bold: true }),

    amountRow('Net Working Capital (6)', data.netWorkingCapital, {
      bold: true,
    }),

    amountRow(`Multiply by ${data.multiplier}`, data.multipliedAmount, {
      bold: true,
    }),

    amountRow(
      'Less: Value of all outstanding and uncompleted\n' +
        'portions of sub-projects under on-going contracts\n' +
        'including awarded contracts to be started\n' +
        'coinciding with contract to be bid',
      data.outstanding,
      {
        small: true,
        bold: true,
        italic: true,
        height: 52,
      },
    ),
  ]

  return new Table({
    alignment: AlignmentType.CENTER,

    width: {
      size: widths.reduce((a, b) => a + b, 0),
      type: WidthType.DXA,
    },

    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    borders: ALL_BORDERS,
    rows,
  })
}

// ============================================
// SIGNATURE INFORMATION
// ============================================

function signatureTable(setup) {
  const widths = [PT(96), PT(27), PT(400)]

  const signatory = text(
    firstValue(setup.submittedBy, setup.authorizedRepresentative),
  )

  const entries = [
    [
      'Submitted',
      [
        paragraph(signatory.toUpperCase(), {
          underline: true,
          size: 10.3,
          bold: true,
          line: 12,
        }),

        paragraph('(Printed Name & Signature)', {
          size: 6.3,
          line: 9,
          indent: 0,
        }),
      ],
      35,
    ],

    [
      'Designation',
      [
        paragraph(
          firstValue(setup.designation, setup.representativeDesignation) ?? '',
          {
            size: 10.3,
            italic: true,
            line: 12,
          },
        ),
      ],
      23,
    ],

    [
      'Name of Firm',
      [
        paragraph(text(setup.bidderName), {
          size: 10.3,
          bold: true,
          line: 12,
        }),
      ],
      23,
    ],

    [
      'Date',
      [
        paragraph(formatLongDate(setup.date) || '', {
          size: 10.3,
          line: 12,
        }),
      ],
      23,
    ],
  ]

  const rows = entries.map(
    ([label, contents, height]) =>
      new TableRow({
        height: {
          value: PT(height),
          rule: HeightRule.ATLEAST,
        },

        children: [
          cell(paragraph('', { size: 1, line: 1 }), PT(14), {
            left: 0,
            right: 0,
          }),
          cell(
            paragraph(label, {
              size: 10,
              line: 12,
            }),
            widths[0],
            { left: 0, right: 0 },
          ),

          cell(
            paragraph(':', {
              size: 10,
              line: 12,
            }),
            widths[1],
            { left: 0, right: 0 },
          ),

          cell(contents, widths[2], { left: 0, right: 0 }),
        ],
      }),
  )

  return new Table({
    width: {
      size: PT(14) + widths.reduce((a, b) => a + b, 0),
      type: WidthType.DXA,
    },

    columnWidths: [PT(14), ...widths],
    layout: TableLayoutType.FIXED,
    borders: NONE,
    rows,
  })
}

// ============================================
// MAIN NFCC WORD DOCUMENT GENERATOR
// ============================================

export function nfccWord(options = {}) {
  const setup = options.setup ?? options
  const finance = financialData(options, setup)

  const children = [
    // ========================================
    // DOCUMENT TITLE
    // ========================================

    paragraph('NET FINANCIAL CONTRACTING CAPACITY (NFCC)', {
      size: 12,
      bold: true,
      align: AlignmentType.CENTER,
      line: 16,
      after: 12,
      bookmark: options.sectionNumber ?? 11,

      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          color: BLACK,
          size: 7,
          space: 3,
        },
      },
    }),

    // ========================================
    // PROJECT DETAILS
    // ========================================

    informationTable(setup),

    blank(5),

    // ========================================
    // CERTIFICATION STATEMENT
    // ========================================

    paragraph(
      'The undersigned duly authorized representative ' +
        'of the Bidder, for and in behalf of the Bidder ' +
        'hereby submits this computation of Net Financial ' +
        'Contracting Capacity (NFCC) in relation with our ' +
        'bid proposal for the subject to be bid. That ' +
        'personally, and in behalf of the Bidder, I ' +
        'certify that the following computation of the ' +
        'NFCC is complete, true and correct.',
      {
        size: 12,
        line: 13.8,
        firstLine: 36,
        after: 13,
      },
    ),

    // ========================================
    // LETTER A
    // ========================================

    paragraph(
      'A. Summary of Bidder’s Assets and Liabilities ' +
        'based on the attached audited Financial ' +
        'Statements, stamped “RECEIVED” by the Bureau ' +
        'of Internal Revenue or the BIR authorized ' +
        'collecting agent, for the preceding calendar year.',
      {
        size: 12,
        line: 13.8,
        indent: 32,
        hanging: 18,
        after: 13,
      },
    ),

    // ========================================
    // NFCC FORMULA
    // ========================================

    paragraph(
      'The Net Financial Contracting Capacity ' +
        '(NFCC) is computed as follows:',
      {
        size: 14,
        bold: true,
        italic: true,
        line: 16,
        indent: 36,
        after: 0,
      },
    ),

    paragraph(
      'NFCC = K(current asset – current liabilities) ' +
        'minus value of all outstanding works under ' +
        'ongoing contracts including awarded contracts ' +
        'yet to be started.',
      {
        size: 12,
        line: 13.8,
        indent: 36,
        after: 3,
      },
    ),

    paragraph(
      'Where K = 10 for a contract duration of ' + 'one (1) year or less',
      {
        size: 12,
        line: 13.8,
        indent: 36,
      },
    ),

    paragraph('15 for more than one (1) year up to ' + 'two (2) years', {
      size: 12,
      line: 13.8,
      indent: 92,
    }),

    paragraph('20 for more than two (2) years', {
      size: 12,
      line: 13.8,
      indent: 92,
      after: 17,
    }),

    // ========================================
    // FINANCIAL TABLE
    // ========================================

    amountTable(finance),

    blank(14),

    // ========================================
    // SIGNATURES
    // ========================================

    signatureTable(setup),
  ]

  // ========================================
  // A4 PORTRAIT SECTION SETTINGS
  // ========================================

  return [
    {
      properties: {
        type: SectionType.NEXT_PAGE,

        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            orientation: PageOrientation.PORTRAIT,
          },

          margin: {
            top: PT(37),
            bottom: PT(36),
            left: PT(18),
            right: PT(18),
          },
        },
      },

      children,
    },
  ]
}
