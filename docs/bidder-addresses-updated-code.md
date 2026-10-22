# Complete updated code: bidder addresses

This snapshot includes every source/test file added or modified for the address task. Existing PDF/Word adapters already receive Document Setup businessAddress; no database schema, persistence hook, pricing, document order, styles or uploaded certificates were changed.

Changes:
- bidderAddresses.js: primary-office defaults, additional-office metadata, selection and per-project custom-address helpers.
- DocumentSetup.jsx: existing editable address field and bidder dropdown call those helpers.
- documentSetup.js: configured dropdown addresses and legacy setup fallback without replacing saved/custom/blank values.
- manpowerPdf.js: update the existing Mikata letterhead name/address from current setup instead of retaining the template address.
- bidder-addresses.test.mjs: selection, custom-address round trips, unknown defaults, blank edits, saved data compatibility and export adapter coverage.

Address memory is stored inside bid_security.documentSetup.bidderBusinessAddresses by stable company ID, using the existing autosave/local draft mechanism. Configured companies use their primary/main default on first selection; returning to a company restores its project-specific custom address. Companies without defaults stay blank unless their own saved address exists.

Browser validation used the real component and persistence hook with intercepted Supabase responses; three save requests were validated without modifying real remote records. Reload from the saved response and recovery of a pending local draft both passed. PDF and editable Word content checks passed for Builtech and WDC Omnibus, and Mikata manpower. Full-package export for other bidders still requires their actual assets as before; government certificates were not changed.

Run: node --test tests/bidder-addresses.test.mjs

Final validation: 10 automated tests passed; lint completed with zero errors and one pre-existing PriceScheduleEditor warning; production build passed with the existing bundle-size advisory. Browser validation details are recorded in bidder-address-browser-results.json.

## src/lib/bidderAddresses.js

```js
import { bidderCompanies } from './bidderCompanies.js'

// Additional offices are retained for reference; only the primary/main office
// is automatically placed in Document Setup and generated documents.
export const bidderAddresses = {
  builtech: {
    name: 'BUILTECH SOLUTIONS',
    businessAddress: 'M. Vega St., Abarlos Compound, Consolacion, Cagayan de Oro City',
    additionalOffice: 'Jamille St., Maria Cristina Subdivision, Brgy. San Miguel, Iligan City',
  },
  'r-and-l': {
    name: 'R&L BUILDERS AND CONSTRUCTION SUPPLY',
    businessAddress: 'Brgy. Baloy Extension, Gusa, Cagayan de Oro City, Misamis Oriental, Philippines',
  },
  wdc: {
    name: 'WDC BUILDERS & SUPPLIES',
    businessAddress: 'B-5, L-20, Cilria District 7, Puntod, Cagayan de Oro City',
    additionalOffice: '2nd Floor, ATC Building, Velez St. corner A. Luna, Brgy. 19, Cagayan de Oro City',
  },
  'mega-pluto': { name: 'MEGA PLUTO', businessAddress: 'Kihare, Bukidnon, 8703' },
  manotech: { name: 'MANOTECH', businessAddress: 'Purok 4, Poblacion, Linamon, Lanao del Norte' },
  mikata: {
    name: 'MIKATA CORPORATION',
    businessAddress: 'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000',
  },
}

const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()

function bidderKey(value) {
  const label = typeof value === 'object' && value !== null
    ? value.bidderName || value.bidderId
    : value
  if (!normalize(label)) return ''
  const company = bidderCompanies.find(bidder =>
    [bidder.id, bidder.name, ...bidder.aliases].some(name => normalize(name) === normalize(label)))
  return company?.id || normalize(label)
}

export function getDefaultBidderAddress(bidder) {
  return bidderAddresses[bidderKey(bidder)]?.businessAddress ?? ''
}

function savedAddresses(setup) {
  const saved = setup.bidderBusinessAddresses
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? { ...saved } : {}
}

export function changeBidderAddress(setup, businessAddress) {
  const addresses = savedAddresses(setup)
  const key = bidderKey(setup)
  if (key) addresses[key] = businessAddress
  return { ...setup, businessAddress, bidderBusinessAddresses: addresses }
}

export function selectBidder(setup, bidderName) {
  const addresses = savedAddresses(setup)
  const previousKey = bidderKey(setup)
  // Snapshot the address before leaving its company, including intentional blanks.
  if (previousKey && setup.businessAddress != null) addresses[previousKey] = setup.businessAddress
  const key = bidderKey(bidderName)
  const company = bidderCompanies.find(bidder => bidder.id === key)
  const businessAddress = key && Object.hasOwn(addresses, key)
    ? addresses[key]
    : getDefaultBidderAddress(bidderName)
  return {
    ...setup,
    bidderName,
    bidderId: company?.id,
    businessAddress,
    bidderBusinessAddresses: addresses,
  }
}

```

## src/components/DocumentSetup.jsx

```jsx
import { useRef } from 'react'
import TemplateSelector from './TemplateSelector'
import { changeBidderAddress, selectBidder } from '../lib/bidderAddresses'

import {
  bidders,
  formatLongDate,
  representatives,
} from '../lib/documentSetup'

export default function DocumentSetup({
  value,
  onChange,
  templateVariant = 'old_default',
  onTemplateChange,
}) {
  const dateInputRef = useRef(null)

  const textFields = [
    ['province', 'Province'],
    ['municipality', 'Municipality'],
    ['projectTitle', 'Project Title'],
    ['referenceNumber', 'Reference Number'],
    ['procuringEntity', 'Procuring Entity'],
  ]

  function openDatePicker() {
    const input = dateInputRef.current

    if (!input) return

    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.click()
    }
  }

  function handleBidderChange(event) {
    onChange(selectBidder(value, event.target.value))
  }

  function handleRepresentativeChange(
    event,
  ) {
    const submittedBy =
      event.target.value

    const representative =
      representatives.find(
        (person) =>
          person.name ===
          submittedBy,
      )

    onChange({
      ...value,
      submittedBy,
      designation:
        representative?.designation ||
        '',
    })
  }

  return (
    <section className="document-setup">
      <div className="document-setup-heading">
        <h2>Document Setup</h2>
        {onTemplateChange && <TemplateSelector value={templateVariant} onChange={onTemplateChange} />}
      </div>

      <h3>Project Information</h3>

      {textFields.map(
        ([key, label]) => (
          <label key={key}>
            {label}

            {key === 'projectTitle' ? (
              <textarea
                aria-label={label}
                rows={2}
                value={value[key] || ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]:
                      event.target.value,
                  })
                }
              />
            ) : (
              <input
                aria-label={label}
                type="text"
                value={value[key] || ''}
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]:
                      event.target.value,
                  })
                }
              />
            )}
          </label>
        ),
      )}

      <label>
        Bidder Name

        <select
          aria-label="Bidder Name"
          value={value.bidderName || ''}
          onChange={handleBidderChange}
        >
          <option value="">
            Select bidder
          </option>

          {value.bidderName &&
            !bidders.some(
              (bidder) =>
                bidder.name ===
                value.bidderName,
            ) && (
              <option
                value={value.bidderName}
              >
                {value.bidderName}
              </option>
            )}

          {bidders.map(
            (bidder) => (
              <option
                key={bidder.name}
                value={bidder.name}
              >
                {bidder.name}
              </option>
            ),
          )}
        </select>
      </label>

      <label>
        Business Address

        <textarea
          aria-label="Business Address"
          rows={2}
          value={
            value.businessAddress || ''
          }
          onChange={(event) =>
            onChange(changeBidderAddress(value, event.target.value))
          }
        />
      </label>

      <label>
        Date

        <div
          style={{
            position: 'relative',
          }}
        >
          <input
            aria-label="Date"
            type="text"
            value={
              formatLongDate(value.date) ||
              ''
            }
            readOnly
            onClick={openDatePicker}
            style={{
              cursor: 'pointer',
              paddingRight: '38px',
            }}
          />

          <button
            type="button"
            aria-label="Choose date"
            title="Choose date"
            onClick={openDatePicker}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform:
                'translateY(-50%)',
              border: 'none',
              background:
                'transparent',
              cursor: 'pointer',
              padding: '4px 6px',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            📅
          </button>

          <input
            ref={dateInputRef}
            type="date"
            value={value.date || ''}
            onChange={(event) =>
              onChange({
                ...value,
                date:
                  event.target.value,
              })
            }
            tabIndex={-1}
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        </div>
      </label>

      <label>
        Submitted By

        <select
          aria-label="Submitted By"
          value={value.submittedBy ?? ''}
          onChange={handleRepresentativeChange}
        >
          <option value="">
            Select Submitted By
          </option>

          <option value="JHO ANN Q. CLEOPAS">
            JHO ANN Q. CLEOPAS
          </option>

          <option value="CARLOS RAFAEL A. JAMILO">
            CARLOS RAFAEL A. JAMILO
          </option>

          <option value="MARLJONE BLAIRE B. TINGTING">
            MARLJONE BLAIRE B. TINGTING
          </option>
        </select>
      </label>

      <label>
        Designation

        <input
          aria-label="Designation"
          type="text"
          value={
            value.designation || ''
          }
          readOnly
        />
      </label>
    </section>
  )
}

```

## src/lib/documentSetup.js

```js
import { bidderCompanies } from './bidderCompanies'
import { getDefaultBidderAddress } from './bidderAddresses'
export const representatives = [
  {
    name: 'JHO ANN Q. CLEOPAS',
    designation: 'Authorized Representative',
  },
  {
    name: 'CARLOS RAFAEL A. JAMILO',
    designation: 'Authorized Representative',
  },
  {
    name: 'MARLJONE BLAIRE B. TINGTING',
    designation: 'Authorized Representative',
  },
]

// ============================================================
// BIDDER / COMPANY OPTIONS
// ============================================================

export const bidders = bidderCompanies.map(bidder => ({
  ...bidder,
  address: getDefaultBidderAddress(bidder.id) || bidder.address,
}))

// ============================================================
// DATE FORMAT
// ============================================================

export function formatLongDate(value) {
  const text = String(value ?? '').trim()

  if (!text) {
    return ''
  }

  let year
  let month
  let day

  const isoMatch = text.match(
    /^(\d{4})-(\d{2})-(\d{2})$/,
  )

  if (isoMatch) {
    year = Number(isoMatch[1])
    month = Number(isoMatch[2])
    day = Number(isoMatch[3])
  } else {
    const slashMatch = text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    )

    if (slashMatch) {
      month = Number(slashMatch[1])
      day = Number(slashMatch[2])
      year = Number(slashMatch[3])
    } else {
      const parsed = new Date(text)

      if (Number.isNaN(parsed.getTime())) {
        return text
      }

      year = parsed.getFullYear()
      month = parsed.getMonth() + 1
      day = parsed.getDate()
    }
  }

  const date = new Date(
    year,
    month - 1,
    day,
  )

  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'long',
      day: '2-digit',
      year: 'numeric',
    },
  ).format(date)
}

// ============================================================
// DOCUMENT SETUP
// ============================================================

export function createDocumentSetup(
  project,
  bid = {},
  omnibus = {},
) {
  if (bid.documentSetup) {
    return bid.documentSetup
  }

  const prior = (key) =>
    bid[key] ||
    omnibus[key] ||
    ''

  return {
    province:
      prior('province') ||
      project.area_of_delivery ||
      project.province ||
      '',

    municipality:
      prior('municipality') ||
      project.lgu ||
      project.municipality ||
      '',

    projectTitle:
      prior('projectTitle') ||
      project.title ||
      project.project_title ||
      project.projectTitle ||
      '',

    referenceNumber:
      prior('referenceNumber') ||
      project.reference_number ||
      project.reference_no ||
      project.referenceNumber ||
      '',

    procuringEntity:
      prior('procuringEntity') ||
      project.procuring_entity ||
      project.entity ||
      '',

    date:
      prior('date') ||
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        },
      ).format(new Date()),

    bidderName:
      prior('bidderName'),

    businessAddress:
      bid.businessAddress ?? bid.companyAddress ??
      omnibus.businessAddress ?? omnibus.companyAddress ??
      getDefaultBidderAddress(prior('bidderName')),

    submittedBy:
      prior('authorizedRepresentative'),

    designation:
      bid.representativeDesignation ||
      omnibus.designation ||
      '',
  }
}

// ============================================================
// SHARED PROJECT
// ============================================================

export function setupProject(setup) {
  return {
    bidderId: setup.bidderId,
    province:
      setup.province || '',

    municipality:
      setup.municipality || '',

    projectTitle:
      setup.projectTitle || '',

    referenceNumber:
      setup.referenceNumber || '',

    procuringEntity:
      setup.procuringEntity || '',

    date:
      setup.date || '',

    bidderName:
      setup.bidderName || '',

    businessAddress:
      setup.businessAddress || '',

    submittedBy:
      setup.submittedBy || '',

    designation:
      setup.designation || '',

    // Legacy aliases
    title:
      setup.projectTitle || '',

    reference_number:
      setup.referenceNumber || '',

    procuring_entity:
      setup.procuringEntity || '',

    lgu:
      setup.municipality || '',

    area_of_delivery:
      setup.province || '',

    project_title:
      setup.projectTitle || '',

    reference_no:
      setup.referenceNumber || '',

    municipality_name:
      setup.municipality || '',

    province_name:
      setup.province || '',
  }
}

// ============================================================
// SCHEDULE
// ============================================================

export function alignScheduleItems(
  technical,
  schedule,
) {
  return schedule.map((item) => {
    if (item.sharedItemId) {
      return item
    }

    const master =
      technical.find(
        (row) =>
          row.id === item.id,
      ) ||
      technical.find(
        (row) =>
          row.itemNo === item.itemNo,
      )

    return master
      ? {
          ...item,
          id: master.id,
          sharedItemId: master.id,
        }
      : item
  })
}

export function sharedScheduleItems(
  technical,
  schedule,
) {
  return technical.map((item) => ({
    id: item.id,
    sharedItemId: item.id,
    itemNo: item.itemNo,
    qty: item.qty,
    unit: item.unit,

    specificationLines:
      item.specificationLines.map(
        ({ id, text }) => ({
          id,
          text,
        }),
      ),

    deliveryPeriod:
      schedule.find(
        (row) =>
          row.id === item.id,
      )?.deliveryPeriod || '',
  }))
}

```

## src/services/pdf/manpowerPdf.js

```js
import { applyBidderLetterhead } from './bidderLetterhead'
import { getTemplatePath, fetchAsset, getBidderCompany } from '../../lib/bidderAssets'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { formatLongDate } from '../../lib/documentSetup'

export async function generateManpowerPreview(project) {
  const response = await fetchAsset(getTemplatePath("Manpower Requirements.pdf", project))

  if (!response.ok) {
    throw new Error(
      'Unable to load Manpower Requirements.pdf'
    )
  }

  const pdfDoc = await PDFDocument.load(
    await response.arrayBuffer()
  )

  if (pdfDoc.getPageCount() === 0) {
    throw new Error(
      'Manpower Requirements.pdf has no pages.'
    )
  }

  const page = pdfDoc.getPage(0)

  // =========================================================
  // FONTS
  // =========================================================

  const regular = await pdfDoc.embedFont(
    StandardFonts.TimesRoman
  )

  const bold = await pdfDoc.embedFont(
    StandardFonts.TimesRomanBold
  )

  const black = rgb(0, 0, 0)
  const white = rgb(1, 1, 1)

  // =========================================================
  // HELPERS
  // =========================================================

  const cleanValue = (value) =>
    String(value ?? '').trim()

  function fitSize(
    value,
    font,
    startSize,
    maxWidth,
    minimumSize = 8
  ) {
    const text = cleanValue(value)

    let size = startSize

    while (
      text &&
      size > minimumSize &&
      font.widthOfTextAtSize(text, size) > maxWidth
    ) {
      size -= 0.1
    }

    return size
  }

  function drawFitText({
    text,
    x,
    y,
    font = regular,
    size = 10,
    maxWidth = 200,
    minimumSize = 8,
  }) {
    const value = cleanValue(text)

    if (!value) return 0

    const actualSize = fitSize(
      value,
      font,
      size,
      maxWidth,
      minimumSize
    )

    page.drawText(value, {
      x,
      y,
      size: actualSize,
      font,
      color: black,
    })

    return font.widthOfTextAtSize(
      value,
      actualSize
    )
  }

  // =========================================================
  // VALUES FROM DOCUMENT SETUP
  // =========================================================

  const submittedBy = cleanValue(
    project?.submittedBy ||
    project?.authorizedRepresentative
  ).toUpperCase()

  const designation =
    cleanValue(
      project?.designation ||
      project?.representativeDesignation
    ) || 'Authorized Representative'

  const bidderName = cleanValue(
    project?.bidderName
  ).toUpperCase()

  const date = formatLongDate(project?.date)

  // =========================================================
  // ERASE OLD VALUES ONLY
  // =========================================================
  // HINDI gagalawin:
  // - Submitted by:
  // - Designation
  // - Name of Firm
  // - Date
  // - table
  // - manpower names
  // - positions
  // - logo/header
  // =========================================================

  page.drawRectangle({
    x: 301,
    y: 224,
    width: 235,
    height: 84,
    color: white,
    borderWidth: 0,
  })

  // =========================================================
  // SUBMITTED BY
  // =========================================================

  const submittedY = 295

  const submittedWidth = drawFitText({
    text: submittedBy,
    x: 306,
    y: submittedY,
    font: bold,
    size: 10,
    maxWidth: 210,
    minimumSize: 8,
  })

  if (submittedBy && submittedWidth > 0) {
    page.drawLine({
      start: {
        x: 306,
        y: submittedY - 1.5,
      },
      end: {
        x: 306 + submittedWidth,
        y: submittedY - 1.5,
      },
      thickness: 0.6,
      color: black,
    })
  }

  // Printed Name & Signature
  page.drawText(
    '(Printed Name & Signature)',
    {
      x: 306,
      y: 279,
      size: 7.5,
      font: regular,
      color: black,
    }
  )

  // =========================================================
  // DESIGNATION
  // =========================================================

  drawFitText({
    text: designation,
    x: 306,
    y: 262,
    font: bold,
    size: 10,
    maxWidth: 210,
    minimumSize: 8,
  })

  // =========================================================
  // NAME OF FIRM
  // =========================================================

  const firmY = 245

  const firmWidth = drawFitText({
    text: bidderName,
    x: 306,
    y: firmY,
    font: bold,
    size: 10,
    maxWidth: 230,
    minimumSize: 7.5,
  })

  if (bidderName && firmWidth > 0) {
    page.drawLine({
      start: {
        x: 306,
        y: firmY - 1.5,
      },
      end: {
        x: 306 + firmWidth,
        y: firmY - 1.5,
      },
      thickness: 0.6,
      color: black,
    })
  }

  // =========================================================
  // DATE
  // =========================================================

  drawFitText({
    text: date,
    x: 306,
    y: 231,
    font: bold,
    size: 10,
    maxWidth: 180,
    minimumSize: 8,
  })

  // =========================================================
  if (getBidderCompany(project).id === 'mikata') {
    const officeFont = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique)
    const businessAddress = cleanValue(project.businessAddress ?? project.companyAddress)
    page.drawRectangle({ x: 150, y: page.getHeight() - 113, width: 412, height: 38, color: white })
    drawFitText({ text: project.bidderName, x: 151, y: page.getHeight() - 96, font: bold, size: 22, maxWidth: 410 })
    drawFitText({ text: businessAddress ? 'CDO Office: ' + businessAddress : '',
      x: 151, y: page.getHeight() - 110, font: officeFont, size: 10, maxWidth: 410 })
  }
  await applyBidderLetterhead(pdfDoc, page, project, {
    box: { x: 30, y: page.getHeight() - 155, width: 540, height: 99 },
    logo: { x: 36.25, y: page.getHeight() - 64.001 - 83.479, width: 106.77, height: 83.479 },
    text: { x: 151, y: page.getHeight() - 96, addressY: page.getHeight() - 110, width: 410 },
  })

  // SAVE
  // =========================================================

  const bytes = await pdfDoc.save()

  return URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/pdf',
    })
  )
}

```

## tests/bidder-addresses.test.mjs

```js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { bidderAddresses, changeBidderAddress, getDefaultBidderAddress, selectBidder } from '../src/lib/bidderAddresses.js'

test('selection loads the configured primary office immediately and retains unrelated project fields', () => {
  let setup = { referenceNumber: '13261581', projectTitle: 'Existing title' }
  for (const [id, entry] of Object.entries(bidderAddresses)) {
    setup = selectBidder(setup, entry.name)
    assert.equal(setup.businessAddress, entry.businessAddress)
    assert.equal(setup.bidderId, id)
    assert.equal(setup.referenceNumber, '13261581')
    assert.equal(setup.projectTitle, 'Existing title')
    assert.notEqual(setup.businessAddress, entry.additionalOffice)
  }
  assert.equal(getDefaultBidderAddress('BUILTECH'), bidderAddresses.builtech.businessAddress)
})

test('custom addresses persist by bidder through switching and a saved JSON round trip', () => {
  let setup = selectBidder({}, 'BUILTECH SOLUTIONS')
  setup = changeBidderAddress(setup, 'Custom Builtech address')
  setup = selectBidder(setup, 'MEGA PLUTO')
  assert.equal(setup.businessAddress, 'Kihare, Bukidnon, 8703')
  setup = JSON.parse(JSON.stringify({ documentSetup: setup })).documentSetup
  setup = selectBidder(setup, 'BUILTECH SOLUTIONS')
  assert.equal(setup.businessAddress, 'Custom Builtech address')
  setup = changeBidderAddress(setup, '')
  setup = selectBidder(selectBidder(setup, 'WDC BUILDERS & SUPPLIES'), 'BUILTECH SOLUTIONS')
  assert.equal(setup.businessAddress, '')
})

test('unconfigured bidders retain only their own saved addresses; new bidders never inherit another address', () => {
  for (const name of ['MAGNUS', 'FJQ CONSTRUCTION', 'GOLDEN M', 'MIGOY BUGOY ENTERPRISES', 'Legacy saved company']) {
    const legacy = { bidderName: name, businessAddress: 'Original saved address' }
    const selected = selectBidder(selectBidder(legacy, 'WDC BUILDERS & SUPPLIES'), name)
    assert.equal(selected.businessAddress, 'Original saved address')
    assert.equal(selectBidder(selectBidder({}, 'WDC'), name).businessAddress, '')
  }
  const cleared = selectBidder(selectBidder({}, 'MIKATA CORPORATION'), '')
  assert.equal(cleared.businessAddress, '')
  assert.equal(cleared.bidderId, undefined)
})

test('existing setup persistence and PDF/Word data adapters retain the current address', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { createDocumentSetup, setupProject } = await server.ssrLoadModule('/src/lib/documentSetup.js')
    const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
    const setup = changeBidderAddress(selectBidder({}, 'BUILTECH SOLUTIONS'), 'Saved custom office')
    const stored = copyEditorItems({ documentSetup: setup, templateVariant: 'initao_lgu' }, 'bid_security')
    const restored = createDocumentSetup({}, stored)
    assert.deepEqual(restored, setup)
    assert.equal(setupProject(restored).businessAddress, 'Saved custom office')
    assert.equal(stored.templateVariant, 'initao_lgu')
    assert.equal(createDocumentSetup({}, { bidderName: 'MANOTECH' }).businessAddress, bidderAddresses.manotech.businessAddress)
    assert.equal(createDocumentSetup({}, { bidderName: 'MIKATA CORPORATION', companyAddress: 'Legacy office' }).businessAddress, 'Legacy office')
    assert.equal(createDocumentSetup({}, { bidderName: 'MIKATA CORPORATION', businessAddress: '' }).businessAddress, '')
  } finally { await server.close() }
})

```

