// Tests the real preview/download modal and company setup without a live project.
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const { webkit } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright')
const browser = await webkit.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
const base = process.env.VITE_TEST_URL || 'http://127.0.0.1:5175'
const output = '.tmp/manotech-validation'
try {
  // Exercise the app's PDF canvas viewer; headless WebKit has no PDF plugin.
  const page = await browser.newPage({ viewport: { width: 1000, height: 1100 } })
  page.on('pageerror', error => console.error(error.message))
  await page.route('**/__manotech_validation__', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
  await page.goto(base + '/__manotech_validation__')
  await page.evaluate(async () => {
    const { default: RefreshRuntime } = await import('/@react-refresh')
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: { createRoot } } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { default: Modal } = await import('/src/components/GenerateDocumentsModal.jsx')
    const pdf = await (await fetch('/.tmp/manotech-validation/manotech-test.pdf')).blob()
    const word = await (await fetch('/.tmp/manotech-validation/manotech-test.docx')).blob()
    const files = Object.fromEntries([['pdf', pdf], ['docx', word]].map(([format, blob]) => [format,
      { format, blob, url: URL.createObjectURL(blob), filename: 'Manotech.' + format, contentKey: 'test' }]))
    window.testRoot = createRoot(document.getElementById('root'))
    window.testRoot.render(React.createElement(Modal, { results: files, contentKey: 'test', onGenerate() {}, onClose() {} }))
  })
  for (const format of ['pdf', 'docx']) {
    await page.locator('input[value="' + format + '"]').check({ force: true })
    await page.getByText('Ready to download', { exact: true }).waitFor({ timeout: 120000 })
    if (format === 'pdf') assert.ok(await page.locator('.bid-export-pdf-scroll canvas').count() > 0)
    else assert.ok(await page.locator('.bid-export-word-mount section.docx').count() > 0)
    await page.screenshot({ path: output + '/actual-' + format + '-preview.png' })
    const event = page.waitForEvent('download')
    await page.getByRole('button', { name: format === 'pdf' ? 'Download PDF' : 'Download Word', exact: true }).click()
    const download = await event
    await download.saveAs(output + '/modal-download.' + format)
    assert.ok(fs.readFileSync(output + '/modal-download.' + format).equals(fs.readFileSync(output + '/manotech-test.' + format)))
    console.log('PASS actual ' + format + ' preview and unchanged download bytes')
  }
  await page.goto(base + '/__manotech_validation__')
  await page.evaluate(async () => {
    const { default: RefreshRuntime } = await import('/@react-refresh')
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    const { mountSetup } = await import('/tests/manotech-setup-harness.mjs')
    mountSetup()
  })
  await page.getByLabel('Bidder Name', { exact: true }).selectOption('MANOTECH')
  assert.equal(await page.getByLabel('Submitted By', { exact: true }).inputValue(), '')
  assert.equal(await page.getByLabel('Business Address', { exact: true }).inputValue(), 'Purok 4, Poblacion, Linamon, Lanao del Norte')
  await page.getByLabel('MANOTECH Contact Number').fill('Saved Manotech contact')
  await page.getByLabel('Submitted By', { exact: true }).fill('Saved Manotech representative')
  assert.equal(await page.getByText('Missing Document', { exact: true }).count(), 7)
  await page.getByLabel('Upload SEC Registration Certificate.pdf').setInputFiles({ name: 'TEST-ONLY.pdf', mimeType: 'application/pdf', buffer: fs.readFileSync(output + '/manotech-test.pdf') })
  await page.getByText('Ready', { exact: true }).waitFor()
  await page.getByLabel('Bidder Name', { exact: true }).selectOption('MIKATA CORPORATION')
  assert.equal(await page.getByLabel('Submitted By', { exact: true }).inputValue(), 'CARLOS RAFAEL A. JAMILO')
  await page.getByLabel('Bidder Name', { exact: true }).selectOption('MANOTECH')
  assert.equal(await page.getByLabel('MANOTECH Contact Number').inputValue(), 'Saved Manotech contact')
  assert.equal(await page.getByLabel('Submitted By', { exact: true }).inputValue(), 'Saved Manotech representative')
  assert.equal(await page.getByText('Ready', { exact: true }).count(), 1)
  console.log('PASS actual setup fields, independent switching and genuine-document upload flow (test fixture only)')
} finally { await browser.close() }
