
import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  SectionType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'

import {
  getDocument,
  GlobalWorkerOptions,
} from 'pdfjs-dist'

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

import {
  formatBidDate,
} from '../../lib/bidFormData'

import {
  serviceYearsText,
} from '../pdf/afterSalesPdf'

import {
  sectionMarker,
} from './wordHelpers'

// ==========================================
// PDF WORKER
// ==========================================

GlobalWorkerOptions.workerSrc = workerUrl

const FONT = 'Times New Roman'

const NONE = {
  top: { style: BorderStyle.NONE, size: 0 },
  bottom: { style: BorderStyle.NONE, size: 0 },
  left: { style: BorderStyle.NONE, size: 0 },
  right: { style: BorderStyle.NONE, size: 0 },
  insideHorizontal: {
    style: BorderStyle.NONE,
    size: 0,
  },
  insideVertical: {
    style: BorderStyle.NONE,
    size: 0,
  },
}

// ==========================================
// TEXT HELPERS
// ==========================================

const str = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()

function run(value, options = {}) {
  return new TextRun({
    // Preserve spaces between bold and normal runs.
    text: String(value ?? ''),
    font: FONT,
    size: 26,
    ...options,
  })
}

function p(children, options = {}) {
  return new Paragraph({
    children: Array.isArray(children)
      ? children
      : [run(children)],

    spacing: { after: 0 },

    ...options,
  })
}

// ==========================================
// COMPANY CONTACT DETAILS
// ==========================================

function cleanCompanyContact(data, company) {
  const mikata = /MIKATA/i.test(company)

  return {
    phone: str(
      data.companyMobile ??
      data.mobileNumber ??
      (
        mikata
          ? '0917 129 2972 / 0926 253 0301'
          : ''
      )
    ),

    email: str(
      data.companyEmail ??
      data.email ??
      (
        mikata
          ? 'MikataPrime@gmail.com'
          : ''
      )
    ),
  }
}

// ==========================================
// EXTRACT ORIGINAL LOGO ONLY
// ==========================================

async function originalLogo() {
  const base =
    import.meta.env.BASE_URL || '/'

  const url =
    `${base.replace(/\/?$/, '/')}` +
    'pdf/templates/After%20Sales.pdf'

  const response = await fetch(url, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `After-Sales logo template not found: ` +
      `${url} (HTTP ${response.status}).`
    )
  }

  const bytes = new Uint8Array(
    await response.arrayBuffer()
  )

  const signature = new TextDecoder(
    'ascii'
  ).decode(bytes.slice(0, 5))

  if (signature !== '%PDF-') {
    throw new Error(
      'After Sales.pdf URL did not return a PDF.'
    )
  }

  const task = getDocument({
    data: bytes,
    useSystemFonts: true,
  })

  try {
    const doc = await task.promise

    const firstPage = await doc.getPage(1)

    const viewport = firstPage.getViewport({
      scale: 2,
    })

    const canvas =
      document.createElement('canvas')

    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error(
        'Canvas 2D unavailable for the logo.'
      )
    }

    await firstPage.render({
      canvasContext: context,
      viewport,
    }).promise

    // Original Letter-size PDF:
    // Crop only the upper-left logo.
    // Do not turn the text into an image.

    const logo =
      document.createElement('canvas')

    logo.width = 216
    logo.height = 168

    const ctx = logo.getContext('2d')

    if (!ctx) {
      throw new Error(
        'Canvas 2D unavailable for logo cropping.'
      )
    }

    ctx.drawImage(
      canvas,
      54,
      52,
      216,
      168,
      0,
      0,
      216,
      168
    )

    const pngData = logo
      .toDataURL('image/png')
      .split(',')[1]

    const raw = atob(pngData)

    const binary = new Uint8Array(raw.length)

    for (let i = 0; i < raw.length; i += 1) {
      binary[i] = raw.charCodeAt(i)
    }

    return binary
  } finally {
    if (typeof task.destroy === 'function') {
      try {
        await task.destroy()
      } catch (error) {
        console.warn(
          'After-Sales logo cleanup:',
          error
        )
      }
    }
  }
}

// ==========================================
// WORD TABLE HELPERS
// ==========================================

function noBorderCell(children, width) {
  return new TableCell({
    width: {
      size: width,
      type: WidthType.DXA,
    },

    margins: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },

    borders: NONE,
    children,
  })
}

function signRow(
  label,
  valueRuns,
  options = {}
) {
  return new TableRow({
    cantSplit: true,

    children: [
      noBorderCell(
        [
          p(
            [run(label, { size: 23 })],
            {
              spacing: { after: 0 },
            }
          ),
        ],
        2480
      ),

      noBorderCell(
        [
          p([
            run(':', { size: 23 }),
          ]),
        ],
        260
      ),

      noBorderCell(
        [
          p(valueRuns, {
            spacing: {
              after: options.after ?? 65,
            },
          }),

          ...(
            options.note
              ? [
                  p(
                    [
                      run(
                        '(Printed Name & Signature)',
                        { size: 19 }
                      ),
                    ],
                    {
                      spacing: { after: 50 },
                    }
                  ),
                ]
              : []
          ),
        ],
        4300
      ),
    ],
  })
}

// ==========================================
// AFTER-SALES WORD GENERATOR
// ==========================================

export async function afterSalesWord({
  setup = {},
} = {}) {
  // ========================================
  // DOCUMENT SETUP
  // ========================================

  const company = str(
    setup.bidderName
  )

  const address = str(
    setup.businessAddress ||
    setup.companyAddress
  )

  const procuring =
    str(setup.procuringEntity) ||
    [
      str(setup.municipality),
      str(setup.province),
    ]
      .filter(Boolean)
      .join(', ')

  const project = str(
    setup.projectTitle
  )

  const submitter = str(
    setup.submittedBy ||
    setup.authorizedRepresentative
  )

  const designation = str(
    setup.designation ||
    setup.representativeDesignation
  )

  const date = formatBidDate(
    setup.date
  )

  const years = serviceYearsText(
    setup.servicePeriodYears ?? 1
  )

  if (
    !company ||
    !procuring ||
    !project ||
    !submitter
  ) {
    throw new Error(
      'After Sales: complete Bidder Name, ' +
      'Procuring Entity, Project Title ' +
      'and Submitted By.'
    )
  }

  const { phone, email } =
    cleanCompanyContact(
      setup,
      company
    )

  const logoBytes = await originalLogo()

  // ========================================
  // ORIGINAL LETTERHEAD
  // ========================================

  const letterhead = new Table({
    width: {
      size: 11120,
      type: WidthType.DXA,
    },

    columnWidths: [
      2260,
      8860,
    ],

    borders: NONE,

    rows: [
      new TableRow({
        cantSplit: true,

        children: [
          noBorderCell(
            [
              p([
                new ImageRun({
                  data: logoBytes,
                  type: 'png',

                  transformation: {
                    width: 108,
                    height: 84,
                  },
                }),
              ]),
            ],
            2260
          ),

          noBorderCell(
            [
              p([
                run(
                  company.toUpperCase(),
                  {
                    size: 43,
                    bold: true,
                  }
                ),
              ]),

              p([
                run(
                  `CDO Office: ${address}`,
                  {
                    size: 19,
                    bold: true,
                    italics: true,
                  }
                ),
              ]),

              ...(
                phone
                  ? [
                      p([
                        run(
                          `Mobile No.: ${phone}`,
                          {
                            size: 19,
                            bold: true,
                            italics: true,
                          }
                        ),
                      ]),
                    ]
                  : []
              ),

              ...(
                email
                  ? [
                      p([
                        run(
                          `Email: ${email}`,
                          {
                            size: 19,
                            bold: true,
                            italics: true,
                          }
                        ),
                      ]),
                    ]
                  : []
              ),
            ],
            8860
          ),
        ],
      }),
    ],
  })

  // ========================================
  // CERTIFICATE TITLE
  // ========================================

  const title = new Paragraph({
    alignment: AlignmentType.CENTER,

    spacing: {
      before: 450,
      after: 1180,
    },

    children: [
      sectionMarker(16),

      run(
        'AFTER-SALES SERVICE CERTIFICATE',
        {
          size: 33,
          bold: true,
          italics: true,
        }
      ),
    ],
  })

  // ========================================
  // FIRST CERTIFICATE PARAGRAPH
  // ========================================

  const first = p(
    [
      run(
        'This serves to certify that '
      ),

      run(
        company,
        {
          bold: true,
          underline: {},
        }
      ),

      run(
        ' is fully committed to providing ' +
        'comprehensive after-sales support to the '
      ),

      run(
        procuring,
        {
          bold: true,
          underline: {},
        }
      ),

      run(
        ' for the project: '
      ),

      run(
        project.endsWith('.')
          ? project
          : `${project}.`,
        {
          bold: true,
          italics: true,
        }
      ),
    ],
    {
      alignment: AlignmentType.JUSTIFIED,

      indent: {
        left: 1600,
        right: 800,
        firstLine: 720,
      },

      spacing: {
        line: 286,
        after: 730,
      },

      keepTogether: true,
    }
  )

  // ========================================
  // SECOND CERTIFICATE PARAGRAPH
  // ========================================

  const second = p(
    [
      run(
        'Beyond the initial delivery of materials, ' +
        'our company pledges a dedicated '
      ),

      run(
        years,
        {
          bold: true,
        }
      ),

      run(
        ' period of technical support and ' +
        'after-sales service. We remain at the ' +
        'full disposal of the municipal end-users ' +
        'to ensure that all operational needs ' +
        'are met and that our professional ' +
        'assistance is readily available ' +
        'throughout the agreed service period.'
      ),
    ],
    {
      alignment: AlignmentType.JUSTIFIED,

      indent: {
        left: 1600,
        right: 800,
        firstLine: 720,
      },

      spacing: {
        line: 286,
        after: 1100,
      },

      keepTogether: true,
    }
  )

  // ========================================
  // SIGNATURE SECTION
  // ========================================

  const signature = new Table({
    width: {
      size: 7040,
      type: WidthType.DXA,
    },

    columnWidths: [
      2480,
      260,
      4300,
    ],

    indent: {
      size: 2220,
      type: WidthType.DXA,
    },

    borders: NONE,

    rows: [
      signRow(
        'Submitted by',
        [
          run(
            submitter.toUpperCase(),
            {
              size: 23,
              bold: true,
              underline: {},
            }
          ),
        ],
        { note: true }
      ),

      signRow(
        'Designation',
        [
          run(
            designation,
            {
              size: 23,
              bold: true,
            }
          ),
        ]
      ),

      signRow(
        'Name of Firm',
        [
          run(
            company.toUpperCase(),
            {
              size: 23,
              bold: true,
              underline: {},
            }
          ),
        ]
      ),

      signRow(
        'Date',
        [
          run(
            date,
            {
              size: 23,
              bold: true,
            }
          ),
        ]
      ),
    ],
  })

  // ========================================
  // FINAL EDITABLE WORD SECTION
  // ========================================

  return [
    {
      properties: {
        type: SectionType.NEXT_PAGE,

        page: {
          // US Letter: 8.5 x 11 inches.
          size: {
            width: 12240,
            height: 15840,
          },

          margin: {
            top: 520,
            bottom: 800,
            left: 560,
            right: 560,
          },
        },
      },

      children: [
        letterhead,
        title,
        first,
        second,
        signature,
      ],
    },
  ]
}
