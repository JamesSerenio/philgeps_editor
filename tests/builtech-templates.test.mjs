import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'
import { createServer } from 'vite'
import { createHash } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'
import { selectBidder } from '../src/lib/bidderAddresses.js'

test('Builtech selection never inherits another bidder personal, staff or financial information', () => {
  const original = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', submittedBy: 'MIKATA PERSON', phone: 'MIKATA PHONE', financials: { currentAssets: 999 }, manpower: 'MIKATA STAFF', slccEntries: { cctv: { government: { ownerDetails: 'MIKATA CONTRACT' } } } }
  const builtech = selectBidder(original, 'BUILTECH SOLUTIONS')
  assert.equal(builtech.submittedBy, '')
  assert.equal(builtech.phone, '')
  assert.equal(builtech.manpower, '')
  assert.deepEqual(builtech.financials, {})
  assert.deepEqual(builtech.slccEntries, {})
  const edited = { ...builtech, submittedBy: 'Actual Builtech Representative', phone: 'Saved phone' }
  const mikata = selectBidder(edited, 'MIKATA CORPORATION')
  assert.equal(mikata.submittedBy, original.submittedBy)
  assert.deepEqual(mikata.financials, original.financials)
  const restored = selectBidder(JSON.parse(JSON.stringify(mikata)), 'BUILTECH SOLUTIONS')
  assert.equal(restored.submittedBy, edited.submittedBy)
  assert.equal(restored.phone, 'Saved phone')
})

test('all 22 separate Builtech templates resolve, and missing genuine static certificates stay blocked', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const assets = await server.ssrLoadModule('/src/lib/bidderAssets.js')
    const conversion = JSON.parse(fs.readFileSync('docs/builtech-template-conversion.json', 'utf8'))
    assert.equal(conversion.length, 22)
    for (const entry of conversion) {
      const originalName = entry.source.split('/MIKATA_CORPORATION/')[1].replace('MIKATA CORPORATION - ', '')
      assert.equal('public' + decodeURIComponent(assets.getTemplatePath(originalName, 'builtech')).split('?')[0], entry.output.replaceAll('\\', '/'))
      assert.ok(fs.existsSync(entry.source))
      assert.ok(fs.existsSync(entry.output))
      assert.equal(createHash('sha256').update(fs.readFileSync(entry.output)).digest('hex'), entry.sha256)
      const source = await PDFDocument.load(fs.readFileSync(entry.source))
      const converted = await PDFDocument.load(fs.readFileSync(entry.output))
      assert.equal(converted.getPageCount(), source.getPageCount())
      converted.getPages().forEach((page, index) => {
        const original = source.getPage(index).getSize()
        // PDF serializers normalize decimal coordinates; allow less than 1/1000 pt.
        assert.ok(Math.abs(page.getWidth() - original.width) < .001)
        assert.ok(Math.abs(page.getHeight() - original.height) < .001)
        assert.equal(page.getWidth() > page.getHeight(), original.width > original.height)
      })
    }
    assert.equal(assets.getLogoPath('builtech'), '/images/BUILTECH_SOLUTIONS/BUILTECH_SOLUTIONS-logo.png')
    for (const name of assets.staticDocumentNames) assert.throws(() => assets.getStaticDocumentPath('builtech', name), /Missing BUILTECH SOLUTIONS document/)
    assert.equal(assets.getMissingBidderAssets('builtech').length, 7)
  } finally { await server.close() }
})
