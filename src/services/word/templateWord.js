import { pdfTextToWord } from './pdfTextToWord'

export async function templateWord(options, number, policy = {}) {
  number = options.sectionNumber ?? number
  const entry=options.document
  if(!entry?.generate)throw new Error('Native Word template generator is missing for section '+number)
  const source=await entry.generate()
  try {
    return await pdfTextToWord(source,entry.name,number,(page,count)=>options.onProgress?.({completed:number-1,total:22,message:entry.name+' - editable page '+page+' of '+count}),policy)
  } finally { if(typeof source==='string'&&source.startsWith('blob:'))URL.revokeObjectURL(source) }
}
