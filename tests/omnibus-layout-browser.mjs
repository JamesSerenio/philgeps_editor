import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'
const require = createRequire(path.join(os.tmpdir(), 'philgeps-premium-browser-tools', 'package.json'))
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require('playwright')
const runtime = `
import { generateOmnibusPreview } from '/src/services/pdf/omnibusPdf.js'
import { readPdfLayout, collectPdfLines } from '/src/services/word/pdfLayout.js'
import { omnibusWord } from '/src/services/word/omnibusWord.js'
import { Document, Packer } from 'docx'
import { renderAsync } from 'docx-preview'
import * as pdfjs from 'pdfjs-dist'
window.checkOmnibus = async () => {
  const title = 'PROCUREMENT OF CONSTRUCTION MATERIALS FOR IMPROVEMENT OF MUNICIPAL BUILDING (MUNICIPAL HEALTH CENTER)'
  const results = []
  for (const variant of ['old_default', 'initao_lgu']) {
    for (const projectTitle of ['SHORT PROJECT TITLE', title, title + ' INCLUDING ELECTRICAL, PLUMBING AND FINISHING WORKS FOR THE MUNICIPAL FACILITY']) {
      const setup = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', businessAddress: 'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000',
        submittedBy: 'JHO ANN Q. CLEOPAS', designation: 'Authorized Representative', projectTitle, referenceNumber: '13309241',
        procuringEntity: 'MUNICIPALITY OF SUMILAO, BUKIDNON', municipality: 'Sumilao', province: 'Bukidnon', date: '2026-10-28', templateVariant: variant }
      const url = await generateOmnibusPreview(setup)
      const layout = await readPdfLayout(url, 'Omnibus')
      const lines = collectPdfLines(layout[0].fragments)
      const lineText = line => line.parts.map(part => part.str).join(' ').replace(/\\s+/g, ' ')
      const start = lines.findIndex(line => /I am granted full power/.test(lineText(line)))
      const end = lines.findIndex((line, index) => index >= start && /whichever is applicable;/.test(lineText(line)))
      const paragraph = lines.slice(start, end + 1)
      if (!paragraph.length) throw new Error('Project paragraph missing')
      for (let i = 1; i < paragraph.length; i++) {
        if (paragraph[i - 1].bottom > paragraph[i].top + .2) throw new Error('Overlapping project lines')
      }
      const last = paragraph.at(-1)

      const text = paragraph.map(line => line.parts.map(part => part.str).join(' ')).join(' ').replace(/\\s+/g, ' ')
      if (!text.includes(projectTitle)) throw new Error('Project title lost or truncated')
      if (!text.includes("whichever is applicable;")) throw new Error('End of project paragraph lost')
      const clause = layout[0].fragments.find(part => /blacklisted/.test(part.str))
      if (!clause || clause.top <= last.bottom) throw new Error('Following clause overlaps')
      const parts = await omnibusWord({ setup, document: { name: 'Omnibus.pdf', generate: () => generateOmnibusPreview(setup) } })
      const blob = await Packer.toBlob(new Document({ sections: parts }))
      const mount = document.createElement('div'); document.body.append(mount)
      await renderAsync(blob, mount)
      const wordText = mount.textContent.replace(/\\s+/g, ' ')
      if (!wordText.replace(/\\s/g, '').includes(projectTitle.replace(/\\s/g, '')) || !wordText.replace(/\\s/g, '').includes('whicheverisapplicable;')) throw new Error('Word content missing: ' + variant + ' ' + projectTitle + ' TEXT ' + wordText.slice(0, 1700))
      mount.remove()
      if (variant === 'old_default' && projectTitle === title) {
        const pdf = await pdfjs.getDocument({ data: await (await fetch(url)).arrayBuffer() }).promise
        const page = await pdf.getPage(1), viewport = page.getViewport({ scale: 1.4 })
        const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        window.omnibusScreenshot = canvas.toDataURL(); await pdf.cleanup()
      }
      results.push({ variant, titleLength: projectTitle.length, pages: layout.length, projectLines: paragraph.length,
        paragraphBottom: last.bottom, clauseTop: clause.top, pdfNoOverlap: true, wordVerified: true })
      URL.revokeObjectURL(url)
    }
  }
  return results
}
`
const server = await createServer({ server: { host: '127.0.0.1', port: 0, ws: false }, plugins: [{
  name: 'omnibus-regression-runtime',
  resolveId(id) { if (id === '/__omnibus_layout_runtime.js') return '\0omnibus-layout-runtime' },
  load(id) { if (id === '\0omnibus-layout-runtime') return runtime },
}] })
let browser
try {
  await server.listen()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage()
  await page.route('**/__omnibus_layout_check', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto(base + '/__omnibus_layout_check')
  await page.addScriptTag({ type: 'module', url: base + '/__omnibus_layout_runtime.js' })
  await page.waitForFunction(() => window.checkOmnibus)
  const results = await page.evaluate(() => window.checkOmnibus())
  assert.equal(results.length, 6)
  assert.ok(results.every(result => result.pdfNoOverlap && result.wordVerified))
  const folder = path.join(os.tmpdir(), 'philgeps-omnibus-layout-validation')
  fs.mkdirSync(folder, { recursive: true })
  fs.writeFileSync(path.join(folder, 'results.json'), JSON.stringify(results, null, 2))
  const screenshot = await page.evaluate(() => window.omnibusScreenshot)
  fs.writeFileSync(path.join(folder, 'omnibus-fixed.png'), Buffer.from(screenshot.split(',')[1], 'base64'))
  console.log(JSON.stringify({ results, artifacts: folder }, null, 2))
} finally { await browser?.close(); await server.close() }
