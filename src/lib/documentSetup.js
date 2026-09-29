export const representatives = [
  { name: 'JHO ANN Q. CLEOPAS', designation: 'Authorized Representative' },
  { name: 'CARLOS RAFAEL A. JAMILO', designation: 'Authorized Representative' },
  { name: 'MARLJONE BLAIRE B. TINGTING', designation: 'Authorized Representative' },
]

export function createDocumentSetup(project, bid = {}, omnibus = {}) {
  // Preserve the canonical saved setup, including intentionally blank fields.
  if (bid.documentSetup) return bid.documentSetup
  const prior = (key) => bid[key] || omnibus[key] || ''
  return {
    province: prior('province') || project.area_of_delivery || project.province || '',
    municipality: prior('municipality') || project.lgu || project.municipality || '',
    projectTitle: prior('projectTitle') || project.title || project.project_title || project.projectTitle || '',
    referenceNumber: prior('referenceNumber') || project.reference_number || project.reference_no || project.referenceNumber || '',
    procuringEntity: prior('procuringEntity') || project.procuring_entity || project.entity || '',
    date: prior('date') || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()),
    bidderName: prior('bidderName'), businessAddress: prior('companyAddress'),
    submittedBy: prior('authorizedRepresentative'), designation: bid.representativeDesignation || omnibus.designation || '',
  }
}

export function setupProject(setup) {
  return { title: setup.projectTitle, reference_number: setup.referenceNumber, procuring_entity: setup.procuringEntity, lgu: setup.municipality, area_of_delivery: setup.province }
}

// Old Schedule drafts had independent item IDs. Align once on load; thereafter
// use stable Technical Specs IDs so deleting/reordering cannot move delivery values.
export function alignScheduleItems(technical, schedule) {
  return schedule.map((item) => {
    if (item.sharedItemId) return item
    const master = technical.find((row) => row.id === item.id) || technical.find((row) => row.itemNo === item.itemNo)
    return master ? { ...item, id: master.id, sharedItemId: master.id } : item
  })
}
export function sharedScheduleItems(technical, schedule) {
  return technical.map((item) => ({
    id: item.id, sharedItemId: item.id, itemNo: item.itemNo, qty: item.qty, unit: item.unit,
    specificationLines: item.specificationLines.map(({ id, text }) => ({ id, text })),
    deliveryPeriod: schedule.find((row) => row.id === item.id)?.deliveryPeriod || '',
  }))
}
