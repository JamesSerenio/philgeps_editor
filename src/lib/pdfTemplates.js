import { getReferencePath, getStaticDocumentPath, getTemplatePath } from './bidderAssets'

// Keep legacy string properties, backed by paths that actually exist.
export function getPdfTemplates(bidder) {
  const template = name => getTemplatePath(name, bidder, { required: false })
  return {
    afs: getStaticDocumentPath(bidder, 'Audited Financial Statements.pdf', { required: false }),
    bidSecurity: template('Bid Security without table.pdf'),
    omnibus: template('Omnibus Sworn Statement.pdf'),
    bidocs: template('TABBING.pdf'),
    certificate: template('SECRETARY\u2019S CERTIFICATE .pdf'),
    initao: template('New_tab_and_pages_Initao_LGU_template.pdf'),
    nfcc: template('NFCC_Template.pdf'),
    slccCctv: template('SLCC_table_cctv.pdf'),
    slccStreetlight: template('SLCC_table_streetlight.pdf'),
    tax: getStaticDocumentPath(bidder, 'TAX_template.pdf', { required: false }),
    reference: getReferencePath('cctv2.pdf', bidder),
  }
}
export const pdfTemplates = getPdfTemplates()
