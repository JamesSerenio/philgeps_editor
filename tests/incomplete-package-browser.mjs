// Real browser generation with absent certificates and incomplete setup.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
try {
  const page = await browser.newPage()
  await page.goto(process.env.VITE_TEST_URL || 'http://127.0.0.1:5175')
  const results = await page.evaluate(async () => {
    const { getBidPackageDocuments, generateFullBidPackagePdf } = await import('/src/services/pdf/fullBidPackagePdf.js')
    const { generateFullBidPackageWord } = await import('/src/services/word/index.js')
    const { readPdfLayout } = await import('/src/services/word/pdfLayout.js')
    const cases = []
    for (const variant of ['old_default', 'initao_lgu']) {
      const options = { setup: { bidderId: 'r-and-l', bidderName: 'R&L BUILDERS AND CONSTRUCTION SUPPLY',
        referenceNumber: 'TEST', projectTitle: 'TEST SOLAR PROJECT', procuringEntity: 'TEST MUNICIPALITY',
        businessAddress: 'TEST R&L ADDRESS', date: '2026-10-23', closingDate: '2026-11-05', municipality: 'Linamon', province: 'Lanao del Norte', submittedBy: 'TEST REPRESENTATIVE', designation: 'Authorized Representative' }, omnibusVariant: variant }
      const names = getBidPackageDocuments(options).map(d => d.name)
      const progress = []
      const pdfUrl = await generateFullBidPackagePdf({ ...options, onProgress: p => progress.push(p.message) })
      const layout = await readPdfLayout(pdfUrl, 'Incomplete package')
      const text = layout.flatMap(p => p.fragments).map(t => t.str).join(' ')
      if (!text.includes('DOCUMENT NOT YET AVAILABLE') || !text.includes('SUMMARY OF BID PRICES')) throw new Error('Missing placeholder or later valid document')
      if (progress.length !== names.length || !progress.at(-1).startsWith(names.at(-1))) throw new Error('PDF order changed')
      const word = await generateFullBidPackageWord(options)
      if (JSON.stringify(word.manifest.map(d => d.name)) !== JSON.stringify(names)) throw new Error('Word order changed')
      const missing = word.manifest.filter(d => d.missing)
      if (missing.length < 7 || !missing.some(d => d.name === 'SEC Registration Certificate.pdf') || word.manifest.at(-1).missing) throw new Error('Missing certificates prevented valid later Word section')
      cases.push({ variant, count: names.length, missing: missing.length, pdfPages: layout.length, wordBytes: word.blob.size })
      URL.revokeObjectURL(pdfUrl)
    }
    // Missing project fields/reference must also preserve every section.
    const empty = { setup: { bidderId: 'r-and-l', bidderName: 'R&L BUILDERS AND CONSTRUCTION SUPPLY' } }
    const url = await generateFullBidPackagePdf(empty)
    const pages = await readPdfLayout(url, 'Incomplete setup')
    if (!pages.some(p => p.fragments.some(t => t.str.includes('DOCUMENT NOT YET AVAILABLE')))) throw new Error('No placeholders for incomplete setup')
    const word = await generateFullBidPackageWord(empty)
    if (word.manifest.length !== 23) throw new Error('Incomplete setup changed Word section count')
    URL.revokeObjectURL(url)
    return cases
  })
  assert.equal(results.length, 2)
  console.log('PASS incomplete PDF/Word packages retain default/Initao order, missing slots, and later valid sections:', results)
} finally { await browser.close() }
