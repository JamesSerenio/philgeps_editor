import assert from 'node:assert/strict'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'
const require = createRequire(path.join(os.tmpdir(), 'philgeps-premium-browser-tools', 'package.json'))
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href)
  : require('playwright')
const runtime = "\nimport { generateNfccPreview } from '/src/services/pdf/nfccPdf.js'\nimport { readPdfLayout } from '/src/services/word/pdfLayout.js'\nwindow.checkNfcc = async () => {\n const results = []\n for (const projectTitle of ['SHORT PROJECT TITLE', 'PROCUREMENT OF CONSTRUCTION MATERIALS FOR IMPROVEMENT OF MUNICIPAL BUILDING (MUNICIPAL HEALTH CENTER)']) {\n const url = await generateNfccPreview({bidderId:'mikata',bidderName:'MIKATA CORPORATION',projectTitle,referenceNumber:'13309241',procuringEntity:'MUNICIPALITY OF SUMILAO, BUKIDNON',businessAddress:'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000',submittedBy:'JHO ANN Q. CLEOPAS',designation:'Authorized Representative',date:'2026-10-28'})\n const pages = await readPdfLayout(url, 'NFCC')\n const fragments = pages[0].fragments\n const titleLabel = fragments.find(p => p.str === 'PROJECT TITLE')\n const reference = fragments.find(p => p.str === 'REFERENCE NUMBER')\n const title = fragments.filter(p => p.x > 215 && p.top >= titleLabel.top - 2 && p.bottom < reference.top)\n if (title.map(p=>p.str).join(' ') !== projectTitle) throw new Error('Title truncated: '+JSON.stringify(title))\n if (title.some(p=>p.size < 10 || p.x + p.width > 566)) throw new Error('Title too small or outside column')\n const address = fragments.filter(p=>p.str.includes('ZONE 13') || p.str === '9000')\n const body = fragments.find(p=>p.str.includes('The undersigned'))\n if (body && address.some(p=>p.bottom >= body.top)) throw new Error('Address overlaps body')\n results.push({projectTitle,lines:title.length,pages:pages.length})\n URL.revokeObjectURL(url)\n }\n return results\n}\n"
const server = await createServer({ server: { host: '127.0.0.1', port: 0, ws: false }, plugins: [{
  name: 'nfcc-regression-runtime',
  resolveId(id) { if (id === '/__nfcc_layout_runtime.js') return '\0nfcc-layout-runtime' },
  load(id) { if (id === '\0nfcc-layout-runtime') return runtime },
}] })
let browser
try {
  await server.listen()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage()
  await page.route('**/__nfcc_layout_check', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto(base + '/__nfcc_layout_check')
  await page.addScriptTag({ type: 'module', url: base + '/__nfcc_layout_runtime.js' })
  await page.waitForFunction(() => window.checkNfcc)
  const results = await page.evaluate(() => window.checkNfcc())
  assert.equal(results.length, 2)
  console.log(JSON.stringify(results, null, 2))
} finally { await browser?.close(); await server.close() }
