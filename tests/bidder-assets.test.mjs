import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { after, test } from 'node:test'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
const assets = await server.ssrLoadModule('/src/lib/bidderAssets.js')
after(() => server.close())
const { bidderCompanies, getBidderCompany, getStaticDocumentPath, getTemplatePath, getLogoPath, expectedBidderAssetPath, getMissingBidderAssets } = assets

test('all ten stable company identities resolve by ID, folder, name and aliases', () => {
  assert.equal(bidderCompanies.length, 10)
  assert.equal(new Set(bidderCompanies.map(company => company.id)).size, 10)
  for (const company of bidderCompanies) for (const label of [company.id, company.folder, company.name, ...company.aliases]) assert.equal(getBidderCompany(label).id, company.id)
  assert.equal(getBidderCompany({ bidderName: 'MIKATA PRIME CORPORATION' }).id, 'mikata')
  assert.equal(getBidderCompany({}).id, 'mikata')
  assert.throws(() => getBidderCompany('Unregistered company'), /No company asset configuration/)
})
test('company folders exist and active company/shared files retain their verified original content', () => {
  for (const company of bidderCompanies) for (const kind of ['images', 'pdf/static', 'pdf/templates', 'pdf/reference']) assert.ok(fs.statSync(path.join('public', kind, company.folder)).isDirectory())
  const verified = JSON.parse(fs.readFileSync('tests/fixtures/mikata-assets.sha256.json', 'utf8'))
  assert.equal(Object.keys(verified).length, 30)
  for (const [file, hash] of Object.entries(verified)) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, file)
  assert.deepEqual(getMissingBidderAssets('mikata'), [])
})

test('all inventoried company and shared asset paths still exist after cleanup', () => {
  const manifest = JSON.parse(fs.readFileSync('src/lib/bidderAssetManifest.json', 'utf8'))
  const templates = [...new Set(manifest.filter(file => file.startsWith('/pdf/templates/MIKATA_CORPORATION/')).map(file => file.replace('/pdf/templates/MIKATA_CORPORATION/', '').replace('MIKATA CORPORATION - ', '')))]
  assert.equal(templates.length, 22)
  for (const file of manifest.filter(file => file.startsWith('/pdf/templates/'))) {
    const company = bidderCompanies.find(bidder => file.startsWith('/pdf/templates/' + bidder.folder + '/'))
    assert.ok(company, file)
    assert.ok(path.posix.basename(file).startsWith(company.name + ' - '), file)
  }
  for (const company of bidderCompanies) {
    for (const filename of templates) {
      if (!['mikata', 'builtech', 'manotech', 'r-and-l'].includes(company.id) && ['NFCC_Template.pdf', 'Manpower Requirements.pdf', 'Statement of Ongoing Government and Private Contracts,.pdf', 'SLCC_table_cctv.pdf', 'SLCC_table_streetlight.pdf'].includes(filename)) continue
      const resolved = getTemplatePath(filename, company.id)
      assert.ok(fs.existsSync('public' + decodeURIComponent(resolved)), resolved)
    }
  }
  for (const filename of assets.staticDocumentNames) assert.ok(fs.existsSync('public' + decodeURIComponent(getStaticDocumentPath('mikata', filename))))
  assert.ok(fs.existsSync('public' + decodeURIComponent(assets.getReferencePath('cctv2.pdf', 'mikata'))))
  for (const file of manifest) assert.ok(fs.existsSync('public' + file), file)
})
test('missing bidder certificates never fall back to Mikata or shared legal originals', () => {
  for (const company of bidderCompanies.slice(1)) for (const filename of assets.staticDocumentNames) {
    const expected = getStaticDocumentPath(company.id, filename, { required: false })
    assert.ok(decodeURIComponent(expected).includes('/' + company.folder + '/'))
    assert.ok(!expected.includes('MIKATA'))
    assert.throws(() => getStaticDocumentPath(company.id, filename), error => error.message.includes(company.name) && error.message.includes('public/pdf/static/' + company.folder))
  }
})
test('only generic templates may use shared fallback; history and staff require company files', () => {
  for (const company of bidderCompanies.slice(1)) {
    if (['builtech', 'manotech', 'r-and-l'].includes(company.id)) {
      assert.ok(getTemplatePath('TABBING.pdf', company.id).includes('/' + company.folder + '/'))
      assert.ok(decodeURIComponent(getLogoPath(company.id)).endsWith(company.logoFilename))
      continue
    }
    assert.equal(getTemplatePath('TABBING.pdf', company.id), '/pdf/templates/MIKATA_CORPORATION/MIKATA%20CORPORATION%20-%20TABBING.pdf')
    assert.equal(getTemplatePath('INITAO/TABLE OF CONTENTS-INITAO.pdf', company.id), '/pdf/templates/MIKATA_CORPORATION/INITAO/MIKATA%20CORPORATION%20-%20TABLE%20OF%20CONTENTS-INITAO.pdf')
    for (const file of ['NFCC_Template.pdf', 'Manpower Requirements.pdf', 'Statement of Ongoing Government and Private Contracts,.pdf', 'SLCC_table_cctv.pdf']) assert.throws(() => getTemplatePath(file, company.id), /Expected file: public\/pdf\/templates\//)
    assert.throws(() => getLogoPath(company.id), /logo/)
  }
})
test('public URLs safely encode company names and reject traversal', () => {
  const path = expectedBidderAssetPath('r-and-l', 'static', 'SEC Registration Certificate.pdf')
  assert.ok(assets.encodeAssetUrl(path).includes('R&L'))
  assert.ok(!assets.encodeAssetUrl(path).includes(' '))
  assert.throws(() => expectedBidderAssetPath('mikata', 'static', '../private.pdf'), /Invalid asset filename/)
  assert.throws(() => expectedBidderAssetPath('mikata', 'static', 'folder\\private.pdf'), /Invalid asset filename/)
})
