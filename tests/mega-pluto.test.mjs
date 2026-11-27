import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { selectBidder } from '../src/lib/bidderAddresses.js'
import { documentBidderName, normalizeBidderSetup, MEGA_PLUTO_DISPLAY_NAME } from '../src/lib/bidderCompanies.js'
import { restoreBidderVariants } from '../src/lib/bidderProfiles.js'
const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
after(() => server.close())
const assets = await server.ssrLoadModule('/src/lib/bidderAssets.js')
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

test('all 22 independent Mega Pluto templates preserve source geometry and hashes', () => {
  const audit = JSON.parse(fs.readFileSync('docs/mega-pluto-template-conversion.json', 'utf8'))
  assert.equal(audit.length, 22)
  for (const entry of audit) {
    assert.equal(hash(entry.source), entry.sourceSha256)
    assert.equal(hash(entry.output), entry.sha256)
    const filename = entry.source.replace('public/pdf/templates/MIKATA_CORPORATION/', '').replace('MIKATA CORPORATION - ', '')
    assert.ok(assets.getTemplatePath(filename, 'mega-pluto').startsWith('/pdf/templates/MEGA_PLUTO/'))
  }
  assert.ok(assets.getLogoPath('mega-pluto').endsWith('/MEGA_PLUTO-logo-transparent.png'))
  assert.throws(() => assets.getTemplatePath('missing.pdf', 'mega-pluto'), /Missing Megapluto Electrical Supply & Hardware Materials Trading template/)
  assert.equal(assets.getMissingBidderAssets('mega-pluto').length, 7)
})

test('legacy company identifiers, profiles, addresses, variants and certificate ownership migrate without data loss', () => {
  for (const id of ['mega-pluto', 'MEGA_PLUTO', 'MEGA PLUTO', 'MEGAPLUTO', MEGA_PLUTO_DISPLAY_NAME]) {
    const saved = { bidderId: id, bidderName: id, businessAddress: 'Saved address',
      bidderProfiles: { [id]: { submittedBy: 'Saved representative' } },
      bidderBusinessAddresses: { [id]: 'Saved address' },
      bidderTemplateVariants: { [id]: { omnibus: 'initao_lgu' } },
      certificateUploads: { 'SEC Registration Certificate.pdf': { bidderId: id, dataUrl: 'data:application/pdf;base64,JVBERg==' } } }
    const setup = normalizeBidderSetup(saved)
    assert.equal(setup.bidderId, 'MEGA_PLUTO')
    assert.equal(setup.bidderName, MEGA_PLUTO_DISPLAY_NAME)
    assert.equal(setup.bidderProfiles.MEGA_PLUTO.submittedBy, 'Saved representative')
    assert.equal(setup.bidderBusinessAddresses.MEGA_PLUTO, 'Saved address')
    assert.equal(setup.bidderTemplateVariants.MEGA_PLUTO.omnibus, 'initao_lgu')
    assert.equal(setup.certificateUploads['SEC Registration Certificate.pdf'].bidderId, 'MEGA_PLUTO')
    assert.equal(saved.bidderId, id)
    assert.equal(assets.getTemplatePath('TABLE OF CONTENTS.pdf', saved), assets.getTemplatePath('TABLE OF CONTENTS.pdf', setup))
    assert.equal(assets.getStaticDocumentPath(saved, 'SEC Registration Certificate.pdf'), 'data:application/pdf;base64,JVBERg==')
    assert.equal(documentBidderName(saved), MEGA_PLUTO_DISPLAY_NAME)
  }
  const other = { bidderId: 'manotech', bidderName: 'MANOTECH', bidderProfiles: { 'mega-pluto': { submittedBy: 'Saved representative' } },
    bidderBusinessAddresses: { 'mega-pluto': 'Saved office' }, bidderTemplateVariants: { 'mega-pluto': { omnibus: 'initao_lgu', bidSecurity: 'with_table' } } }
  const selected = selectBidder(other, 'MEGA_PLUTO')
  assert.equal(selected.submittedBy, 'Saved representative')
  assert.equal(selected.businessAddress, 'Saved office')
  const restored = restoreBidderVariants(other, selected, {}, {})
  assert.equal(restored.omnibus.templateVariant, 'initao_lgu')
  assert.equal(restored.bidSecurity.templateVariant, 'with_table')
})

test('Mega Pluto profile, legal name, custom address and variants survive company switching and serialization', async () => {
  let setup = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', businessAddress: 'OTHER ADDRESS',
    submittedBy: 'OTHER PERSON', corporateSecretaryName: 'OTHER OFFICER', financials: { currentAssets: 100 } }
  let restored = restoreBidderVariants(setup, selectBidder(setup, 'MEGA PLUTO'), { templateVariant: 'initao_lgu' }, { templateVariant: 'initao_lgu' })
  setup = restored.setup
  assert.equal(setup.submittedBy, '')
  assert.equal(setup.corporateSecretaryName, '')
  assert.deepEqual(setup.financials, {})
  assert.equal(setup.businessAddress, 'Kihare, Bukidnon, 8703')
  assert.equal(restored.omnibus.templateVariant, 'initao_lgu')
  setup = { ...setup, registeredBusinessName: 'TEST REGISTERED MEGA PLUTO', submittedBy: 'TEST OWN PERSON',
    businessAddress: 'TEST CUSTOM ADDRESS', phone: 'TEST PHONE', financials: { currentAssets: 500, multiplier: 10 } }
  assert.equal(documentBidderName(setup), 'TEST REGISTERED MEGA PLUTO')
  restored = restoreBidderVariants(setup, selectBidder(setup, 'MANOTECH'), restored.bidSecurity, restored.omnibus)
  const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
  const stored = JSON.parse(JSON.stringify(copyEditorItems({ documentSetup: restored.setup }, 'bid_security')))
  const own = selectBidder(stored.documentSetup, 'MEGA PLUTO')
  assert.equal(own.registeredBusinessName, 'TEST REGISTERED MEGA PLUTO')
  assert.equal(own.phone, 'TEST PHONE')
  assert.equal(own.businessAddress, 'TEST CUSTOM ADDRESS')
  assert.equal(own.financials.multiplier, 10)
  assert.equal(selectBidder(own, 'MIKATA CORPORATION').submittedBy, 'OTHER PERSON')
})

test('Mega Pluto has no sample contracts, validates setup and preserves document order', async () => {
  const { getSlccEntry } = await server.ssrLoadModule('/src/services/pdf/slccPdf.js')
  assert.deepEqual(getSlccEntry({ bidderId: 'mega-pluto' }), {})
  const { generateSecretaryCertificatePreview } = await server.ssrLoadModule('/src/services/pdf/secretarysCertificatePdf.js')
  await assert.rejects(generateSecretaryCertificatePreview({ bidderId: 'mega-pluto', date: '2026-10-24' }), /Please complete Document Setup/)
  const { getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
  for (const omnibusVariant of ['old_default', 'initao_lgu']) {
    const names = bidderId => getBidPackageDocuments({ setup: { bidderId, referenceNumber: 'TEST' }, omnibusVariant }).filter(d => d.wordSection !== 'slccSupporting').map(d => [d.name, d.wordSection])
    assert.deepEqual(names('mega-pluto'), names('mikata'))
  }
})
