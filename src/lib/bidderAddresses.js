import { bidderCompanies } from './bidderCompanies.js'
import { selectBidderProfile } from './bidderProfiles.js'

// Additional offices are retained for reference; only the primary/main office
// is automatically placed in Document Setup and generated documents.
export const bidderAddresses = {
  builtech: {
    name: 'BUILTECH SOLUTIONS',
    businessAddress: 'M. Vega St., Abarlos Compound, Consolacion, Cagayan de Oro City',
    additionalOffice: 'Jamille St., Maria Cristina Subdivision, Brgy. San Miguel, Iligan City',
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
  return { ...setup, businessAddress, companyAddress: businessAddress, bidderBusinessAddresses: addresses }
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
    ...selectBidderProfile(setup, previousKey, key),
    bidderName,
    bidderId: company?.id,
    businessAddress,
    companyAddress: businessAddress,
    bidderBusinessAddresses: addresses,
  }
}
