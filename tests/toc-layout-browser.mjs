import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const { webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
const output = '.tmp/mega-pluto-validation'
fs.mkdirSync(output, { recursive: true })
try {
  const page = await browser.newPage({ viewport: { width: 850, height: 1150 } })
  await page.goto(process.env.VITE_TEST_URL || 'http://127.0.0.1:5175')
  const results = await page.evaluate(async () => {
    const { generateTableOfContentsPreview } = await import('/src/services/pdf/tableOfContentsPdf.js')
    const { readPdfLayout } = await import('/src/services/word/pdfLayout.js')
    const { getDocument, GlobalWorkerOptions } = await import('/node_modules/.vite/deps/pdfjs-dist.js')
    GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
    const titles = ['Supply of Construction Materials', '27K00033 - Construction of By-Pass and Diversion Roads, CDO-Opol-El Salvador-Alubijid-Laguindingan Airport (Pueblo de Oro/CDO Airport to Jct. BCIR Laguindingan) Mountain Diversion Road, Brgy. Bolisong Section, Sta. 22+672 - Sta. 23+992, El Salvador City, Misamis Oriental']
    const results = []
    document.body.innerHTML = ''
    for (const variant of ['old_default', 'initao_lgu']) {
      for (const [index, projectTitle] of titles.entries()) {
        const url = await generateTableOfContentsPreview({ bidderId: 'MEGA_PLUTO', bidderName: 'MEGA PLUTO', province: 'Misamis Oriental', municipality: 'Alubijid', projectTitle, date: '2026-11-20', tableOfContentsVariant: variant })
        const layout = (await readPdfLayout(url, 'Table of Contents'))[0]
        const titleY = layout.fragments.find(f => f.str === 'Project').y
        const date = layout.fragments.find(f => f.str === 'November 20, 2026')
        const bidder = layout.fragments.find(f => f.str.startsWith('Megapluto Electrical'))
        const lines = layout.fragments.filter(f => f.x > 179 && f.y >= titleY - .1 && f.y < date.y - 5)
        const joined = lines.map(f => f.str).join(' ')
        if (joined !== projectTitle) throw new Error('Title text lost: ' + variant + ' / ' + index + ': ' + joined)
        if (!lines.every(f => f.size >= 11 && f.x + f.width <= layout.width - 35)) throw new Error('Title too small or overflowing: ' + variant)
        if (Math.max(...lines.map(f => f.bottom)) >= date.top) throw new Error('Title overlaps date')
        if (date.bottom >= bidder.top || bidder.bottom >= (variant === 'initao_lgu' ? 190 : 229)) throw new Error('Header overlaps bidder or checklist')
        for (const [label, baseline] of [['Date', date.y], ['Name of Bidder', bidder.y]]) {
          if (!layout.fragments.some(f => f.str === label && Math.abs(f.y - baseline) < .1)) throw new Error('Misaligned label: ' + label)
        }
        const task = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()) })
        const pdf = await task.promise
        const first = await pdf.getPage(1), viewport = first.getViewport({ scale: 1.25 })
        const canvas = document.createElement('canvas')
        canvas.id = variant + '-' + index
        canvas.width = viewport.width; canvas.height = viewport.height
        canvas.style.cssText = 'display:block;width:' + viewport.width + 'px;height:' + viewport.height + 'px;max-width:none'
        document.body.append(canvas)
        await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        results.push({ variant, title: index ? 'long' : 'short', size: lines[0].size, lines: lines.length, dateY: date.y, bidderY: bidder.y, pages: pdf.numPages })
        await task.destroy()
        URL.revokeObjectURL(url)
      }
    }
    return results
  })
  assert.equal(results.length, 4)
  for (const variant of ['old_default', 'initao_lgu']) await page.locator('canvas#' + variant + '-1').screenshot({ path: output + '/toc-' + variant + '-long.png' })
  fs.writeFileSync(output + '/toc-layout-report.json', JSON.stringify(results, null, 2))
  console.log('PASS short/long Table of Contents titles, both variants, readable size, full text, aligned labels and PDF rendering:', results)
} finally { await browser.close() }
