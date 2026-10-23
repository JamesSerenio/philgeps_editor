import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { selectBidder } from '../src/lib/bidderAddresses.js'
import { restoreBidderVariants } from '../src/lib/bidderProfiles.js'

const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
after(() => server.close())
const assets = await server.ssrLoadModule('/src/lib/bidderAssets.js')
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex')

test('company declaration and contract variants survive switching and JSON persistence', () => {
  const initial = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', slccVariant: 'cctv' }
  let state = restoreBidderVariants(initial, selectBidder(initial, 'R&L BUILDERS AND CONSTRUCTION SUPPLY'),
    { templateVariant: 'initao_lgu' }, { templateVariant: 'initao_lgu' })
  assert.equal(state.bidSecurity.templateVariant, 'old_default')
  state.setup.slccVariant = 'streetlight'
  state = restoreBidderVariants(state.setup, selectBidder(state.setup, 'MIKATA CORPORATION'), state.bidSecurity, state.omnibus)
  assert.equal(state.setup.slccVariant, 'cctv')
  assert.equal(state.omnibus.templateVariant, 'initao_lgu')
  state = JSON.parse(JSON.stringify(state))
  state = restoreBidderVariants(state.setup, selectBidder(state.setup, 'R&L BUILDERS AND CONSTRUCTION SUPPLY'), state.bidSecurity, state.omnibus)
  assert.equal(state.setup.slccVariant, 'streetlight')
  assert.equal(state.omnibus.templateVariant, 'old_default')
  assert.equal(state.bidSecurity.templateVariant, 'old_default')
})

test('22 R&L forms resolve only to their own assets; source and output hashes match conversion audit', () => {
  const audit = JSON.parse(fs.readFileSync('docs/r-and-l-template-conversion.json', 'utf8'))
  assert.equal(audit.length, 22)
  for (const entry of audit) {
    assert.equal(hash(entry.source), entry.sourceSha256)
    assert.equal(hash(entry.output), entry.sha256)
    const filename = entry.source.replace('public/pdf/templates/MIKATA_CORPORATION/', '').replace('MIKATA CORPORATION - ', '')
    const path = assets.getTemplatePath(filename, 'r-and-l')
    assert.ok(path.startsWith('/pdf/templates/R_AND_L_BUILDERS/'))
    assert.ok(fs.existsSync('public' + decodeURIComponent(path)))
  }
  assert.ok(decodeURIComponent(assets.getLogoPath('r-and-l')).endsWith('R&L Builders Construction Supply Logo.png'))
})

test('R&L profile is independent across switching, legacy aliases and editor-state persistence', async () => {
  const other = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', submittedBy: 'Other Person', phone: 'Other Phone',
    authorizedRepresentative: 'Other Person', corporateSecretaryName: 'Other Secretary', financials: { currentAssets: 123 } }
  let setup = selectBidder(other, 'R&L BUILDERS AND CONSTRUCTION SUPPLY')
  for (const key of ['phone', 'submittedBy', 'authorizedRepresentative', 'corporateSecretaryName']) assert.equal(setup[key], '')
  assert.deepEqual(setup.financials, {})
  assert.equal(setup.businessAddress, 'Brgy. Baloy Extension, Gusa, Cagayan de Oro City, Misamis Oriental, Philippines')
  setup = { ...setup, submittedBy: 'R&L Person', financials: { currentAssets: 500, multiplier: 10 }, corporateSecretaryName: 'R&L Officer' }
  setup = selectBidder(setup, 'MANOTECH')
  const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
  const stored = JSON.parse(JSON.stringify(copyEditorItems({ documentSetup: setup }, 'bid_security')))
  setup = selectBidder(stored.documentSetup, 'R&L BUILDERS AND CONSTRUCTION SUPPLY')
  assert.equal(setup.submittedBy, 'R&L Person')
  assert.equal(setup.financials.multiplier, 10)
  assert.equal(selectBidder(setup, 'MIKATA CORPORATION').submittedBy, 'Other Person')
})

test('R&L has no sample SLCC or official-certificate fallback and requires actual officers', async () => {
  assert.equal(assets.getMissingBidderAssets('r-and-l').length, 7)
  const { getSlccEntry } = await server.ssrLoadModule('/src/services/pdf/slccPdf.js')
  assert.deepEqual(getSlccEntry({ bidderId: 'r-and-l' }), {})
  const { generateSecretaryCertificatePreview } = await server.ssrLoadModule('/src/services/pdf/secretarysCertificatePdf.js')
  await assert.rejects(generateSecretaryCertificatePreview({ bidderId: 'r-and-l', date: '2026-10-23' }), /Missing Required Information/)
  const { getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
  for (const omnibusVariant of ['old_default', 'initao_lgu']) {
    const docs = bidderId => getBidPackageDocuments({ setup: { bidderId, referenceNumber: 'TEST' }, omnibusVariant }).map(e => [e.name, e.wordSection])
    assert.deepEqual(docs('r-and-l'), docs('mikata'))
  }
})
