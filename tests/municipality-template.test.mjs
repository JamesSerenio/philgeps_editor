import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { resolveMunicipalityTemplate, selectMunicipalityTemplate } from '../src/lib/municipalityTemplate.js'

test('municipality determines the automatic template, including stale saved variants', () => {
  for (const municipality of ['Initao', ' INITAO ', 'Municipality of Initao']) {
    assert.equal(resolveMunicipalityTemplate(municipality, { templateVariant: 'old_default' }), 'initao_lgu')
  }
  for (const municipality of ['Salay', 'Sumilao', '', undefined]) {
    assert.equal(resolveMunicipalityTemplate(municipality, { templateVariant: 'initao_lgu' }), 'old_default')
  }
})

test('manual selections remain editable and survive reload for the same municipality', () => {
  const selected = JSON.parse(JSON.stringify(selectMunicipalityTemplate('Salay', { templateVariant: 'initao_lgu' })))
  assert.equal(resolveMunicipalityTemplate(' SALAY ', selected), 'initao_lgu')
  assert.equal(resolveMunicipalityTemplate('Sumilao', selected), 'old_default')
  const defaultInInitao = selectMunicipalityTemplate('Initao', { templateVariant: 'old_default' })
  assert.equal(resolveMunicipalityTemplate('Initao', defaultInInitao), 'old_default')
  assert.equal(resolveMunicipalityTemplate('Salay', defaultInInitao), 'old_default')
})

test('automatic selection and manual changes produce the matching export document order', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
    for (const [municipality, saved, expected] of [
      ['Initao', {}, true], ['Salay', { templateVariant: 'initao_lgu' }, false],
      ['Salay', selectMunicipalityTemplate('Salay', { templateVariant: 'initao_lgu' }), true],
      ['Initao', selectMunicipalityTemplate('Initao', { templateVariant: 'old_default' }), false],
    ]) {
      const omnibus = { ...saved, templateVariant: resolveMunicipalityTemplate(municipality, saved) }
      const documents = getBidPackageDocuments({ setup: { bidderId: 'mikata', municipality }, omnibus })
      assert.equal(documents.some(entry => entry.wordSection === 'initaoDivider'), expected)
    }
  } finally { await server.close() }
})
