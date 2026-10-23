// Run against a local Vite server. No Supabase writes or real project mutations.
// PLAYWRIGHT_MODULE may point to an existing playwright-core installation.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import JSZip from 'jszip'

const modulePath = process.env.PLAYWRIGHT_MODULE
const { webkit } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright')
const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
const company = process.env.TEST_BIDDER === 'r-and-l'
  ? { id: 'r-and-l', name: 'R&L BUILDERS AND CONSTRUCTION SUPPLY', address: 'Brgy. Baloy Extension, Gusa, Cagayan de Oro City, Misamis Oriental, Philippines', logo: 'public/images/R_AND_L_BUILDERS/R&L Builders Construction Supply Logo.png' }
  : { id: 'manotech', name: 'MANOTECH', address: 'Purok 4, Poblacion, Linamon, Lanao del Norte', logo: 'public/images/MANOTECH/MANOTECH-logo.png' }
const output = '.tmp/' + company.id + '-validation'
const artifact = company.id + '-test'
fs.mkdirSync(output, { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  page.on('console', msg => { if (msg.type() === 'error' || msg.text().startsWith('VALIDATE')) console.log(msg.text()) })
  await page.route('**/__manotech_validation__', route => route.fulfill({ contentType: 'text/html', body: '<div id="preview"></div>' }))
  await page.goto((process.env.VITE_TEST_URL || 'http://127.0.0.1:5175') + '/__manotech_validation__')
  const result = await page.evaluate(async company => {
    const { PDFDocument, StandardFonts } = await import('/node_modules/.vite/deps/pdf-lib.js')
    const { getBidPackageDocuments, generateFullBidPackagePdf } = await import('/src/services/pdf/fullBidPackagePdf.js')
    const { generateFullBidPackageWord } = await import('/src/services/word/index.js')
    const { staticDocumentNames } = await import('/src/lib/bidderAssets.js')
    const { readPdfLayout } = await import('/src/services/word/pdfLayout.js')
    const { renderAsync } = await import('/node_modules/.vite/deps/docx-preview.js')
    const setup = { bidderId: company.id, bidderName: company.name, referenceNumber: company.id.toUpperCase() + '-TEST-2026',
      projectTitle: 'TEST SOLAR LIGHT PROJECT', date: '2026-10-05', closingDate: '2026-11-05',
      province: 'Lanao del Norte', municipality: 'Linamon', procuringEntity: 'MUNICIPALITY OF LINAMON',
      businessAddress: company.address, phone: 'TEST-CONTACT', email: 'test@example.invalid',
      submittedBy: 'TEST REPRESENTATIVE', designation: 'Authorized Representative', representativeResidence: 'TEST RESIDENCE',
      civilStatus: 'single', nationality: 'Filipino', corporateSecretaryName: 'TEST SECRETARY', companyPresidentName: 'TEST PRESIDENT',
      financials: { currentAssets: 100000, currentLiabilities: 20000, outstandingContracts: 5000 },
      manpower: 'TEST STAFF | Technician', ongoingEntries: { government: 'TEST OWNER | Supply | Lights | 50% | TEST AWARD | TEST DATES' },
      slccEntries: { cctv: { government: { ownerDetails: 'TEST CCTV OWNER', natureOfWork: 'Supply', description: 'TEST CCTV' } },
        streetlight: { government: { ownerDetails: 'TEST LIGHT OWNER', natureOfWork: 'Supply', description: 'TEST LIGHTS' } } } }
    // Test-only official-document stand-ins stay in memory and are never installed.
    const fixture = await PDFDocument.create(), p = fixture.addPage()
    const font = await fixture.embedFont(StandardFonts.Helvetica)
    p.drawText('TEST FIXTURE ONLY - NOT A GOVERNMENT CERTIFICATE', { x: 35, y: 750, size: 12, font })
    const bytes = await fixture.save()
    const encoded = btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    setup.certificateUploads = Object.fromEntries(staticDocumentNames.map(name => [name,
      { bidderId: company.id, name: 'test-only.pdf', dataUrl: 'data:application/pdf;base64,' + encoded }]))
    const technical = [{ id: 'test-item', itemNo: 1, quantity: 2, qty: 2, unit: 'pcs', description: 'Solar lights',
      specificationLines: [{ marker: 'None', text: 'TEST editable specification' }], totalPricePerUnit: 1000 }]
    const options = { setup, technical, schedule: [{ ...technical[0], deliverySchedule: '30 days' }],
      priceValues: { 'test-item': { totalPricePerUnit: 1000 } } }
    const reports = []
    const urls = {}
    for (const variant of ['old_default', 'initao_lgu']) {
      const opts = { ...options, omnibusVariant: variant, bidSecurityVariant: variant === 'old_default' ? 'without_table' : 'with_table', slccVariant: variant === 'old_default' ? 'streetlight' : 'cctv' }
      const docs = getBidPackageDocuments(opts)
      for (const entry of docs.filter(d => d.generate)) {
        console.log('VALIDATE ' + variant + ' ' + entry.name)
        const url = await entry.generate()
        const pdf = await PDFDocument.load(await (await fetch(url)).arrayBuffer())
        if (!pdf.getPageCount()) throw new Error('No pages: ' + entry.name)
        const layout = await readPdfLayout(url, entry.name)
        const visible = layout.flatMap(p => p.fragments).map(p => p.str).join(' ')
        if (/mikata|cleopas|jamilo|tingting|dedel|talingting|builtech|San Agustin|ZONE 13/i.test(visible)) throw new Error('Foreign company data: ' + variant + ' / ' + entry.name)
        reports.push({ variant, name: entry.name, pages: pdf.getPageCount(), sizes: pdf.getPages().map(p => [p.getWidth(), p.getHeight()]) })
        if (variant === 'old_default' && /Omnibus|NFCC|After Sales|Manpower|SECRETARY/.test(entry.name)) urls[entry.name] = url
        else URL.revokeObjectURL(url)
      }
      if (variant === 'old_default') {
        const pdfUrl = await generateFullBidPackagePdf(opts)
        urls.package = pdfUrl
        const word = await generateFullBidPackageWord({ ...opts, onProgress: progress => console.log('VALIDATE WORD ' + progress.message) })
        window.testDocx = word.blob
        await renderAsync(word.blob, document.getElementById('preview'), undefined, { inWrapper: true })
        if (!document.querySelector('#preview .docx-wrapper')) throw new Error('Word preview failed')
        window.testManifest = word.manifest
      }
    }
    window.testUrls = urls
    return { reports, urls, manifest: window.testManifest, wordPreviewPages: document.querySelectorAll('#preview section.docx').length }
  }, company)
  assert.ok(result.wordPreviewPages > 0)
  const docx = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await window.testDocx.arrayBuffer()))))
  fs.writeFileSync(output + '/' + artifact + '.docx', docx)
  const zip = await JSZip.loadAsync(docx)
  const xml = await zip.file('word/document.xml').async('string')
  const wordText = [...xml.matchAll(/<w:t[^>]*>(.*?)<\/w:t>/g)].map(x => x[1].replaceAll('&amp;', '&')).join(' ').replace(/\s+/g, ' ')
  assert.ok(wordText.includes(company.name))
  assert.ok(xml.includes('<w:tbl>'))
  assert.ok(xml.includes('landscape'))
  assert.ok(!/MIKATA|BUILTECH|CLEOPAS|JAMILO|TINGTING|DEDEL|TALINGTING/.test(xml))
  const logo = company.id === 'r-and-l'
    ? Buffer.from(await page.evaluate(async id => {
      const { getBidderLogo } = await import('/src/lib/bidderAssets.js')
      return Array.from((await getBidderLogo(id)).data)
    }, company.id))
    : fs.readFileSync(company.logo)
  let ownLogo = false
  for (const entry of Object.values(zip.files).filter(x => x.name.startsWith('word/media/') && !x.dir)) {
    if ((await entry.async('nodebuffer')).equals(logo)) ownLogo = true
  }
  assert.ok(ownLogo, 'DOCX embeds the supplied company logo')
  const pdf = Buffer.from(await page.evaluate(async () => Array.from(new Uint8Array(await (await fetch(window.testUrls.package)).arrayBuffer()))))
  fs.writeFileSync(output + '/' + artifact + '.pdf', pdf)
  await page.screenshot({ path: output + '/word-preview.png', fullPage: false })
  for (const format of ['pdf', 'docx']) {
    const download = page.waitForEvent('download')
    await page.evaluate(format => {
      const a = document.createElement('a')
      a.href = format === 'pdf' ? window.testUrls.package : URL.createObjectURL(window.testDocx)
      a.download = 'manotech-test.' + format
      a.click()
    }, format)
    const file = await download
    await file.saveAs(output + '/downloaded.' + format)
    assert.ok(fs.readFileSync(output + '/downloaded.' + format).equals(format === 'pdf' ? pdf : docx))
  }
  fs.writeFileSync(output + '/report.json', JSON.stringify(result, null, 2))
  console.log('PASS: both template variants, company isolation, PDF package, editable DOCX, Word preview, logo and identical preview/download bytes.')
} finally { await browser.close() }
