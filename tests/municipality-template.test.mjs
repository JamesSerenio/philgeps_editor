import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { resolveMunicipalityTemplate, selectMunicipalityTemplate, resolveDocumentTemplate } from '../src/lib/municipalityTemplate.js'

test('document setup defaults to Default and Omnibus to Initao regardless of municipality', () => {
  for (const municipality of ['Initao', 'Salay', 'Sumilao', '', undefined]) {
    assert.equal(resolveDocumentTemplate({ municipality }), 'old_default')
    assert.equal(resolveMunicipalityTemplate(municipality, {}), 'initao_lgu')
    assert.equal(resolveMunicipalityTemplate(municipality, { templateVariant: 'old_default' }), 'initao_lgu')
  }
})
test('manual choices survive reload and municipality changes independently', () => {
  const selected = JSON.parse(JSON.stringify(selectMunicipalityTemplate('Salay', { templateVariant: 'old_default' })))
  assert.equal(resolveMunicipalityTemplate('Salay', selected), 'old_default')
  assert.equal(resolveMunicipalityTemplate('Initao', selected), 'old_default')
  assert.equal(resolveDocumentTemplate({ municipality: 'Initao', documentTemplateVariant: 'initao_lgu' }), 'initao_lgu')
  assert.equal(resolveMunicipalityTemplate('Initao', { templateVariant: 'initao_lgu', templateMunicipality: 'initao' }), 'initao_lgu')
})
test('package order follows Document Setup independently of Omnibus selection', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
    for (const documentTemplateVariant of ['old_default', 'initao_lgu']) for (const templateVariant of ['old_default', 'initao_lgu']) {
      const documents = getBidPackageDocuments({ setup: { bidderId: 'mikata', municipality: 'Salay', documentTemplateVariant }, omnibus: { templateVariant } })
      assert.equal(documents.some(entry => entry.wordSection === 'initaoDivider'), documentTemplateVariant === 'initao_lgu')
      const toc = documents.find(entry => entry.wordSection === 1)
      assert.ok(toc)
    }
  } finally { await server.close() }
})
