export const bidderProfileFields = [
  'phone', 'email', 'submittedBy', 'designation', 'representativeResidence',
  'civilStatus', 'nationality', 'corporateSecretaryName', 'companyPresidentName',
  'financials', 'manpower', 'ongoingEntries', 'slccEntries', 'slccContractTypes',
]

export function selectBidderProfile(setup, previousId, nextId) {
  const profiles = { ...(setup.bidderProfiles ?? {}) }
  const current = Object.fromEntries(bidderProfileFields.map(field => [field, setup[field] ?? '']))
  if (previousId) profiles[previousId] = current
  // Entering/leaving Builtech must never inherit another company's people or
  // financial history. Older projects retain their current company's details.
  const selected = profiles[nextId] ?? ((nextId === 'builtech' || previousId === 'builtech')
    ? Object.fromEntries(bidderProfileFields.map(field => [field, ['financials', 'ongoingEntries', 'slccEntries', 'slccContractTypes'].includes(field) ? {} : '']))
    : current)
  return { ...selected, bidderProfiles: profiles }
}
