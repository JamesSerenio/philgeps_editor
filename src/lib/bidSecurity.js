export function createInitialBidSecurityState(project = {}) {
  return {
    templateVariant: 'old_default',

    // auto values from Document Setup / project
    projectTitle: project?.projectTitle ?? '',
    referenceNumber: project?.referenceNumber ?? '',
    procuringEntity: project?.procuringEntity ?? '',
    municipality: project?.municipality ?? '',
    province: project?.province ?? '',
    date: project?.date ?? '',
    bidderName: project?.bidderName ?? '',
    companyAddress: project?.businessAddress ?? '',
    authorizedRepresentative: project?.submittedBy ?? '',
    representativeDesignation: project?.designation ?? '',
  }
}