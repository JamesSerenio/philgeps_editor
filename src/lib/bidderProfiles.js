export const bidderProfileFields = [
  'phone', 'email', 'submittedBy', 'designation', 'representativeResidence',
  'civilStatus', 'nationality', 'corporateSecretaryName', 'companyPresidentName',
  'financials', 'manpower', 'ongoingEntries', 'slccEntries', 'slccContractTypes',
  'boardMeetingDate', 'notarizationDate', 'additionalOffice', 'certificateUploads',
  'identityDocumentType', 'legalStructure',
  'corporateSecretaryNationality',
  'slccVariant',
  'registeredBusinessName', 'legalBusinessName',
]

// Declaration variants live outside Document Setup; snapshot them alongside the
// bidder profiles so company switching and existing JSON persistence agree.
export function restoreBidderVariants(previousSetup, nextSetup, bidSecurity, omnibus) {
  const previousId = previousSetup?.bidderId
  const nextId = nextSetup?.bidderId
  if (!previousId || !nextId || previousId === nextId) return { setup: nextSetup, bidSecurity, omnibus }
  const variants = { ...previousSetup.bidderTemplateVariants, ...nextSetup.bidderTemplateVariants,
    [previousId]: { bidSecurity: bidSecurity?.templateVariant ?? 'old_default', omnibus: omnibus?.templateVariant ?? 'old_default' } }
  const selected = variants[nextId] ?? (['mega-pluto'].includes(previousId) || ['mega-pluto'].includes(nextId)
    ? { bidSecurity: 'old_default', omnibus: 'old_default' }
    : variants[previousId])
  return { setup: { ...nextSetup, bidderTemplateVariants: variants },
    bidSecurity: { ...bidSecurity, templateVariant: selected.bidSecurity },
    omnibus: { ...omnibus, templateVariant: selected.omnibus } }
}

export function selectBidderProfile(setup, previousId, nextId) {
  const profiles = { ...(setup.bidderProfiles ?? {}) }
  const current = Object.fromEntries(bidderProfileFields.map(field => [field, setup[field] ?? '']))
  if (previousId) profiles[previousId] = current
  // A newly selected company, including from a removed legacy bidder, must
  // never inherit another company's people or private financial history.
  const selected = profiles[nextId] ?? (nextId !== previousId
    ? Object.fromEntries(bidderProfileFields.map(field => [field, ['financials', 'ongoingEntries', 'slccEntries', 'slccContractTypes'].includes(field) ? {} : '']))
    : current)
  return { ...selected, authorizedRepresentative: selected.submittedBy ?? '',
    representativeDesignation: selected.designation ?? '', bidderProfiles: profiles }
}
