import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { PDFDocument, degrees } from 'pdf-lib'
import { selectBidderProfile } from '../src/lib/bidderProfiles.js'
import { supportingUploads, appendSupportingUploads } from '../src/lib/supportingUploads.js'

test('uploaded ongoing and SLCC supporting pages use A4 and follow their statements in both package orders', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false } })
  try {
    const { appendPdfAsA4, getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
    const source = await PDFDocument.create()
    for (const rotation of [0, 90, 180, 270]) {
      const page = source.addPage([1000, 700])
      page.drawText('Supporting contract document')
      page.setRotation(degrees(rotation))
    }
    const output = await PDFDocument.create()
    await appendPdfAsA4(output, source)
    const saved = await PDFDocument.load(await output.save())
    assert.equal(saved.getPageCount(), 4)
    for (const page of saved.getPages()) {
      assert.equal(page.getWidth(), 595.28)
      assert.equal(page.getHeight(), 841.89)
    }
    const upload = { name: 'Custom supporting.pdf', dataUrl: 'data:application/pdf;base64,' + Buffer.from(await output.save()).toString('base64') }
    for (const omnibusVariant of ['old_default', 'initao_lgu']) {
      for (const slccVariant of ['none', 'cctv', 'streetlight']) {
        const documents = getBidPackageDocuments({ setup: { bidderId: 'mikata', slccVariant, slccSupportingUpload: upload, ongoingSupportingUpload: upload }, omnibusVariant })
        const index = documents.findIndex(entry => entry.wordSection === 8)
        assert.equal(documents[index + 1].wordSection, 'slccSupporting')
        assert.equal(documents[index + 1].path, upload.dataUrl)
        assert.equal(documents.filter(entry => entry.wordSection === 'slccSupporting').length, 1)
        const ongoingIndex = documents.findIndex(entry => entry.wordSection === 7)
        assert.equal(documents[ongoingIndex + 1].wordSection, 'ongoingSupporting')
        assert.equal(documents[ongoingIndex + 1].path, upload.dataUrl)
        assert.equal(documents.filter(entry => entry.wordSection === 'ongoingSupporting').length, 1)
        assert.equal(documents.find(entry => entry.wordSection === 9).name, 'PhilGEPS Platinum Certificate.pdf')
      }
      const withoutUpload = getBidPackageDocuments({ setup: { bidderId: 'mikata', ongoingSupportingUpload: null }, omnibusVariant })
      assert.equal(withoutUpload.filter(entry => entry.wordSection === 'ongoingSupporting').length, 0)
      const uploads = appendSupportingUploads(upload, [
        { ...upload, name: 'Second.pdf' }, { ...upload, name: 'Third.pdf' },
      ])
      const multiple = getBidPackageDocuments({ setup: { bidderId: 'mikata', ongoingSupportingUpload: uploads }, omnibusVariant })
      const statementIndex = multiple.findIndex(entry => entry.wordSection === 7)
      assert.deepEqual(multiple.slice(statementIndex + 1, statementIndex + 4).map(entry => entry.name), uploads.map(file => file.name))
      assert.equal(multiple[statementIndex + 4].wordSection, 8)
      const serialized = copySavedUploads(uploads)
      assert.deepEqual(supportingUploads(serialized), uploads)
    }
    const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
    const restored = copyEditorItems({ documentSetup: { ongoingSupportingUpload: upload } }, 'bid_security')
    assert.deepEqual(restored.documentSetup.ongoingSupportingUpload, upload)
  } finally {
    await server.close()
  }
})

function copySavedUploads(uploads) {
  return JSON.parse(JSON.stringify(uploads))
}

test('adding more PDFs preserves legacy uploads and removal preserves remaining order', () => {
  const first = { name: 'First.pdf', dataUrl: 'data:application/pdf;base64,Zmlyc3Q=' }
  const second = { name: 'Second.pdf', dataUrl: 'data:application/pdf;base64,c2Vjb25k' }
  const third = { name: 'Third.pdf', dataUrl: 'data:application/pdf;base64,dGhpcmQ=' }
  const uploads = appendSupportingUploads(first, [second, third])
  assert.deepEqual(uploads, [first, second, third])
  assert.deepEqual(supportingUploads(uploads).filter((_, index) => index !== 1), [first, third])
  assert.deepEqual(supportingUploads(null), [])
})

test('ongoing supporting uploads stay with the selected bidder profile', () => {
  const upload = { name: 'Ongoing.pdf', dataUrl: 'data:application/pdf;base64,dGVzdA==' }
  const initial = { bidderId: 'mikata', ongoingSupportingUpload: upload }
  const next = selectBidderProfile(initial, 'mikata', 'manotech')
  assert.equal(next.ongoingSupportingUpload, '')
  const restored = selectBidderProfile({ ...next, bidderId: 'manotech' }, 'manotech', 'mikata')
  assert.deepEqual(restored.ongoingSupportingUpload, upload)
})
