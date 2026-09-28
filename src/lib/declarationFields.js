export function initialDeclaration(project = {}) {
  return {
    templateVariant: 'old',
    projectTitle: String(project.title || project.project_title || project.projectTitle || ''),
    referenceNumber: String(project.reference_number || project.reference_no || project.referenceNumber || ''),
    procuringEntity: String(project.procuring_entity || project.entity || ''),
    municipality: String(project.lgu || project.municipality || ''),
    province: String(project.area_of_delivery || project.province || ''),
    bidderName: '', authorizedRepresentative: '', companyAddress: '', date: '',
    representativeAddress: '', civilStatus: '', signingPlace: '',
    notaryName: '', notarizationDate: '', competentEvidence: '', identificationNumber: '',
    witnessName: '', documentNumber: '', pageNumber: '', bookNumber: '', seriesYear: '',
  }
}

export const declarationGroups = [
  ['Project Information', [['projectTitle', 'Project title', 'textarea'], ['referenceNumber', 'Reference number'], ['procuringEntity', 'Procuring entity'], ['municipality', 'Municipality'], ['province', 'Province / delivery area']]],
  ['Bidder Information', [['bidderName', 'Bidder name'], ['companyAddress', 'Company address', 'textarea']]],
  ['Representative', [['authorizedRepresentative', 'Authorized representative'], ['DESIGNATION', 'Designation'], ['civilStatus', 'Civil status'], ['representativeAddress', 'Representative address', 'textarea'], ['date', 'Date', 'date'], ['signingPlace', 'Place of signing']]],
  ['Notarial / Jurat', [['notaryName', 'Notary name'], ['notarizationDate', 'Notarization date', 'date'], ['competentEvidence', 'Competent evidence of identity'], ['identificationNumber', 'Identification number'], ['witnessName', 'Witness name'], ['documentNumber', 'Document No.'], ['pageNumber', 'Page No.'], ['bookNumber', 'Book No.'], ['seriesYear', 'Series year']]],
]
