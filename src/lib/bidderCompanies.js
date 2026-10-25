// Stable IDs and folder names are independent of labels saved by older projects.
export const bidderCompanies = [
  { id: 'mikata', name: 'MIKATA CORPORATION', folder: 'MIKATA_CORPORATION', aliases: ['MIKATA PRIME CORPORATION', 'MIKATA'], address: 'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000', phone: '0917 129 2972 / 0926 253 0301', email: 'MikataPrime@gmail.com' },
  { id: 'builtech', name: 'BUILTECH SOLUTIONS', folder: 'BUILTECH_SOLUTIONS', aliases: ['BUILTECH'], logoFilename: 'BUILTECH_SOLUTIONS-logo.png', headerAddress: 'M. Vega St., Abalos Comp., Consolacion, Cagayan de Oro City', additionalOffice: 'Jamille St., Maria Cristina Subd., Brgy. San Miguel, Iligan City', phone: '0917 772 7893 / 0916 107 9932', email: 'Builtechcorporation@gmail.com', pcabRegistration: '46156' },
  { id: 'manotech', name: 'MANOTECH', folder: 'MANOTECH', aliases: [], logoFilename: 'MANOTECH-logo.png', address: 'Purok 4, Poblacion, Linamon, Lanao del Norte' },
  { id: 'mega-pluto', name: 'MEGA PLUTO', folder: 'MEGA_PLUTO', aliases: [], logoFilename: 'MEGA_PLUTO-logo-transparent.png', address: 'Kihare, Bukidnon, 8703', phone: '09751761554', email: 'megapluto.ph@gmail.com' },
]

const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
export function documentBidderName(setup) {
  return setup?.bidderId === 'mega-pluto' || normalize(setup?.bidderName) === 'MEGA PLUTO'
    ? String(setup.registeredBusinessName || setup.legalBusinessName || setup.bidderName || 'MEGA PLUTO').trim()
    : setup?.bidderName ?? ''
}
export function getBidderCompany(value) {
  const input = typeof value === 'object' && value !== null ? value.bidderId || value.bidderName : value
  // Empty legacy setup used the existing Mikata templates before a bidder was chosen.
  if (!normalize(input)) return bidderCompanies[0]
  const bidder = bidderCompanies.find(company => [company.id, company.folder, company.name, ...company.aliases].some(label => normalize(label) === normalize(input)))
  if (!bidder) throw new Error('No company asset configuration for bidder: ' + input)
  return bidder
}
