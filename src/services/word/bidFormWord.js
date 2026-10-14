
import {
  AlignmentType,
  Paragraph,
  SectionType,
  TextRun,
} from 'docx'

import {
  buildBidFormData,
} from '../../lib/bidFormData'

import {
  sectionMarker,
} from './wordHelpers'

// ==========================================
// WORD SETTINGS
// ==========================================

const FONT = 'Times New Roman'
const BODY_SIZE = 21 // 10.5 pt

// ==========================================
// SAFE TEXT
// ==========================================

function clean(value) {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0)

      return (
        code >= 32 ||
        character === '\n' ||
        character === '\t'
      )
    })
    .join('')
}

function field(value) {
  return clean(value).trim()
}

// ==========================================
// EDITABLE TEXT
// ==========================================

function text(value, options = {}) {
  return new TextRun({
    text: clean(value),
    font: FONT,
    size: BODY_SIZE,
    ...options,
  })
}

// ==========================================
// PARAGRAPH
// ==========================================

function para(runs, options = {}) {
  const {
    after = 115,
    before = 0,
    line = 252,
    indent,
    alignment = AlignmentType.LEFT,
    ...rest
  } = options

  return new Paragraph({
    children: Array.isArray(runs)
      ? runs
      : [text(runs)],

    alignment,

    spacing: {
      before,
      after,
      line,
    },

    ...(indent ? { indent } : {}),

    ...rest,
  })
}

// ==========================================
// LETTERED PARAGRAPH
// ==========================================

function listItem(letter, children) {
  return para(
    [
      text(`${letter})  `),
      ...children,
    ],
    {
      indent: {
        left: 520,
        hanging: 260,
      },
      after: 130,
    }
  )
}

// ==========================================
// EDITABLE BID FORM
// ==========================================

export function bidFormWord({
  setup = {},
  technical = [],
  priceValues = {},
} = {}) {
  // LOAD CURRENT DATA

  const bid = buildBidFormData({
    ...setup,
    items: technical,
    priceValues,
  })

  // VALIDATE PRICE SCHEDULE

  if (!bid.complete) {
    throw new Error(
      bid.rows.length
        ? 'Complete saved Price Schedule for items: ' +
          bid.missingPriceItems.join(', ')
        : 'Add Technical Specifications and saved Price Schedule prices first.'
    )
  }

  // VALIDATE DOCUMENT SETUP

  const required = [
    ['Reference Number', bid.referenceNumber],
    ['Procuring Entity', bid.procuringEntity],
    ['Project Title', bid.projectTitle],
    ['Bidder Name', bid.bidderName],
    ['Submitted By', bid.submittedBy],
    ['Date', bid.date],
  ]

  const missing = required.filter(
    ([, value]) => !field(value)
  )

  if (missing.length) {
    throw new Error(
      'Complete Document Setup: ' +
      missing.map(([label]) => label).join(', ') +
      '.'
    )
  }

  // DYNAMIC VALUES

  const project = field(bid.projectTitle)

  const amount =
    `${field(bid.amountWords)} ` +
    `(${field(bid.amountFormatted)})`

  const representative = field(
    bid.submittedBy
  )

  const firm = field(
    bid.bidderName
  )

  const designation =
    field(bid.designation) ||
    'Authorized Representative'

  // ========================================
  // PAGE 1
  // ========================================

  const paragraphs = [
    para(
      [
        sectionMarker(18),

        text('BID FORM', {
          size: 26,
          bold: true,
        }),
      ],
      {
        alignment: AlignmentType.CENTER,
        before: 450,
        after: 340,
        keepWithNext: true,
      }
    ),

    // PROJECT IDENTIFICATION NUMBER

    para(
      [
        text(
          'Project Identification No.: ',
          {
            italics: true,
          }
        ),

        text(
          bid.referenceNumber,
          {
            bold: true,
            italics: true,
          }
        ),
      ],
      {
        alignment: AlignmentType.CENTER,
        after: 350,
      }
    ),

    // PROCURING ENTITY

    para(
      [
        text('To: ', {
          bold: true,
          italics: true,
        }),

        text(bid.procuringEntity, {
          bold: true,
          italics: true,
        }),
      ],
      {
        after: 200,
      }
    ),

    // OPENING PARAGRAPH

    para(
      'Having examined the Philippine Bidding ' +
      'Documents (PBD) including the Supplemental ' +
      'Bid Bulletin Numbers __________, the ' +
      'receipt of which is hereby duly ' +
      'acknowledged, we, the undersigned, ' +
      'declare that:',
      {
        after: 170,
      }
    ),

    // ITEM A

    listItem('a', [
      text(
        'I/We have no reservation to the PBD, ' +
        'including the Supplemental Bid Bulletins, ' +
        'for the '
      ),

      text(project, {
        bold: true,
        italics: true,
      }),

      text(';'),
    ]),

    // ITEM B

    listItem('b', [
      text(
        'I/We offer to execute the Works ' +
        'for this Contract in accordance ' +
        'with the PBD;'
      ),
    ]),

    // ITEM C - AUTO PRICE

    listItem('c', [
      text(
        'The total price of our Bid in words ' +
        'and figures, excluding any discount ' +
        'offered below, is '
      ),

      text(amount, {
        bold: true,
        italics: true,
      }),

      text(';'),
    ]),

    // ITEM D

    listItem('d', [
      text(
        'The discounts offered and the ' +
        'methodology for their application, ' +
        'if any, are: '
      ),

      text('None', {
        italics: true,
      }),
    ]),

    // ITEM E

    listItem('e', [
      text(
        'The total bid price in words and ' +
        'figures, after applying the applicable ' +
        'discount, includes the cost of all ' +
        'taxes, such as, but not limited to ' +
        'value added tax (VAT), which are ' +
        'itemized in the Detailed Estimates;'
      ),
    ]),

    // ITEM F

    listItem('f', [
      text(
        'This Bid shall remain valid within ' +
        'a period stated in the PBD, and it ' +
        'shall be binding upon me/us at any ' +
        'time before the expiration of ' +
        'that period;'
      ),
    ]),

    // ITEM G

    listItem('g', [
      text(
        'If our bid is accepted, I/we commit ' +
        'to enter into a contract and provide ' +
        'a performance security in the form, ' +
        'amounts, and within the times ' +
        'prescribed in the PBD, and hereby ' +
        'acknowledge the consequences under ' +
        'the IRR of RA No. 12009 on forfeiture ' +
        'of Bid Security or enforcement of ' +
        'Bid Securing Declaration and ' +
        'on Blacklisting.'
      ),
    ]),

    // REMAINING PARAGRAPHS

    para(
      'Until a formal Contract is prepared ' +
      'and executed, this Bid, together with ' +
      'your written acceptance thereof and ' +
      'your Notice of Award, shall be binding ' +
      'upon the Bidder.',
      {
        after: 125,
      }
    ),

    para(
      'I/We understand that you are not ' +
      'bound to accept the Lowest Calculated ' +
      'Bid or any Bid you may receive.',
      {
        after: 125,
      }
    ),

    para(
      'I/We certify/confirm that we comply ' +
      'with the eligibility requirements ' +
      'pursuant to the PBD.',
      {
        after: 125,
      }
    ),

    // FIX SPACING AROUND SUBMITTED BY

    para(
      [
        text(
          'The undersigned is authorized to ' +
          'submit the bid on behalf of '
        ),

        text(representative, {
          bold: true,
          italics: true,
        }),

        text(
          ' as evidenced by the attached '
        ),

        text(
          "Secretary's Certificate.",
          {
            bold: true,
            italics: true,
          }
        ),
      ],
      {
        after: 125,
      }
    ),

    para(
      'I/We acknowledge that failure to ' +
      'sign each and every page of this ' +
      'Bid Form, including the attached ' +
      'Schedule of Prices, shall be a ' +
      'ground for the rejection of our bid.',
      {
        after: 0,
      }
    ),

    // ======================================
    // PAGE 2 - SIGNATURE
    // ======================================

    para(
      'Duly authorized to sign the Bid ' +
      'for and behalf of:',
      {
        pageBreakBefore: true,
        before: 1350,
        after: 100,
      }
    ),

    para(
      [
        text(firm, {
          bold: true,
          italics: true,
        }),
      ],
      {
        after: 580,
      }
    ),

    para(
      [
        text(
          representative.toUpperCase(),
          {
            bold: true,
            italics: true,
          }
        ),
      ],
      {
        after: 0,
      }
    ),

    para(
      [
        text(designation, {
          italics: true,
        }),
      ],
      {
        after: 0,
      }
    ),

    para(
      [
        text(bid.date, {
          bold: true,
          italics: true,
        }),
      ],
      {
        after: 0,
      }
    ),
  ]

  // ========================================
  // FINAL WORD SECTION
  // ========================================

  return [
    {
      properties: {
        type: SectionType.NEXT_PAGE,

        page: {
          size: {
            width: 12240,
            height: 15840,
          },

          margin: {
            top: 900,
            bottom: 900,
            left: 1440,
            right: 1400,
          },
        },
      },

      children: paragraphs,
    },
  ]
}
