export const ongoingContractFields = [
  ['ownerDetails', "Owner's Name / Address / Telephone Number"],
  ['natureOfWork', 'Nature of Work'],
  ['description', 'Description'],
  ['percentage', "Bidder's Role (%)"],
  ['awardCompletion', 'Amount of Award / Amount at Completion / Duration'],
  ['dates', 'Date Awarded / Contract Effectivity / Date Completed'],
]

export const ongoingContractDefaults = Object.fromEntries(
  ongoingContractFields.map(([field]) => [field, 'NONE']),
)

export function getOngoingContractType(value = {}) {
  return value.ongoingContractType === 'private' ? 'private' : 'government'
}

// Supports projects saved before the sidebar editor, which used one pipe-delimited value.
export function getOngoingContractEntry(value = {}, type = getOngoingContractType(value)) {
  const saved = value?.ongoingEntries?.[type]
  if (typeof saved === 'string') {
    const parts = saved.split('|')
    return Object.fromEntries(
      ongoingContractFields.map(([field], index) => [field, parts[index]?.trim() || 'NONE']),
    )
  }
  return { ...ongoingContractDefaults, ...(saved && typeof saved === 'object' ? saved : {}) }
}

export function getOngoingContractEntries(value = {}, type = getOngoingContractType(value)) {
  const saved = value?.ongoingEntries?.[type]
  if (Array.isArray(saved)) {
    return saved.length
      ? saved.map(entry => ({ ...ongoingContractDefaults, ...(entry ?? {}) }))
      : [{ ...ongoingContractDefaults }]
  }
  return [getOngoingContractEntry(value, type)]
}
