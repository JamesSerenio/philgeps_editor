import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { selectBidder } from '../src/lib/bidderAddresses.js'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
after(() => server.close())
const assets = await server.ssrLoadModule('/src/lib/bidderAssets.js')
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

test('all 22 Manotech forms preserve source page counts and source files stay unchanged', () => {
  const audit = JSON.parse(fs.readFileSync('docs/manotech-template-conversion.json', 'utf8'))
  assert.equal(audit.length, 22)
  for (const entry of audit) {
    assert.equal(hash(entry.source), entry.sourceSha256, entry.source)
    assert.equal(hash(entry.output), entry.sha256, entry.output)
    assert.ok(entry.pages > 0)
    const filename = entry.source.replace('public/pdf/templates/MIKATA_CORPORATION/', '').replace('MIKATA CORPORATION - ', '')
    assert.ok(assets.getTemplatePath(filename, 'manotech').startsWith('/pdf/templates/MANOTECH/'))
  }
  assert.equal(assets.getLogoPath('manotech'), '/images/MANOTECH/MANOTECH-logo.png')
})

test('Manotech profile never inherits private fields and survives JSON persistence and company switching', () => {
  const mikata = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', referenceNumber: 'TEST',
    submittedBy: 'Mikata Person', phone: 'Mikata Phone', email: 'Mikata Email', financials: { currentAssets: 111 } }
  let setup = selectBidder(mikata, 'MANOTECH')
  for (const field of ['submittedBy', 'phone', 'email']) assert.equal(setup[field], '')
  assert.equal(setup.authorizedRepresentative, '')
  assert.deepEqual(setup.financials, {})
  assert.equal(setup.businessAddress, 'Purok 4, Poblacion, Linamon, Lanao del Norte')
  setup = { ...setup, submittedBy: 'Manotech Person', phone: 'Saved Phone', financials: { currentAssets: 222 } }
  setup = selectBidder(setup, 'BUILTECH SOLUTIONS')
  setup = JSON.parse(JSON.stringify(setup))
  setup = selectBidder(setup, 'MANOTECH')
  assert.equal(setup.submittedBy, 'Manotech Person')
  assert.equal(setup.phone, 'Saved Phone')
  assert.equal(setup.financials.currentAssets, 222)
  setup = selectBidder(setup, 'MIKATA CORPORATION')
  assert.equal(setup.submittedBy, 'Mikata Person')
  assert.equal(setup.financials.currentAssets, 111)
})

test('official Manotech documents are missing until a same-company upload is supplied', () => {
  assert.equal(assets.getMissingBidderAssets('manotech').length, 7)
  for (const filename of assets.staticDocumentNames) {
    assert.throws(() => assets.getStaticDocumentPath('manotech', filename), /Missing MANOTECH document/)
    const dataUrl = 'data:application/pdf;base64,JVBERi0xLjQ='
    const setup = { bidderId: 'manotech', certificateUploads: { [filename]: { bidderId: 'manotech', dataUrl } } }
    assert.equal(assets.getStaticDocumentPath(setup, filename), dataUrl)
    assert.throws(() => assets.getStaticDocumentPath({ ...setup, bidderId: 'builtech' }, filename), /Missing BUILTECH/)
  }
})

test('Manotech SLCC has no Mikata sample contracts and document sequence remains identical', async () => {
  const { getSlccEntry } = await server.ssrLoadModule('/src/services/pdf/slccPdf.js')
  for (const variant of ['cctv', 'streetlight']) assert.deepEqual(getSlccEntry({ bidderId: 'manotech' }, variant), {})
  const { getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
  for (const variant of ['old_default', 'initao_lgu']) {
    const docs = id => getBidPackageDocuments({ setup: { bidderId: id, referenceNumber: 'TEST' }, omnibusVariant: variant })
    assert.deepEqual(docs('manotech').map(x => [x.name, x.wordSection]), docs('mikata').map(x => [x.name, x.wordSection]))
  }
})

test('existing editor-state serialization retains Manotech profile fields and certificate uploads', async () => {
  const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
  const { createDocumentSetup } = await server.ssrLoadModule('/src/lib/documentSetup.js')
  const setup = { ...selectBidder({}, 'MANOTECH'), phone: 'Saved contact', corporateSecretaryName: 'Saved secretary',
    certificateUploads: { 'SEC Registration Certificate.pdf': { bidderId: 'manotech', name: 'actual.pdf', dataUrl: 'data:application/pdf;base64,JVBERi0xLjQ=' } } }
  const stored = JSON.parse(JSON.stringify(copyEditorItems({ documentSetup: setup }, 'bid_security')))
  assert.deepEqual(createDocumentSetup({}, stored), setup)
})
