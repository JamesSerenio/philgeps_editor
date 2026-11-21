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
    const { generateOngoingContractsPreview } = await import('/src/services/pdf/ongoingContractsPdf.js')
    const { readPdfLayout } = await import('/src/services/word/pdfLayout.js')
    const { getDocument, GlobalWorkerOptions } = await import('/node_modules/.vite/deps/pdfjs-dist.js')
    GlobalWorkerOptions.workerSrc = '/node_modules/pdfjs-dist/build/pdf.worker.min.mjs'
    const titles = ['Supply of Construction Materials', '27K00033 - Construction of By-Pass and Diversion Roads, CDO-Opol-El Salvador-Alubijid-Laguindingan Airport (Pueblo de Oro/CDO Airport to Jct. BCIR Laguindingan) Mountain Diversion Road, Brgy. Bolisong Section, Sta. 22+672 - Sta. 23+992, El Salvador City, Misamis Oriental']
    const results = []
    document.body.innerHTML = ''
    for (const [index, projectTitle] of titles.entries()) {
      const url = await generateOngoingContractsPreview({ bidderId: 'MEGA_PLUTO', bidderName: 'Megapluto Electrical Supply & Hardware Materials Trading', procuringEntity: 'DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS - REGION X', projectTitle, referenceNumber: '112705', businessAddress: 'Kihare, Bukidnon, 8703', date: '2026-11-20' })
      const layout = (await readPdfLayout(url, 'Ongoing Contracts'))[0]
      const titleLabel = layout.fragments.find(f => f.str === 'PROJECT TITLE')
      const reference = layout.fragments.find(f => f.str === '112705')
      const lines = layout.fragments.filter(f => f.x >= 299 && f.y >= titleLabel.y - .1 && f.y < reference.y - 5)
      if (lines.map(f => f.str).join(' ') !== projectTitle.toUpperCase()) throw new Error('Project title text lost')
      if (!lines.every(f => f.size >= 10 && f.x + f.width <= layout.width - 35)) throw new Error('Title too small or overflowing')
      if (Math.max(...lines.map(f => f.bottom)) >= reference.top) throw new Error('Title overlaps reference')
      const heading = layout.fragments.find(f => f.str.startsWith('STATEMENT OF ALL ITS'))
      if (reference.bottom >= heading.top - 3) throw new Error('Reference overlaps statement heading')
      if (!layout.fragments.some(f => f.str === 'REFERENCE NUMBER' && Math.abs(f.y - reference.y) < .1)) throw new Error('Reference label misaligned')
      const task = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()) })
      const pdf = await task.promise, first = await pdf.getPage(1), viewport = first.getViewport({ scale: 1.25 })
      const canvas = document.createElement('canvas')
      canvas.id = 'ongoing-' + index; canvas.width = viewport.width; canvas.height = viewport.height
      canvas.style.cssText = 'display:block;width:' + viewport.width + 'px;height:' + viewport.height + 'px;max-width:none'
      document.body.append(canvas)
      await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
      results.push({ title: index ? 'long' : 'short', size: lines[0].size, lines: lines.length, referenceY: reference.y, pages: pdf.numPages })
      await task.destroy()
      URL.revokeObjectURL(url)
    }
    const { makeOngoingWord } = await import('/tests/ongoing-word-harness.mjs')
    const { renderAsync } = await import('/node_modules/.vite/deps/docx-preview.js')
    const setup = { bidderId: 'MEGA_PLUTO', bidderName: 'Megapluto Electrical Supply & Hardware Materials Trading',
      procuringEntity: 'DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS - REGION X', projectTitle: titles[1], referenceNumber: '112705',
      businessAddress: 'Kihare, Bukidnon, 8703', date: '2026-11-20' }
    const blob = await makeOngoingWord(setup)
    const preview = document.createElement('div')
    document.body.append(preview)
    await renderAsync(blob, preview)
    const wordText = preview.textContent.replace(/\s+/g, '')
    if (!wordText.includes(titles[1].toUpperCase().replace(/\s+/g, '')) || !wordText.includes('112705')) throw new Error('Word title or reference text lost')
    if (preview.querySelectorAll('section.docx').length !== 1) throw new Error('Expected one landscape Word page')
    return results
  })
  assert.equal(results.length, 2)
  await page.locator('#ongoing-1').screenshot({ path: output + '/ongoing-long-title.png' })
  fs.writeFileSync(output + '/ongoing-layout-report.json', JSON.stringify(results, null, 2))
  console.log('PASS readable ongoing contract titles, complete text, reference alignment, heading spacing and PDF rendering:', results)
} finally { await browser.close() }
