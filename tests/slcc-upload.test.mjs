import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { PDFDocument, degrees } from 'pdf-lib'

test('uploaded SLCC supporting pages use A4 and follow SLCC in both package orders', async () => {
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
        const documents = getBidPackageDocuments({ setup: { bidderId: 'mikata', slccVariant, slccSupportingUpload: upload }, omnibusVariant })
        const index = documents.findIndex(entry => entry.wordSection === 8)
        assert.equal(documents[index + 1].wordSection, 'slccSupporting')
        assert.equal(documents[index + 1].path, upload.dataUrl)
        assert.equal(documents.filter(entry => entry.wordSection === 'slccSupporting').length, 1)
      }
    }
  } finally {
    await server.close()
  }
})
