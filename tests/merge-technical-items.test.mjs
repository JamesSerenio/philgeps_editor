import assert from 'node:assert/strict'
import test from 'node:test'
import { mergeTechnicalItems, groupTechnicalItems } from '../src/lib/technicalSpecs.js'
import { summaryRows } from '../src/lib/summaryPrices.js'
import { createServer } from 'vite'
import { PDFDocument } from 'pdf-lib'

const items = [
  { id: 'radio', itemNo: '1', qty: '18', unit: 'sets', specificationLines: [{ id: 'a', text: 'Base radio', bold: true, compliance: 'COMPLY' }] },
  { id: 'handheld', itemNo: '2', qty: '', unit: '', specificationLines: [{ id: 'b', text: 'Two handheld radios', marker: '•', compliance: 'COMPLY' }] },
  { id: 'other', itemNo: '3', qty: '2', unit: 'pcs', specificationLines: [{ id: 'c', text: 'Other supplies' }] },
]

test('merge keeps all specification formatting, the first identity, and one quantity and unit', () => {
  const before = JSON.stringify(items)
  const merged = mergeTechnicalItems(items, 1, 2)
  assert.equal(merged.length, 3)
  assert.equal(merged[0].id, 'radio')
  assert.equal(merged[0].qty, '18')
  assert.equal(merged[0].unit, 'sets')
  assert.equal(merged[0].mergeGroup, merged[1].mergeGroup)
  assert.equal(merged[0].sharedCompliance, 'COMPLY')
  assert.deepEqual(merged[0].specificationLines, items[0].specificationLines)
  assert.deepEqual(merged[1].specificationLines, items[1].specificationLines)
  assert.equal(merged[1].itemNo, '2')
  assert.equal(merged[2].itemNo, '3')
  assert.equal(groupTechnicalItems(merged)[0].itemNo, '1, 2')
  assert.equal(JSON.stringify(items), before)
})

test('merged items contribute one price, without adding the removed item price', () => {
  const merged = mergeTechnicalItems(items, 1, 2)
  const rows = summaryRows(merged, { radio: { price: '100' }, handheld: { price: '200' }, other: { price: '50' } })
  assert.equal(rows.length, 2)
  assert.equal(rows[0].quantity, 18)
  assert.equal(rows[0].amountCents, 180000)
  assert.equal(rows.reduce((total, row) => total + row.amountCents, 0), 190000)
})

test('invalid and single-item merge ranges are rejected', () => {
  for (const [from, through] of [[0, 2], [1, 1], [2, 1], [1, 4], [1.5, 2]]) {
    assert.throws(() => mergeTechnicalItems(items, from, through))
  }
})

test('multiple specification lines retain their original item number inside a shared group', () => {
  const source = items.map(item => ({ ...item, specificationLines: [...item.specificationLines] }))
  source[0].specificationLines.push({ id: 'detail', text: 'Base radio detail', compliance: 'COMPLY' })
  const grouped = groupTechnicalItems(mergeTechnicalItems(source, 1, 2))
  assert.deepEqual(grouped[0].specificationLines.map(line => line.sourceItemNumber), ['1', '1', '2'])
  assert.equal(grouped[1].itemNo, '3')
})

test('merged specifications and compliance survive persistence and PDF generation', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
    const { generateTechnicalSpecsBytes } = await server.ssrLoadModule('/src/services/pdf/technicalSpecsPdf.js')
    const merged = copyEditorItems(mergeTechnicalItems(items, 1, 2), 'technical_specs')
    assert.equal(merged[0].mergeGroup, merged[1].mergeGroup)
    assert.equal(merged[0].sharedCompliance, 'COMPLY')
    const bytes = await generateTechnicalSpecsBytes({ bidderId: 'mikata', items: merged })
    const pdf = await PDFDocument.load(bytes)
    assert.ok(pdf.getPageCount() > 0)
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true })
    const parsed = await loading.promise
    try {
      const content = (await (await parsed.getPage(1)).getTextContent()).items
      const text = content.map(item => item.str)
      assert.equal(text.filter(value => value === 'COMPLY').length, 2)
      assert.ok(text.some(value => value.includes('Base radio')))
      assert.ok(text.some(value => value.includes('Two handheld radios')))
      const numbers = content.filter(item => item.transform[4] < 100).map(item => item.str)
      for (const number of ['1', '2', '3']) assert.ok(numbers.includes(number), `Missing original item number ${number}`)
    } finally { await loading.destroy() }
    const { technicalWord } = await server.ssrLoadModule('/src/services/word/technicalWord.js')
    const { Document, Packer } = await import('docx')
    const sections = await technicalWord({ technical: merged })
    const word = await Packer.toBuffer(new Document({ sections }))
    assert.ok(word.length > 1000)
  } finally { await server.close() }
})

test('price schedule and summary keep separate original numbers with one shared price, including page breaks', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { generatePriceSchedulePreview } = await server.ssrLoadModule('/src/services/pdf/priceSchedulePdf.js')
    const { generateSummaryPreview } = await server.ssrLoadModule('/src/services/pdf/summaryPdf.js')
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    for (const long of [false, true]) {
      const original = items.slice(0, 2).map(item => ({ ...item, specificationLines: item.specificationLines.map(line => ({ ...line })) }))
      if (long) original[0].specificationLines[0].text = 'Base radio specifications '.repeat(400)
      const merged = mergeTechnicalItems(original, 1, 2)
      for (const generate of [generatePriceSchedulePreview, generateSummaryPreview]) {
        const url = await generate({ items: merged, priceValues: { radio: { price: '100' } } })
        try {
          const loading = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()), useSystemFonts: true })
          try {
            const pdf = await loading.promise
            const numbers = [], text = []
            for (let page = 1; page <= pdf.numPages; page++) {
              const content = (await (await pdf.getPage(page)).getTextContent()).items
              numbers.push(...content.filter(part => part.transform[4] >= 36 && part.transform[4] < 76 && /^\d+(?:, \d+)*$/.test(part.str)).map(part => part.str))
              text.push(...content.map(part => part.str))
            }
            assert.deepEqual(numbers, ['1', '2'])
            assert.equal(text.filter(value => value === '1,800.00').length, 2)
            if (long) assert.ok(pdf.numPages > 1)
          } finally { await loading.destroy() }
        } finally { URL.revokeObjectURL(url) }
      }
    }
  } finally { await server.close() }
})
