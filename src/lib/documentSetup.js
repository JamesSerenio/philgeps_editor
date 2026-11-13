
import {
  bidderCompanies,
  documentBidderName,
  normalizeBidderSetup,
} from './bidderCompanies'

import {
  getDefaultBidderAddress,
} from './bidderAddresses'

// ==========================================
// AUTHORIZED REPRESENTATIVES
// ==========================================

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

// ==========================================
// COMPANY / BIDDER OPTIONS
// ==========================================

// Use the existing company registry.
// Do not hard-code addresses from other bidders.

export const bidders = bidderCompanies.map((bidder) => ({
  ...bidder,
  aliases: bidder.aliases ?? [],
  address:
    getDefaultBidderAddress(bidder.id) ||
    bidder.address ||
    '',
}))

// ==========================================
// PHILIPPINE DATE HELPERS
// ==========================================

export function dateOnly(value) {
  if (value == null || value === '') {
    return ''
  }

  const text = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text
  }

  const date = new Date(text)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

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

      const parts = new Intl.DateTimeFormat(
        'en-US',
        {
          timeZone: 'Asia/Manila',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        },
      ).formatToParts(parsed)

      const getPart = (type) =>
        Number(
          parts.find((part) => part.type === type)
            ?.value,
        )

      year = getPart('year')
      month = getPart('month')
      day = getPart('day')
    }
  }

  const date = new Date(
    Date.UTC(year, month - 1, day),
  )

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return text
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'long',
    day: '2-digit',
    year: 'numeric',
  }).format(date)
}

// ==========================================
// IDENTIFY NEW BLANK EDITOR PROJECT
// ==========================================

export function isManualBiddingProject(project = {}) {
  return (
    project?.is_manual === true ||
    project?.isBlankEditor === true ||
    project?.project_source === 'manual' ||
    project?.source === 'manual'
  )
}

// ==========================================
// DEADLINE VALIDATION
// ==========================================

export function hasValidManualDeadline(setup = {}) {
  if (!setup.isBlankEditor) {
    return true
  }

  const deadline = String(
    setup.closingDate ?? '',
  )

  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return false
  }

  const date = new Date(
    `${deadline}T00:00:00Z`,
  )

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === deadline
  )
}

export function validateDocumentSetup(setup = {}) {
  if (
    setup.isBlankEditor &&
    !hasValidManualDeadline(setup)
  ) {
    throw new Error(
      'Closing / Deadline is required. ' +
      'Please select a date in Document Setup.',
    )
  }

  return true
}

// ==========================================
// CREATE DOCUMENT SETUP
// ==========================================

export function createDocumentSetup(
  project = {},
  bid = {},
  omnibus = {},
) {
  const savedSetup = bid?.documentSetup
    ? normalizeBidderSetup(bid.documentSetup)
    : null

  const prior = (key) =>
    bid?.[key] ||
    omnibus?.[key] ||
    ''

  // Read the persistent manual-project marker.
  const isBlankEditor =
    isManualBiddingProject(project) ||
    (
      project.is_manual !== false &&
      savedSetup?.isBlankEditor === true
    )

  // Manual deadline is a date-only value.
  // Imported projects keep their source timestamp.
  const closingDate = isBlankEditor
    ? dateOnly(
        savedSetup?.closingDate ||
        project.manual_deadline ||
        project.closing_date ||
        '',
      )
    : (
        savedSetup?.closingDate ??
        project.closing_date ??
        ''
      )

  const today = new Intl.DateTimeFormat(
    'sv-SE',
    {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    },
  ).format(new Date())

  const defaults = {
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
      today,

    bidderName: documentBidderName({
      bidderName: prior('bidderName'),
    }),

    businessAddress:
      bid.businessAddress ??
      bid.companyAddress ??
      omnibus.businessAddress ??
      omnibus.companyAddress ??
      getDefaultBidderAddress(
        prior('bidderName'),
      ) ??
      '',

    submittedBy:
      prior('submittedBy') ||
      prior('authorizedRepresentative'),

    designation:
      bid.representativeDesignation ||
      omnibus.designation ||
      prior('designation') ||
      '',
  }

  // Preserve all previously saved company fields,
  // variants, representatives and editor settings.
  return normalizeBidderSetup({
    ...defaults,
    ...(savedSetup || {}),
    isBlankEditor,
    closingDate,
  })
}

// ==========================================
// SHARED PROJECT INFORMATION
// ==========================================

export function setupProject(setup = {}) {
  const manual =
    setup.isBlankEditor === true

  const closingDate = manual
    ? dateOnly(setup.closingDate)
    : setup.closingDate || ''

  return {
    ...setup,

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
      documentBidderName(setup),

    businessAddress:
      setup.businessAddress || '',

    submittedBy:
      setup.submittedBy || '',

    designation:
      setup.designation || '',

    isBlankEditor: manual,

    closingDate,

    manual_deadline:
      manual ? closingDate : null,

    // ======================================
    // LEGACY PROJECT FIELD ALIASES
    // ======================================

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

// ==========================================
// SCHEDULE ITEM ALIGNMENT
// ==========================================

export function alignScheduleItems(
  technical = [],
  schedule = [],
) {
  if (!Array.isArray(schedule)) {
    return []
  }

  const technicalItems = Array.isArray(technical)
    ? technical
    : []

  return schedule.map((item) => {
    if (item.sharedItemId) {
      return item
    }

    const master =
      technicalItems.find(
        (row) => row.id === item.id,
      ) ||
      technicalItems.find(
        (row) =>
          String(row.itemNo) ===
          String(item.itemNo),
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

// ==========================================
// TECHNICAL / SCHEDULE SYNCHRONIZATION
// ==========================================

export function sharedScheduleItems(
  technical = [],
  schedule = [],
) {
  const technicalItems = Array.isArray(technical)
    ? technical
    : []

  const scheduleItems = Array.isArray(schedule)
    ? schedule
    : []

  return technicalItems.map((item) => ({
    id: item.id,

    sharedItemId: item.id,

    itemNo: item.itemNo,

    qty: item.qty,

    unit: item.unit,

    specificationLines:
      (item.specificationLines ?? []).map(
        ({ id, text }) => ({
          id,
          text,
        }),
      ),

    deliveryPeriod:
      scheduleItems.find(
        (row) => row.id === item.id,
      )?.deliveryPeriod || '',
  }))
}
