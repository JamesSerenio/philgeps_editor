import { getBidderCompany } from './bidderCompanies.js'

const DEFAULT_ENTRIES = {
  cctv: {
    government: {
      ownerDetails: 'LGU MALITBOG',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description:
        'PROCUREMENT AND INSTALLATION OF STREET SOLAR LIGHTS',
    },
    private: {
      ownerDetails: '',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description: '',
    },
  },

  streetlight: {
    government: {
      ownerDetails: 'LGU SUMILAO',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description:
        'PROCUREMENT OF SOLAR STREET LIGHTS FOR MUNICIPAL AND BARANGAY STREET',
    },
    private: {
      ownerDetails: '',
      natureOfWork: 'SUPPLY AND DELIVERY',
      description: '',
    },
  },
}

// ==================================================
// FINANCIAL DETAILS
// ==================================================

// Existing example values from your templates.
// Verify these against the actual completed contract.

const FINANCIALS = {
  cctv: [
    '100%',
    '- 716,500.00\n' +
      '- 716,500.00\n' +
      '- 15 DAYS',
    '- APRIL 29, 2026\n' +
      '- MAY 4, 2026\n' +
      '- MAY 20, 2026',
  ],

  streetlight: [
    '100%',
    'A. 1,997,496.00\n' +
      'B. 26 DAYS',
    'A. MARCH 31, 2026\n' +
      'B. APRIL 4, 2026\n' +
      'C. MAY 7, 2026',
  ],
}

export function getSlccVariant(data = {}) {
  return ['cctv', 'streetlight', 'none'].includes(data.slccVariant)
    ? data.slccVariant : /cctv/i.test(data.projectTitle ?? '') ? 'cctv' : 'streetlight'
}

export function getSlccContractType(data = {}, variant = getSlccVariant(data)) {
  return (data.slccContractTypes?.[variant] ??
    (variant === 'none' ? data.slccContractTypes?.streetlight : undefined)) === 'private'
    ? 'private' : 'government'
}

export function getSlccEntry(data = {}, variant = getSlccVariant(data), type = getSlccContractType(data, variant)) {
  const template = variant === 'none' ? 'streetlight' : variant
  const financial = FINANCIALS[template]
  const defaults = getBidderCompany(data).id === 'mikata'
    ? { ...DEFAULT_ENTRIES[template]?.[type], percentage: financial[0], awardCompletion: financial[1], dates: financial[2] }
    : {}
  const saved = data.slccEntries?.[variant]?.[type] ??
    (variant === 'none' ? data.slccEntries?.streetlight?.[type] : undefined) ?? {}
  return { ...defaults, ...saved }
}
