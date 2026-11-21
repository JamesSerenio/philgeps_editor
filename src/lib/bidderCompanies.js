// Stable IDs and folder names are independent of labels saved by older projects.
export const MEGA_PLUTO_DISPLAY_NAME = 'Megapluto Electrical Supply & Hardware Materials Trading'

export const bidderCompanies = [
  { id: 'mikata', name: 'MIKATA PRIME CORPORATION', assetPrefix: 'MIKATA CORPORATION', folder: 'MIKATA_CORPORATION', aliases: ['MIKATA CORPORATION', 'MIKATA'], address: 'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000', phone: '0917 129 2972 / 0926 253 0301', email: 'MikataPrime@gmail.com' },
  { id: 'builtech', name: 'BUILTECH SOLUTIONS', folder: 'BUILTECH_SOLUTIONS', aliases: ['BUILTECH'], logoFilename: 'BUILTECH_SOLUTIONS-logo.png', headerAddress: 'M. Vega St., Abalos Comp., Consolacion, Cagayan de Oro City', additionalOffice: 'Jamille St., Maria Cristina Subd., Brgy. San Miguel, Iligan City', phone: '0917 772 7893 / 0916 107 9932', email: 'Builtechcorporation@gmail.com', pcabRegistration: '46156' },
  { id: 'manotech', name: 'MANOTECH', folder: 'MANOTECH', aliases: [], logoFilename: 'MANOTECH-logo.png', address: 'Purok 4, Poblacion, Linamon, Lanao del Norte' },
  { id: 'MEGA_PLUTO', name: MEGA_PLUTO_DISPLAY_NAME, folder: 'MEGA_PLUTO', aliases: ['mega-pluto', 'MEGA PLUTO', 'MEGAPLUTO'], logoFilename: 'MEGA_PLUTO-logo-transparent.png', address: 'Kihare, Bukidnon, 8703', phone: '09751761554', email: 'megapluto.ph@gmail.com' },
]

const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
export function documentBidderName(setup) {
  if (setup?.bidderId === 'mikata' || ['MIKATA CORPORATION', 'MIKATA PRIME CORPORATION', 'MIKATA'].includes(normalize(setup?.bidderName))) {
    return 'MIKATA PRIME CORPORATION'
  }
  const isMegaPluto = [setup?.bidderId, setup?.bidderName].some(value => [
    'MEGA_PLUTO', 'MEGA-PLUTO',
    'MEGA PLUTO',
    'MEGAPLUTO',
    normalize(MEGA_PLUTO_DISPLAY_NAME),
  ].includes(normalize(value)))
  if (isMegaPluto) {
    const registeredName = String(setup.registeredBusinessName || setup.legalBusinessName || '').trim()
    return registeredName && !['MEGA PLUTO', 'MEGAPLUTO', 'MEGA_PLUTO', 'MEGA-PLUTO'].includes(normalize(registeredName))
      ? registeredName
      : MEGA_PLUTO_DISPLAY_NAME
  }
  return setup?.bidderName ?? ''
}

export function normalizeBidderSetup(setup) {
  if (!setup) return setup
  const bidderName = documentBidderName(setup)
  const company = bidderCompanies.find(entry => entry.id === 'MEGA_PLUTO')
  const isMegaPluto = [setup.bidderId, setup.bidderName].some(value => [company.id, company.name, ...company.aliases].some(alias => normalize(alias) === normalize(value)))
  const result = { ...setup, ...(isMegaPluto ? { bidderId: company.id } : {}), bidderName }
  for (const key of ['bidderProfiles', 'bidderBusinessAddresses', 'bidderTemplateVariants']) {
    if (!setup[key]) continue
    result[key] = { ...setup[key] }
    for (const [id, value] of Object.entries(setup[key])) {
      if ([company.id, company.name, ...company.aliases].some(alias => normalize(alias) === normalize(id))) {
        if (!Object.hasOwn(result[key], company.id)) result[key][company.id] = value
        if (id !== company.id) delete result[key][id]
      }
    }
  }
  const migrateUploads = uploads => uploads && Object.fromEntries(Object.entries(uploads).map(([name, file]) =>
    [name, file && [company.id, company.name, ...company.aliases].some(alias => normalize(alias) === normalize(file.bidderId))
      ? { ...file, bidderId: company.id } : file]))
  if (result.certificateUploads) result.certificateUploads = migrateUploads(result.certificateUploads)
  if (result.bidderProfiles?.[company.id]?.certificateUploads) {
    result.bidderProfiles[company.id] = { ...result.bidderProfiles[company.id],
      certificateUploads: migrateUploads(result.bidderProfiles[company.id].certificateUploads) }
  }
  return result
}
export function getBidderCompany(value) {
  const input = typeof value === 'object' && value !== null ? value.bidderId || value.bidderName : value
  // Empty legacy setup used the existing Mikata templates before a bidder was chosen.
  if (!normalize(input)) return bidderCompanies[0]
  const bidder = bidderCompanies.find(company => [company.id, company.folder, company.name, ...company.aliases].some(label => normalize(label) === normalize(input)))
  if (!bidder) throw new Error('No company asset configuration for bidder: ' + input)
  return bidder
}
