import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createServer } from 'vite'
import { Document, Packer } from 'docx'
import { createCanvas } from '@napi-rs/canvas'

test('Bid Form PDF and Word generate with a blank reference and still validate other required fields', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => typeof url === 'string' && url.startsWith('/pdf/')
    ? new Response(await readFile(path.join(process.cwd(), 'public', decodeURIComponent(url))))
    : originalFetch(url, options)
  try {
    const { generateBidFormPreview } = await server.ssrLoadModule('/src/services/pdf/bidFormPdf.js')
    const { bidFormWord } = await server.ssrLoadModule('/src/services/word/bidFormWord.js')
    const { GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs')).href
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const setup = { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', procuringEntity: 'MUNICIPALITY OF SUMILAO',
      projectTitle: 'Supply of radio equipment', submittedBy: 'TEST REPRESENTATIVE', designation: 'Authorized Representative', date: '2026-11-26' }
    const technical = [{ id: 'radio', qty: '2', unit: 'pcs', specificationLines: [{ text: 'Radio' }] }]
    const priceValues = { radio: { price: '1000' } }
    for (const referenceNumber of ['', undefined, 'TEST-REF-123']) {
      const data = { ...setup, referenceNumber, items: technical, priceValues }
      const url = await generateBidFormPreview(data)
      try {
        const loading = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()), useSystemFonts: true })
        try {
          const pdf = await loading.promise
          assert.equal(pdf.numPages, 2)
          const text = (await (await pdf.getPage(1)).getTextContent()).items
          const referenceSlot = text.filter(part => part.str.trim() && part.transform[4] >= 346 && part.transform[5] > 665 && part.transform[5] < 690)
          assert.equal(referenceSlot.map(part => part.str).join(''), referenceNumber || '')
          const page = await pdf.getPage(1)
          const canvas = createCanvas(612, 792)
          const context = canvas.getContext('2d')
          await page.render({ canvasContext: context, viewport: page.getViewport({ scale: 1 }) }).promise
          const pixels = context.getImageData(216, 111, 329, 17).data
          const hasInk = pixels.some((value, index) => index % 4 !== 3 && value < 200)
          assert.equal(hasInk, Boolean(referenceNumber), 'Reference label and value must be visibly absent when blank')
        } finally { await loading.destroy() }
      } finally { URL.revokeObjectURL(url) }
      const sections = await bidFormWord({ setup: { ...setup, referenceNumber }, technical, priceValues })
      assert.ok((await Packer.toBuffer(new Document({ sections }))).length > 1000)
    }
    await assert.rejects(generateBidFormPreview({ ...setup, projectTitle: '', items: technical, priceValues }), /Project Title/)
    await assert.rejects(bidFormWord({ setup: { ...setup, projectTitle: '' }, technical, priceValues }), /Project Title/)
  } finally { globalThis.fetch = originalFetch; await server.close() }
})
