import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getBidderCompany, getTemplatePath, fetchAsset } from '../../lib/bidderAssets'
import { formatLongDate } from '../../lib/documentSetup'

// Only applicant-entered Builtech data is placed in the cleared private tables.
// A missing value stays blank; Mikata history and financial examples are never used.
export async function fillBuiltechTable(document, setup, kind) {
  if (getBidderCompany(setup).id !== 'builtech') return
  const page = document.getPage(0), height = page.getHeight()
  const font = await document.embedFont(StandardFonts.TimesRoman)
  const text = (value, x, top, width, size = 10) => {
    const lines = String(value ?? '').replace(/[\r\n]+/g, ' ').trim().split('|')
    for (const [index, line] of lines.entries()) {
      let actual = size
      while (actual > 5 && font.widthOfTextAtSize(line.trim(), actual) > width) actual -= .2
      if (line.trim()) page.drawText(line.trim(), { x, y: height - top - index * (size + 1), size: actual, font, color: rgb(0, 0, 0) })
    }
  }
  if (kind === 'nfcc') {
    const finance = setup.financials ?? {}
    const names = ['currentAssets', 'currentLiabilities', 'outstandingContracts']
    if (names.every(key => String(finance[key] ?? '').trim())) {
      const numbers = names.map(key => Number(String(finance[key]).replace(/,/g, '')))
      if (numbers.some(value => !Number.isFinite(value) || value < 0)) throw new Error('BUILTECH NFCC: enter valid non-negative financial amounts.')
      const [assets, liabilities, outstanding] = numbers
      const working = assets - liabilities
      const amounts = [assets, liabilities, working, working * 15, outstanding, working * 15 - outstanding]
      amounts.forEach((amount, index) => text(amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 408, [431,451,472,492,520,567][index], 123, 12))
    }
  }
  if (kind === 'manpower') {
    const people = String(setup.manpower ?? '').split('\n').filter(line => line.trim())
    if (people.length > 5) throw new Error('BUILTECH manpower template supports five rows. Enter up to five names and positions.')
    people.forEach((person, index) => {
      const [name, position] = person.split('|')
      text(name, 142, 327 + index * 28.7, 205, 11)
      text(position, 365, 327 + index * 28.7, 170, 11)
    })
  }
  if (kind === 'ongoing') {
    for (const [row, type] of ['government','private'].entries()) {
      const saved = String(setup.ongoingEntries?.[type] ?? '').trim()
      const cells = saved ? saved.split('|').slice(0,6) : Array(6).fill('NONE')
      const positions = saved ? [145,250,355,458,557,660] : [174,277,381,484,586,691]
      cells.forEach((cell, index) =>
        text(cell, positions[index], 376 + row * 16.5, 94, saved ? 8 : 11))
    }
  }
}

export async function generateBuiltechSlccPreview(setup, variant) {
  const response = await fetchAsset(getTemplatePath('SLCC_table_' + variant + '.pdf', setup))
  const document = await PDFDocument.load(await response.arrayBuffer())
  const page = document.getPage(0), h = page.getHeight()
  const font = await document.embedFont(StandardFonts.TimesRoman)
  const bold = await document.embedFont(StandardFonts.TimesRomanBold)
  const draw = (value,x,top,width,size=11,weight=font) => {
    let actual=size; const lines=String(value??'').split(/\r?\n/)
    for (const [index,line] of lines.entries()) {
      while(actual>5 && weight.widthOfTextAtSize(line,actual)>width)actual-=.2
      if(line)page.drawText(line,{x,y:h-top-index*12,font:weight,size:actual})
    }
  }
  const clear=(x,top,width,height)=>page.drawRectangle({x,y:h-top-height,width,height,color:rgb(1,1,1)})
  const cctv=variant==='cctv'
  clear(28,30,790,54)
  draw('NAME OF THE PROCURING ENTITY : '+(setup.procuringEntity??''),36,47,765)
  draw('PROJECT TITLE : '+(setup.projectTitle??''),36,63,765)
  draw('REFERENCE NUMBER : '+(setup.referenceNumber??''),36,79,765)
  clear(64,117,750,38)
  draw('REGISTERED BUSINESS NAME OF BIDDER : '+(setup.bidderName??''),68,133,730,11,bold)
  draw('BUSINESS ADDRESS : '+(setup.businessAddress??''),68,150,730)
  const type=setup.slccContractTypes?.[variant]==='private'?'private':'government'
  const entry=setup.slccEntries?.[variant]?.[type]??{}
  const fields=[entry.ownerDetails,entry.natureOfWork,entry.description,entry.percentage,entry.awardCompletion,entry.dates]
  fields.forEach((value,index)=>draw(value,[152,294,376,513,581,696][index],cctv?(type==='private'?337:252):(type==='private'?346:284),[132,65,124,48,103,108][index],9))
  const top=cctv?410:432
  clear(cctv?140:285,top-8,430,cctv?76:32)
  draw(setup.submittedBy, cctv?144:288,top+10,390,11,bold)
  if(cctv){draw(setup.designation,144,452,390);draw(setup.bidderName,144,468,390,11,bold);draw(formatLongDate(setup.date),144,484,390)}
  else draw('Date: '+formatLongDate(setup.date),72,461,470)
  return URL.createObjectURL(new Blob([await document.save()],{type:'application/pdf'}))
}
