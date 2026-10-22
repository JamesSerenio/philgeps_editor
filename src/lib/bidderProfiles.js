export const bidderProfileFields = [
  'phone', 'email', 'submittedBy', 'designation', 'representativeResidence',
  'civilStatus', 'nationality', 'corporateSecretaryName', 'companyPresidentName',
  'financials', 'manpower', 'ongoingEntries', 'slccEntries', 'slccContractTypes',
  'boardMeetingDate', 'notarizationDate', 'additionalOffice', 'certificateUploads',
]

export function selectBidderProfile(setup, previousId, nextId) {
  const profiles = { ...(setup.bidderProfiles ?? {}) }
  const current = Object.fromEntries(bidderProfileFields.map(field => [field, setup[field] ?? '']))
  if (previousId) profiles[previousId] = current
  // Entering/leaving Builtech or Manotech must never inherit another company's people or
  // financial history. Older projects retain their current company's details.
  const selected = profiles[nextId] ?? ((['builtech', 'manotech'].includes(nextId) || ['builtech', 'manotech'].includes(previousId))
    ? Object.fromEntries(bidderProfileFields.map(field => [field, ['financials', 'ongoingEntries', 'slccEntries', 'slccContractTypes'].includes(field) ? {} : '']))
    : current)
  return { ...selected, authorizedRepresentative: selected.submittedBy ?? '',
    representativeDesignation: selected.designation ?? '', bidderProfiles: profiles }
}
