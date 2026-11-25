import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib'
import { Document, Packer } from 'docx'
import JSZip from 'jszip'
import { pathToFileURL } from 'node:url'

test('SLCC and Ongoing PDFs embed Bookman Old Style and use 10pt for every text run', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => typeof url === 'string' && (url.startsWith('/fonts/') || url.startsWith('/pdf/'))
    ? new Response(await readFile(path.join(process.cwd(), 'public', decodeURIComponent(url))))
    : originalFetch(url, options)
  try {
    const { generateSlccPreview } = await server.ssrLoadModule('/src/services/pdf/slccPdf.js')
    const { generateOngoingContractsPreview } = await server.ssrLoadModule('/src/services/pdf/ongoingContractsPdf.js')
    const { ongoingContractsWord } = await server.ssrLoadModule('/src/services/word/ongoingContractsWord.js')
    const { slccWord } = await server.ssrLoadModule('/src/services/word/slccWord.js')
    const { GlobalWorkerOptions } = await import('pdfjs-dist')
    GlobalWorkerOptions.workerSrc = pathToFileURL(path.resolve('node_modules/pdfjs-dist/build/pdf.worker.min.mjs')).href
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    for (const generate of [generateSlccPreview, generateOngoingContractsPreview]) {
      for (const slccVariant of ['cctv', 'streetlight', 'none']) {
        const url = await generate({ bidderId: 'mikata', bidderName: 'MIKATA PRIME CORPORATION',
          businessAddress: 'ZONE 13, CARMEN, CAGAYAN DE ORO CITY, MISAMIS ORIENTAL, 9000',
          procuringEntity: 'MUNICIPALITY OF SUMILAO, BUKIDNON', projectTitle: 'SUPPLY AND DELIVERY OF WATER METER AND FITTINGS',
          referenceNumber: '132124', submittedBy: 'JHO ANN Q. CLEOPAS', designation: 'Authorized Representative', date: '2026-11-25', slccVariant,
          slccEntries: { [slccVariant]: { government: { natureOfWork: 'PURCHASE / SUPPLY / INSTALLATION' } } },
        })
        try {
          const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
          const pdf = await PDFDocument.load(bytes)
          for (const page of pdf.getPages()) {
            const fonts = page.node.Resources().lookup(PDFName.of('Font'), PDFDict)
            for (const ref of fonts.values()) {
              const name = pdf.context.lookup(ref, PDFDict).get(PDFName.of('BaseFont')).toString()
              assert.match(name, /Bookman/i)
            }
          }
          const loading = getDocument({ data: bytes, useSystemFonts: true })
          try {
            const parsed = await loading.promise
            for (let index = 1; index <= parsed.numPages; index++) {
              const content = await (await parsed.getPage(index)).getTextContent()
              for (const part of content.items.filter(part => part.str.trim())) {
                assert.ok(Math.abs(part.height - 10) < 0.01, `Expected 10pt for ${part.str}; got ${part.height}`)
              }
              if (generate === generateSlccPreview && slccVariant !== 'none') {
                const nature = content.items.filter(part => part.transform[4] >= 262 && part.transform[4] < 352 && part.transform[5] < 350 && part.str.trim() && part.str !== 'NONE')
                assert.equal(nature.map(part => part.str).join('').replace(/\s/g, ''), 'PURCHASE/SUPPLY/INSTALLATION')
                for (const part of nature) assert.ok(part.transform[4] + part.width <= 352 - 4, `Nature of Work overflowed its column: ${JSON.stringify({ text: part.str, x: part.transform[4], width: part.width })}`)
              }
            }
          } finally { await loading.destroy() }
        } finally { URL.revokeObjectURL(url) }
      }
    }
    const setup = { bidderId: 'mikata', bidderName: 'MIKATA PRIME CORPORATION', slccVariant: 'none' }
    for (const makeWord of [ongoingContractsWord, slccWord]) {
      const sections = await makeWord({ setup, document: { name: 'SLCC.pdf', generate: () => generateSlccPreview(setup) } })
      const zip = await JSZip.loadAsync(await Packer.toBuffer(new Document({ sections })))
      const xml = await zip.file('word/document.xml').async('string')
      for (const run of xml.match(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g) ?? []) {
        if (!/<w:t(?:\s[^>]*)?>[^<]+<\/w:t>/.test(run)) continue
        assert.match(run, /w:ascii="Bookman Old Style"/)
        assert.match(run, /<w:sz w:val="20"\s*\/>/)
      }
    }
  } finally { globalThis.fetch = originalFetch; await server.close() }
})
