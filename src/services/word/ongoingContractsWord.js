
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
  VerticalMergeType,
  WidthType,
} from 'docx'

import {
  formatBidDate,
} from '../../lib/bidFormData'

import {
  sectionMarker,
} from './wordHelpers'

// ============================================
// PAGE SETTINGS - A4 LANDSCAPE
// ============================================

const PT = (n) => Math.round(n * 20)

const FONT = 'Times New Roman'

// IMPORTANT FIX:
// The docx library automatically swaps width and
// height when PageOrientation.LANDSCAPE is used.
//
// Pass A4 PORTRAIT dimensions here.
// The generated section will be A4 LANDSCAPE.

const PAGE_WIDTH = PT(595.3)
const PAGE_HEIGHT = PT(841.9)

const TABLE_WIDTH = PT(726)

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
}

const RULE = {
  style: BorderStyle.SINGLE,
  color: '333333',
  size: 4,
}

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
}

const TABLE_BORDERS = {
  top: RULE,
  bottom: RULE,
  left: RULE,
  right: RULE,
  insideHorizontal: RULE,
  insideVertical: RULE,
}

// ============================================
// TEXT HELPERS
// ============================================

function value(v, fallback = '') {
  const result = String(v ?? '').trim()
  return result || fallback
}

function p(content = '', options = {}) {
  const {
    size = 10.5,
    bold = false,
    underline = false,
    alignment = AlignmentType.LEFT,
    linePt = size * 1.13,
    before = 0,
    after = 0,
    bookmark = false,
    leftIndent = 0,
  } = options

  const lines = String(content ?? '').split('\n')
  const children = []

  if (bookmark) {
    children.push(sectionMarker(6))
  }

  lines.forEach((line, index) => {
    children.push(
      new TextRun({
        text: line,
        font: FONT,
        size: Math.round(size * 2),
        bold,
        underline: underline ? {} : undefined,
        break: index ? 1 : 0,
      })
    )
  })

  return new Paragraph({
    alignment,
    indent: leftIndent
      ? { left: PT(leftIndent) }
      : undefined,
    spacing: {
      before: PT(before),
      after: PT(after),
      line: PT(linePt),
      lineRule: LineRuleType.EXACT,
    },
    children,
  })
}

function spacer(heightPt) {
  return new Paragraph({
    spacing: {
      before: 0,
      after: 0,
      line: PT(heightPt),
      lineRule: LineRuleType.EXACT,
    },
    children: [
      new TextRun({
        text: '',
        size: 2,
      }),
    ],
  })
}

// ============================================
// BORDERLESS DETAILS TABLES
// ============================================

function openCell(
  children,
  width,
  margins = {}
) {
  const {
    left = 0,
    right = 0,
    top = 0,
    bottom = 0,
  } = margins

  return new TableCell({
    width: {
      size: width,
      type: WidthType.DXA,
    },
    margins: {
      left: PT(left),
      right: PT(right),
      top: PT(top),
      bottom: PT(bottom),
    },
    borders: NO_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    children: Array.isArray(children)
      ? children
      : [children],
  })
}

function noBorderTable(
  rows,
  widths,
  indent = 0
) {
  return new Table({
    width: {
      size: widths.reduce(
        (sum, w) => sum + w,
        0
      ),
      type: WidthType.DXA,
    },
    columnWidths: widths,
    indent: {
      size: PT(indent),
      type: WidthType.DXA,
    },
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows,
  })
}

// ============================================
// PROJECT INFORMATION
// ============================================

function identityTable(setup) {
  const widths = [
    PT(232),
    PT(25),
    PT(469),
  ]

  const entries = [
    [
      'NAME OF THE PROCURING ENTITY',
      setup.procuringEntity,
      23,
    ],
    [
      'PROJECT TITLE',
      setup.projectTitle,
      31,
    ],
    [
      'REFERENCE NUMBER',
      setup.referenceNumber,
      23,
    ],
  ]

  const rows = entries.map(
    ([label, data, height], index) =>
      new TableRow({
        height: {
          value: PT(height),
          rule: HeightRule.ATLEAST,
        },
        children: [
          openCell(
            p(label, {
              size: 11,
              bookmark: index === 0,
            }),
            widths[0],
            { left: 6 }
          ),
          openCell(
            p(':', { size: 11 }),
            widths[1],
            { left: 6 }
          ),
          openCell(
            p(value(data), {
              size: 11,
              bold: true,
            }),
            widths[2],
            { left: 7 }
          ),
        ],
      })
  )

  return noBorderTable(rows, widths)
}

// ============================================
// BUSINESS INFORMATION
// ============================================

function businessTable(setup) {
  const widths = [
    PT(290),
    PT(27),
    PT(377),
  ]

  return noBorderTable(
    [
      new TableRow({
        height: {
          value: PT(24),
          rule: HeightRule.ATLEAST,
        },
        children: [
          openCell(
            p(
              'REGISTERED BUSINESS NAME OF BIDDER',
              { size: 10.5 }
            ),
            widths[0]
          ),
          openCell(
            p(':'),
            widths[1],
            { left: 7 }
          ),
          openCell(
            p(value(setup.bidderName), {
              size: 10.5,
              bold: true,
            }),
            widths[2],
            { left: 7 }
          ),
        ],
      }),

      new TableRow({
        height: {
          value: PT(24),
          rule: HeightRule.ATLEAST,
        },
        children: [
          openCell(
            p('BUSINESS ADDRESS'),
            widths[0]
          ),
          openCell(
            p(':'),
            widths[1],
            { left: 7 }
          ),
          openCell(
            p(
              value(
                setup.businessAddress ??
                setup.bidderAddress
              ),
              {
                size: 10.5,
                bold: true,
              }
            ),
            widths[2],
            { left: 7 }
          ),
        ],
      }),
    ],
    widths,
    32
  )
}

// ============================================
// CONTRACTS TABLE - 7 FIXED COLUMNS
// ============================================

const GRID = [
  103,
  104,
  104,
  103,
  103,
  104,
  105,
].map(PT)

function gridCell(
  content,
  start,
  end = start,
  options = {}
) {
  const {
    bold = false,
    centered = false,
    verticalMerge,
    fontSize = 10.3,
    padding = 2,
  } = options

  const cellWidth = GRID
    .slice(start, end + 1)
    .reduce((a, b) => a + b, 0)

  return new TableCell({
    width: {
      size: cellWidth,
      type: WidthType.DXA,
    },
    columnSpan: end - start + 1,
    verticalMerge,
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: PT(1),
      bottom: PT(1),
      left: PT(padding),
      right: PT(1),
    },
    borders: {
      top: RULE,
      bottom: RULE,
      left: RULE,
      right: RULE,
    },
    children: [
      p(content, {
        size: fontSize,
        bold,
        linePt: fontSize * 1.08,
        alignment: centered
          ? AlignmentType.CENTER
          : AlignmentType.LEFT,
      }),
    ],
  })
}

// ============================================
// GOVERNMENT AND PRIVATE ROWS
// ============================================

function ongoingRow(kind, row) {
  const get = (...names) => {
    for (const name of names) {
      if (
        row?.[name] !== undefined &&
        row?.[name] !== null &&
        String(row[name]).trim()
      ) {
        return String(row[name])
      }
    }

    return 'NONE'
  }

  return new TableRow({
    height: {
      value: PT(16),
      rule: HeightRule.ATLEAST,
    },
    cantSplit: true,
    children: [
      gridCell(kind, 0, 0, {
        bold: true,
      }),

      gridCell(
        get(
          'ownerDetails',
          'ownerName',
          'owner'
        ),
        1,
        1,
        {
          bold: true,
          centered: true,
        }
      ),

      gridCell(
        get(
          'natureOfWork',
          'nature'
        ),
        2,
        2,
        {
          bold: true,
          centered: true,
        }
      ),

      gridCell(
        get(
          'description',
          'roleDescription'
        ),
        3,
        3,
        {
          bold: true,
          centered: true,
        }
      ),

      gridCell(
        get(
          'percentage',
          'percent',
          'participation'
        ),
        4,
        4,
        {
          bold: true,
          centered: true,
        }
      ),

      gridCell(
        get(
          'amountOfAward',
          'amountAwarded',
          'amount'
        ),
        5,
        5,
        {
          bold: true,
          centered: true,
        }
      ),

      gridCell(
        get(
          'dateCompleted',
          'dateAwarded',
          'date'
        ),
        6,
        6,
        {
          bold: true,
          centered: true,
        }
      ),
    ],
  })
}

// ============================================
// COMPLETE ONGOING CONTRACTS TABLE
// ============================================

function contractsTable(ongoing) {
  const VSTART = VerticalMergeType.RESTART
  const VCONT = VerticalMergeType.CONTINUE

  const rows = [
    // First header row

    new TableRow({
      height: {
        value: PT(16),
        rule: HeightRule.ATLEAST,
      },
      children: [
        gridCell(
          'Name of Contract',
          0,
          0,
          { verticalMerge: VSTART }
        ),

        gridCell('', 1),

        gridCell(
          'Nature of Work',
          2,
          2,
          { verticalMerge: VSTART }
        ),

        gridCell(
          "Bidder's Role",
          3,
          4,
          { centered: true }
        ),

        gridCell('', 5),
        gridCell('', 6),
      ],
    }),

    // Second header row

    new TableRow({
      height: {
        value: PT(37),
        rule: HeightRule.ATLEAST,
      },
      children: [
        gridCell('', 0, 0, {
          verticalMerge: VCONT,
        }),

        gridCell(
          "a. Owner's Name",
          1
        ),

        gridCell('', 2, 2, {
          verticalMerge: VCONT,
        }),

        gridCell(
          'Description',
          3,
          3,
          {
            centered: true,
            verticalMerge: VSTART,
          }
        ),

        gridCell(
          '%',
          4,
          4,
          {
            centered: true,
            verticalMerge: VSTART,
          }
        ),

        gridCell(
          'a. Amount of\nAward',
          5
        ),

        gridCell(
          'a. Date Awarded',
          6
        ),
      ],
    }),

    // Third header row

    new TableRow({
      height: {
        value: PT(37),
        rule: HeightRule.ATLEAST,
      },
      children: [
        gridCell('', 0, 0, {
          verticalMerge: VCONT,
        }),

        gridCell(
          'b. Address\nTelephone',
          1
        ),

        gridCell('', 2, 2, {
          verticalMerge: VCONT,
        }),

        gridCell('', 3, 3, {
          verticalMerge: VCONT,
        }),

        gridCell('', 4, 4, {
          verticalMerge: VCONT,
        }),

        gridCell(
          'b. Completion\nDuration',
          5
        ),

        gridCell(
          'b. Contract\nEffectivity',
          6
        ),
      ],
    }),

    // Fourth header row

    new TableRow({
      height: {
        value: PT(17),
        rule: HeightRule.ATLEAST,
      },
      children: [
        gridCell('', 0, 0, {
          verticalMerge: VCONT,
        }),

        gridCell(
          'c. Number',
          1
        ),

        gridCell('', 2, 2, {
          verticalMerge: VCONT,
        }),

        gridCell('', 3, 3, {
          verticalMerge: VCONT,
        }),

        gridCell('', 4, 4, {
          verticalMerge: VCONT,
        }),

        gridCell('', 5),

        gridCell(
          'c. Date Completed',
          6
        ),
      ],
    }),

    ongoingRow(
      'GOVERNMENT',
      ongoing?.government ??
      ongoing?.gov
    ),

    ongoingRow(
      'PRIVATE',
      ongoing?.private
    ),
  ]

  return new Table({
    width: {
      size: TABLE_WIDTH,
      type: WidthType.DXA,
    },
    columnWidths: GRID,
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows,
  })
}

// ============================================
// SIGNATURE INFORMATION
// ============================================

function signatureTable(setup) {
  const widths = [
    PT(90),
    PT(28),
    PT(608),
  ]

  const name = value(
    setup.submittedBy ??
    setup.authorizedRepresentative
  )

  const entries = [
    [
      'Submitted by',
      [
        p(name, {
          size: 10.5,
          bold: true,
          underline: true,
        }),

        p(
          '(Printed Name & Signature)',
          {
            size: 8,
            linePt: 9,
          }
        ),
      ],
      38,
    ],

    [
      'Designation',
      [
        p(
          value(
            setup.designation ??
            setup.representativeDesignation
          ),
          { size: 10.5 }
        ),
      ],
      20,
    ],

    [
      'Name of Firm',
      [
        p(
          value(setup.bidderName),
          {
            size: 10.5,
            bold: true,
          }
        ),
      ],
      20,
    ],

    [
      'Date',
      [
        p(
          formatBidDate(setup.date) || '',
          { size: 10.5 }
        ),
      ],
      20,
    ],
  ]

  const rows = entries.map(
    ([label, content, height]) =>
      new TableRow({
        height: {
          value: PT(height),
          rule: HeightRule.ATLEAST,
        },
        children: [
          openCell(
            p(label, { size: 10.5 }),
            widths[0]
          ),

          openCell(
            p(':', { size: 10.5 }),
            widths[1]
          ),

          openCell(
            content,
            widths[2]
          ),
        ],
      })
  )

  return noBorderTable(rows, widths)
}

// ============================================
// MAIN WORD DOCUMENT GENERATOR
// DOCUMENT NUMBER 6
// ============================================

export function ongoingContractsWord(
  options = {}
) {
  const setup = options.setup ?? options

  const ongoing =
    options.ongoingContracts ??
    setup.ongoingContracts ??
    options.ongoing ??
    setup.ongoing ??
    {}

  const children = [
    // Project information
    identityTable(setup),

    spacer(9),

    // Document title
    p(
      'STATEMENT OF ALL ITS ONGOING GOVERNMENT & PRIVATE CONTRACTS INCLUDING CONTRACTS',
      {
        size: 13,
        bold: true,
        underline: true,
        linePt: 17,
        alignment: AlignmentType.CENTER,
        leftIndent: 44,
      }
    ),

    p(
      'AWARDED BUT NOT YET STARTED',
      {
        size: 13,
        bold: true,
        underline: true,
        linePt: 17,
        alignment: AlignmentType.CENTER,
        leftIndent: 44,
      }
    ),

    spacer(34),

    // Registered bidder information
    businessTable(setup),

    spacer(26),

    // Editable ongoing contracts table
    contractsTable(ongoing),

    spacer(31),

    // Signatures and date
    signatureTable(setup),
  ]

  // ==========================================
  // FINAL SECTION SETTINGS - A4 LANDSCAPE
  // ==========================================
  //
  // The docx library swaps width and height
  // automatically for LANDSCAPE orientation.
  //
  // Actual output:
  // A4 Landscape approximately 297 x 210 mm.
  //
  // Left margin:  36 pt
  // Right margin: 78 pt
  // Table width:  726 pt
  //
  // Available horizontal space:
  // 841.9 - 36 - 78 = 727.9 pt
  //
  // The 726 pt table fits inside the page.
  // ==========================================

  return [
    {
      properties: {
        type: SectionType.NEXT_PAGE,

        page: {
          size: {
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            orientation: PageOrientation.LANDSCAPE,
          },

          margin: {
            top: PT(30),
            bottom: PT(34),
            left: PT(36),
            right: PT(78),
          },
        },
      },

      children,
    },
  ]
}
