import { Document, Packer } from 'docx'
import { getBidPackageDocuments } from '../src/services/pdf/fullBidPackagePdf.js'
import { ongoingContractsWord } from '../src/services/word/ongoingContractsWord.js'

export async function makeOngoingWord(setup) {
  const entry = getBidPackageDocuments({ setup }).find(d => d.name.startsWith('Statement of Ongoing'))
  const sections = await ongoingContractsWord({ setup, document: entry, sectionNumber: 7 })
  return Packer.toBlob(new Document({ sections }))
}
