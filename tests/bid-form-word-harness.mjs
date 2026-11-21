import { Document, Packer } from 'docx'
import { bidFormWord } from '../src/services/word/bidFormWord.js'

export async function makeBidFormWord(setup) {
  const sections = await bidFormWord({ setup, technical: [{ id: 'test', qty: 2 }], priceValues: { test: { price: 1000 } } })
  return Packer.toBlob(new Document({ sections }))
}
