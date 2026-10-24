import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { bidderAddresses, changeBidderAddress, getDefaultBidderAddress, selectBidder } from '../src/lib/bidderAddresses.js'

test('selection loads the configured primary office immediately and retains unrelated project fields', () => {
  let setup = { referenceNumber: '13261581', projectTitle: 'Existing title' }
  for (const [id, entry] of Object.entries(bidderAddresses)) {
    setup = selectBidder(setup, entry.name)
    assert.equal(setup.businessAddress, entry.businessAddress)
    assert.equal(setup.bidderId, id)
    assert.equal(setup.referenceNumber, '13261581')
    assert.equal(setup.projectTitle, 'Existing title')
    assert.notEqual(setup.businessAddress, entry.additionalOffice)
  }
  assert.equal(getDefaultBidderAddress('BUILTECH'), bidderAddresses.builtech.businessAddress)
})

test('custom addresses persist by bidder through switching and a saved JSON round trip', () => {
  let setup = selectBidder({}, 'BUILTECH SOLUTIONS')
  setup = changeBidderAddress(setup, 'Custom Builtech address')
  setup = selectBidder(setup, 'MEGA PLUTO')
  assert.equal(setup.businessAddress, 'Kihare, Bukidnon, 8703')
  setup = JSON.parse(JSON.stringify({ documentSetup: setup })).documentSetup
  setup = selectBidder(setup, 'BUILTECH SOLUTIONS')
  assert.equal(setup.businessAddress, 'Custom Builtech address')
  setup = changeBidderAddress(setup, '')
  setup = selectBidder(selectBidder(setup, 'WDC BUILDERS & SUPPLIES'), 'BUILTECH SOLUTIONS')
  assert.equal(setup.businessAddress, '')
})

test('unconfigured bidders retain only their own saved addresses; new bidders never inherit another address', () => {
  for (const name of ['MAGNUS', 'FJQ CONSTRUCTION', 'GOLDEN M', 'MIGOY BUGOY ENTERPRISES', 'Legacy saved company']) {
    const legacy = { bidderName: name, businessAddress: 'Original saved address' }
    const selected = selectBidder(selectBidder(legacy, 'WDC BUILDERS & SUPPLIES'), name)
    assert.equal(selected.businessAddress, 'Original saved address')
    assert.equal(selectBidder(selectBidder({}, 'WDC'), name).businessAddress, '')
  }
  const cleared = selectBidder(selectBidder({}, 'MIKATA CORPORATION'), '')
  assert.equal(cleared.businessAddress, '')
  assert.equal(cleared.bidderId, undefined)
})

test('existing setup persistence and PDF/Word data adapters retain the current address', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { createDocumentSetup, setupProject } = await server.ssrLoadModule('/src/lib/documentSetup.js')
    const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
    const setup = changeBidderAddress(selectBidder({}, 'BUILTECH SOLUTIONS'), 'Saved custom office')
    const stored = copyEditorItems({ documentSetup: setup, templateVariant: 'initao_lgu' }, 'bid_security')
    const restored = createDocumentSetup({}, stored)
    assert.deepEqual(restored, setup)
    assert.equal(setupProject(restored).businessAddress, 'Saved custom office')
    assert.equal(stored.templateVariant, 'initao_lgu')
    assert.equal(createDocumentSetup({}, { bidderName: 'MANOTECH' }).businessAddress, bidderAddresses.manotech.businessAddress)
    assert.equal(createDocumentSetup({}, { bidderName: 'MIKATA CORPORATION', companyAddress: 'Legacy office' }).businessAddress, 'Legacy office')
    assert.equal(createDocumentSetup({}, { bidderName: 'MIKATA CORPORATION', businessAddress: '' }).businessAddress, '')
  } finally { await server.close() }
})
