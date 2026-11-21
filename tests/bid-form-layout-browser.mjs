import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const { webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
const output = '.tmp/mega-pluto-validation'
fs.mkdirSync(output, { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 1150, height: 850 } })
  await page.goto(process.env.VITE_TEST_URL || 'http://127.0.0.1:5175')
  const results = await page.evaluate(async () => {
    const { generateBidFormPreview } = await import('/src/services/pdf/bidFormPdf.js')
    const { readPdfLayout } = await import('/src/services/word/pdfLayout.js')
    const { getDocument, GlobalWorkerOptions } = await import('/node_modules/.vite/deps/pdfjs-dist.js')
    GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
    const titles = ['Supply of Construction Materials', '27K00033 - Construction of By-Pass and Diversion Roads, CDO-Opol-El Salvador-Alubijid-Laguindingan Airport (Pueblo de Oro/CDO Airport to Jct. BCIR Laguindingan) Mountain Diversion Road, Brgy. Bolisong Section, Sta. 22+672 - Sta. 23+992, El Salvador City, Misamis Oriental']
    const results = []
    document.body.innerHTML = ''
    for (const [index, projectTitle] of titles.entries()) {
      const url = await generateBidFormPreview({ bidderId: 'MEGA_PLUTO', bidderName: 'Megapluto Electrical Supply & Hardware Materials Trading', procuringEntity: 'DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS - REGION X', projectTitle, referenceNumber: '112705', businessAddress: 'Kihare, Bukidnon, 8703', date: '2026-11-20', submittedBy: 'TEST REPRESENTATIVE', items: [{id:'test',qty:2}], priceValues:{test:{price:1000}} })
      const layout = (await readPdfLayout(url, 'Ongoing Contracts'))[0]
      const lines=layout.fragments.filter(f=>f.x>=107&&f.y>246&&f.y<285)
      if(lines.map(f=>f.str).join(' ')!==projectTitle)throw Error('Bid Form title text lost')
      if(!lines.every(f=>f.size>=9.5&&f.x+f.width<=544))throw Error('Title too small or overflowing')
      const next=layout.fragments.find(f=>f.str.startsWith('I/We offer to execute'))
      if(Math.max(...lines.map(f=>f.bottom))>=next.top-2)throw Error('Title overlaps clause b')
      const task = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()) })
      const pdf = await task.promise, first = await pdf.getPage(1), viewport = first.getViewport({ scale: 1.25 })
      const canvas = document.createElement('canvas')
      canvas.id = 'bid-form-' + index; canvas.width = viewport.width; canvas.height = viewport.height
      canvas.style.cssText = 'display:block;width:' + viewport.width + 'px;height:' + viewport.height + 'px;max-width:none'
      document.body.append(canvas)
      await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      results.push({ title: index ? 'long' : 'short', size: lines[0].size, lines: lines.length, pages: pdf.numPages })
      await task.destroy()
      URL.revokeObjectURL(url)
    }
    const { makeBidFormWord } = await import('/tests/bid-form-word-harness.mjs')
    const { renderAsync } = await import('/node_modules/.vite/deps/docx-preview.js')
    const blob = await makeBidFormWord({ bidderId: 'MEGA_PLUTO', bidderName: 'Megapluto Electrical Supply & Hardware Materials Trading',
      procuringEntity: 'DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS - REGION X', projectTitle: titles[1], referenceNumber: '112705',
      businessAddress: 'Kihare, Bukidnon, 8703', date: '2026-11-20', submittedBy: 'TEST REPRESENTATIVE' })
    const preview = document.createElement('div')
    document.body.append(preview)
    await renderAsync(blob, preview)
    const wordText = preview.textContent.replace(/\s+/g, '')
    if (!wordText.includes(titles[1].replace(/\s+/g, '')) || !wordText.includes('112705')) throw new Error('Word title or reference text lost')
    if (preview.querySelectorAll('section.docx').length !== 2) throw new Error('Expected two Word pages')
    return results
  })
  assert.equal(results.length, 2)
  await page.locator('#bid-form-1').screenshot({ path: output + '/bid-form-long-title.png' })
  fs.writeFileSync(output + '/bid-form-layout-report.json', JSON.stringify(results, null, 2))
  console.log('PASS readable Bid Form titles, complete text, clause spacing and PDF rendering:', results)
} finally { await browser.close() }
