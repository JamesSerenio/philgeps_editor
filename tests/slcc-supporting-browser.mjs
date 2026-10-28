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
const runtime = "\nimport { getBidPackageDocuments } from '/src/services/pdf/fullBidPackagePdf.js'\nimport { PDFDocument } from 'pdf-lib'\nwindow.checkSlcc = async () => {\n const results=[]\n for(const omnibusVariant of ['old_default','initao_lgu']) for(const slccVariant of ['streetlight','cctv','none']) {\n const documents=getBidPackageDocuments({setup:{bidderId:'mikata',bidderName:'MIKATA CORPORATION',slccVariant},omnibusVariant})\n const i=documents.findIndex(entry=>entry.wordSection===8)\n const supporting=documents.filter(entry=>entry.wordSection==='slccSupporting')\n if(slccVariant==='none') {if(supporting.length) throw Error('NONE included attachment')}\n else {\n if(supporting.length!==1 || documents[i+1]!==supporting[0]) throw Error('Attachment order incorrect')\n const expected=slccVariant==='cctv'?'SLCC_CCTV_template.pdf':'SLCC_Streetlight_template.pdf'\n if(!decodeURIComponent(supporting[0].path).endsWith('MIKATA CORPORATION - '+expected)) throw Error('Wrong original')\n supporting[0].validate()\n const response=await fetch(supporting[0].path)\n const original=await PDFDocument.load(await response.arrayBuffer())\n if(!original.getPageCount()) throw Error('Missing original pages')\n }\n if(documents.find(entry=>entry.wordSection===9).name!=='PhilGEPS Platinum Certificate.pdf') throw Error('Existing identity changed')\n results.push({omnibusVariant,slccVariant,attachment:supporting[0]?.name??null})\n }\n return results\n}\n"
const server = await createServer({ server: { host: '127.0.0.1', port: 0, ws: false }, plugins: [{
  name: 'slcc-regression-runtime',
  resolveId(id) { if (id === '/__slcc_layout_runtime.js') return '\0slcc-layout-runtime' },
  load(id) { if (id === '\0slcc-layout-runtime') return runtime },
}] })
let browser
try {
  await server.listen()
  const base = 'http://127.0.0.1:' + server.httpServer.address().port
  browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
  const page = await browser.newPage()
  await page.route('**/__slcc_layout_check', route => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto(base + '/__slcc_layout_check')
  await page.addScriptTag({ type: 'module', url: base + '/__slcc_layout_runtime.js' })
  await page.waitForFunction(() => window.checkSlcc)
  const results = await page.evaluate(() => window.checkSlcc())
  assert.equal(results.length, 6)
  console.log(JSON.stringify(results, null, 2))
} finally { await browser?.close(); await server.close() }
