// Stable IDs and folder names are independent of labels saved by older projects.
export const bidderCompanies = [
  { id: 'mikata', name: 'MIKATA CORPORATION', folder: 'MIKATA_CORPORATION', aliases: ['MIKATA PRIME CORPORATION', 'MIKATA'], address: 'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000', phone: '0917 129 2972 / 0926 253 0301', email: 'MikataPrime@gmail.com' },
  { id: 'magnus', name: 'MAGNUS ELECTRONICS AND ELECTRICAL SUPPLIES TRADING', folder: 'MAGNUS', aliases: ['MAGNUS'] },
  { id: 'builtech', name: 'BUILTECH SOLUTIONS', folder: 'BUILTECH_SOLUTIONS', aliases: ['BUILTECH'] },
  { id: 'fjq', name: 'FJQ CONSTRUCTION', folder: 'FJQ_CONSTRUCTION', aliases: ['FJQ'] },
  { id: 'golden-m', name: 'GOLDEN M ELECTRICAL AND INDUSTRIAL SUPPLIES AND TRADING', folder: 'GOLDEN_M', aliases: ['GOLDEN M'] },
  { id: 'manotech', name: 'MANOTECH', folder: 'MANOTECH', aliases: [] },
  { id: 'r-and-l', name: 'R&L BUILDERS AND CONSTRUCTION SUPPLY', folder: 'R_AND_L_BUILDERS', aliases: ['R&L BUILDERS', 'R AND L BUILDERS'] },
  { id: 'migoy-bugoy', name: 'MIGOY BUGOY ENTERPRISES', folder: 'MIGOY_BUGOY', aliases: ['MIGOY BUGOY'] },
  { id: 'wdc', name: 'WDC BUILDERS & SUPPLIES', folder: 'WDC_BUILDERS', aliases: ['WDC BUILDERS', 'WDC'] },
  { id: 'mega-pluto', name: 'MEGA PLUTO', folder: 'MEGA_PLUTO', aliases: [] },
]

const normalize = value => String(value ?? '').trim().replace(/\s+/g, ' ').toUpperCase()
export function getBidderCompany(value) {
  const input = typeof value === 'object' && value !== null ? value.bidderId || value.bidderName : value
  // Empty legacy setup used the existing Mikata templates before a bidder was chosen.
  if (!normalize(input)) return bidderCompanies[0]
  const bidder = bidderCompanies.find(company => [company.id, company.folder, company.name, ...company.aliases].some(label => normalize(label) === normalize(input)))
  if (!bidder) throw new Error('No company asset configuration for bidder: ' + input)
  return bidder
}
