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

export const bidders = [
  {
    name: 'MIKATA CORPORATION',
    address:
      'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000',
  },
]

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
      prior('companyAddress'),

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