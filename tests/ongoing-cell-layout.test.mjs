import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'

test('ongoing details wrap inside cells at readable font size and keep the signature below the table', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url, options) => {
    if (typeof url === 'string' && (url.startsWith('/pdf/') || url.startsWith('/fonts/'))) {
      return new Response(await readFile(path.join(process.cwd(), 'public', decodeURIComponent(url))))
    }
    return originalFetch(url, options)
  }
  try {
    const { generateOngoingContractsPreview } = await server.ssrLoadModule('/src/services/pdf/ongoingContractsPdf.js')
    const { ongoingContractsWord } = await server.ssrLoadModule('/src/services/word/ongoingContractsWord.js')
    const { Document, Packer } = await import('docx')
    const wordSections = ongoingContractsWord({ setup: { bidderId: 'mikata', bidderName: 'MIKATA CORPORATION' } })
    assert.ok((await Packer.toBuffer(new Document({ sections: wordSections }))).length > 1000)
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    for (const long of [false, true]) {
      const nature = 'PURCHASE OF SOLAR LIGHTS FOR MUNICIPAL AND BARANGAY STREET'
      const url = await generateOngoingContractsPreview({
        bidderId: 'mikata', bidderName: 'MIKATA CORPORATION', submittedBy: 'TEST REPRESENTATIVE',
        date: '2026-11-25', ongoingEntries: { government: [{
          ownerDetails: 'LGU SUMILAO', natureOfWork: long ? nature.repeat(50) : nature,
          description: 'NONE', percentage: 'NONE', awardCompletion: 'A. 100,000.00\nB. 30 DAYS', dates: '',
        }] },
      })
      try {
        const loading = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()), useSystemFonts: true })
        try {
          const pdf = await loading.promise
          const allText = [], natureText = []
          let signerPage = -1, lastNaturePage = -1
          for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex++) {
            const page = await pdf.getPage(pageIndex)
            const content = (await page.getTextContent()).items
            for (const part of content.filter(part => part.str.trim())) assert.ok(Math.abs(part.height - 10) < 0.01, `Non-10pt text: ${part.str}`)
            if (pageIndex > 1) {
              assert.ok(!content.some(part => part.str === "Bidder's Role" || part.str === 'Name of Contract'), 'Continuation repeated the table header')
            }
            allText.push(...content)
            const cellText = content.filter(part => part.transform[4] >= 247 && part.transform[4] < 346.43 && part.transform[5] < page.view[3] - (pageIndex === 1 ? 367.25 : 40) && Math.abs(part.height - 10) < 0.01 && part.str !== 'NONE')
            for (const part of cellText) {
              assert.ok(part.transform[4] + part.width <= 346.43 - 4)
              natureText.push(part.str)
              lastNaturePage = pageIndex
            }
            if (content.some(part => part.str === 'TEST REPRESENTATIVE')) signerPage = pageIndex
          }
          assert.ok(natureText.length > 1)
          assert.equal(natureText.join('').replace(/\s/g, ''), (long ? nature.repeat(50) : nature).replace(/\s/g, ''))
          assert.equal(allText.filter(part => part.str === 'TEST REPRESENTATIVE').length, 1)
          const datesDefaults = allText.filter(part => part.str === 'NONE' && Math.abs(part.height - 10) < 0.01 && part.transform[4] >= 660 && part.transform[4] < 760)
          assert.equal(datesDefaults.length, 1, 'Only the untouched private dates cell should show NONE')
          assert.ok(signerPage >= lastNaturePage)
          if (long) assert.ok(pdf.numPages > 1)
          else assert.equal(pdf.numPages, 1, 'Short government and private rows should share one table and page')
        } finally { await loading.destroy() }
      } finally { URL.revokeObjectURL(url) }
    }
  } finally { globalThis.fetch = originalFetch; await server.close() }
})
