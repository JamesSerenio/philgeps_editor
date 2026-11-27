import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import 'pdfjs-dist/legacy/build/pdf.mjs'
import { createServer } from 'vite'
import { PDFDocument } from 'pdf-lib'

const forbidden = /REFERENCE\s*(?:NUMBER|NO\.?)|PROJECT\s*(?:ID\s*NO\.?|IDENTIFICATION\s*NO\.?)/i

test('blank/whitespace references omit complete visible PDF labels for all four bidders and restore them when populated', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  const originalFetch = globalThis.fetch
  const originalImage = globalThis.Image
  globalThis.Image = class {
    set src(url) {
      void (async () => {
        try {
          const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
          const document = await PDFDocument.create()
          const image = bytes[0] === 0x89 ? await document.embedPng(bytes) : await document.embedJpg(bytes)
          this.naturalWidth = image.width
          this.naturalHeight = image.height
          this.onload()
        } catch (error) { this.onerror(error) }
      })()
    }
  }
  globalThis.fetch = async (url, options) => typeof url === 'string' && (url.startsWith('/pdf/') || url.startsWith('/fonts/') || url.startsWith('/images/'))
    ? new Response(await fs.readFile(path.join(process.cwd(), 'public', decodeURIComponent(url))))
    : originalFetch(url, options)
  try {
    const { readPdfLayout } = await server.ssrLoadModule('/src/services/word/pdfLayout.js')
    const { getBidPackageDocuments } = await server.ssrLoadModule('/src/services/pdf/fullBidPackagePdf.js')
    const generators = []
    for (const [file, name] of [['ongoingContractsPdf','generateOngoingContractsPreview'],['nfccPdf','generateNfccPreview'],['slccPdf','generateSlccPreview'],['technicalSpecsPdf','generateTechnicalSpecsPreview'],['schedulePdf','generateScheduleRequirementsPreview'],['priceSchedulePdf','generatePriceSchedulePreview'],['bidSecurityPdf','generateBidSecurityPreview'],['bidFormPdf','generateBidFormPreview'],['tabbingPdf','generateTabbingPreview']]) {
      const module = await server.ssrLoadModule('/src/services/pdf/'+file+'.js')
      assert.equal(typeof module[name], 'function', file+' generator missing')
      generators.push([file, module[name]])
    }
    const { GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs')).href
    for (const bidderId of ['mikata','builtech','manotech','MEGA_PLUTO']) for (const referenceNumber of ['', '   ', 'TEST-REF-123']) {
      const setup = { bidderId, bidderName: 'TEST BIDDER', projectTitle: 'TEST PROJECT TITLE', referenceNumber, procuringEntity: 'TEST MUNICIPALITY',
        businessAddress: 'TEST OFFICE', submittedBy: 'TEST REPRESENTATIVE', designation: 'Authorized Representative', date: '2026-11-27', closingDate: '2026-12-03',
        municipality: 'Salay', province: 'Misamis Oriental', slccVariant: 'none',
        items: [{ id: 'radio', qty: '2', quantity: '2', unit: 'pcs', specificationLines: [{ text: 'Radio' }] }], priceValues: { radio: { price: '1000' } } }
      const tabbing = getBidPackageDocuments({ setup, project: { closing_date: 'outdated invalid date' } })[0]
      assert.equal(tabbing.name, 'TABBING.pdf')
      const coverUrl = await tabbing.generate()
      try {
        const coverPages = await readPdfLayout(coverUrl, 'package TABBING')
        const cover = coverPages.flatMap(page => page.fragments.map(part => part.str)).join(' ')
        const labels = [['TECHNICAL', 'ORIGINAL COPY'], ['TECHNICAL', 'COPY 1'], ['TECHNICAL', 'COPY 2'], ['FINANCIAL', 'COPY 1'], ['FINANCIAL', 'COPY 2'], ['FINANCIAL', 'ORIGINAL COPY'], ['TECHNICAL', 'ENVELOPE'], ['FINANCIAL', 'ENVELOPE']]
        for (const [index, pair] of labels.entries()) {
          for (const [line, label] of pair.entries()) {
            const fragment = coverPages[index].fragments.find(part => part.str === label && Math.abs(part.y - (line ? 610.13 : 565.13)) < 1)
            assert.ok(fragment, 'Missing aligned cover label: ' + label)
            assert.ok(Math.abs(fragment.x + fragment.width / 2 - 296) < 1, 'Cover label must be centered')
          }
        }
        assert.match(cover, /TEST PROJECT TITLE/)
        assert.match(cover, /DECEMBER 3, 2026/)
        assert.doesNotMatch(cover, /DOCUMENT NOT YET AVAILABLE/)
        if (!referenceNumber.trim()) assert.doesNotMatch(cover, forbidden)
        else assert.match(cover, /TEST-REF-123/)
      } finally { URL.revokeObjectURL(coverUrl) }
      for (const [name, generate] of generators) {
        const url = await generate(setup)
        try {
          const pages = await readPdfLayout(url, name)
          const text = pages.flatMap(page=>page.fragments.map(part=>part.str)).join(' ')
          if (['slccPdf', 'ongoingContractsPdf'].includes(name) && !referenceNumber.trim()) {
            const title = pages[0].fragments.find(part => part.str === 'PROJECT TITLE')
            const heading = pages[0].fragments.find(part => part.str.startsWith(name === 'slccPdf' ? "STATEMENT OF BIDDER'S" : 'STATEMENT OF ALL ITS'))
            assert.ok(heading.y - title.y < 45, name + ' must close the blank reference gap')
          }
          if (name === 'nfccPdf' && !referenceNumber.trim()) {
            const title = pages[0].fragments.find(part => part.str === 'PROJECT TITLE')
            const contractor = pages[0].fragments.find(part => part.str === 'CONTRACTOR')
            assert.ok(contractor.y - title.y < 40, 'NFCC must close the omitted reference row gap')
            assert.match(text, /undersigned/)
          }
          if (!referenceNumber.trim()) assert.doesNotMatch(text, forbidden, bidderId+' '+name+' blank reference label')
          else assert.match(text, /TEST-REF-123/, bidderId+' '+name+' populated reference missing')
        } finally { URL.revokeObjectURL(url) }
      }
    }
  } finally { globalThis.fetch = originalFetch; globalThis.Image = originalImage; await server.close() }
})
