import assert from 'node:assert/strict'
import test from 'node:test'
import { priceAmounts, preciseCents } from '../src/lib/pricePrecision.js'
import { summaryRows } from '../src/lib/summaryPrices.js'
import { buildBidFormData } from '../src/lib/bidFormData.js'
import { createServer } from 'vite'

test('three and five decimal deductions are preserved until the delivered total is rounded', () => {
  for (const deduction of ['11.111', '11.11111']) {
    const amounts = priceAmounts('38900', deduction, '18')
    assert.equal(amounts.totalCents, 70000000)
  }
  assert.equal(priceAmounts('38900', '11.11111', '18').adjustedCents, 3888888.889)
  assert.equal(preciseCents('0.00001'), 0.001)
  assert.equal(priceAmounts('0.00001', '', 1000).totalCents, 1)
  assert.equal(priceAmounts('0.0005', '', 10).totalCents, 1)
})

test('summary and bid form use the same precise price and final cent rounding', () => {
  const items = [{ id: 'radio', qty: '18', unit: 'sets', specificationLines: [{ text: 'Radio' }] }]
  const priceValues = { radio: { price: '38900', deduction: '11.11111' } }
  assert.equal(summaryRows(items, priceValues)[0].amountCents, 70000000)
  assert.equal(buildBidFormData({ items, priceValues }).totalCents, 70000000)
})

test('PDF price schedule displays the precise unit price and the correct delivered total', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { generatePriceSchedulePreview } = await server.ssrLoadModule('/src/services/pdf/priceSchedulePdf.js')
    const url = await generatePriceSchedulePreview({
      items: [{ id: 'radio', qty: '18', unit: 'sets', specificationLines: [{ text: 'Radio' }] }],
      priceValues: { radio: { price: '38900', deduction: '11.11111' } },
    })
    try {
      const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer())
      const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
      const loading = getDocument({ data: bytes, useSystemFonts: true })
      try {
        const pdf = await loading.promise
        const text = []
        for (let page = 1; page <= pdf.numPages; page++) {
          text.push(...(await (await pdf.getPage(page)).getTextContent()).items.map(item => item.str))
        }
        assert.ok(text.includes('38,888.88889'))
        assert.ok(text.includes('700,000.00'))
        assert.ok(!text.includes('700,000.02'))
      } finally { await loading.destroy() }
    } finally { URL.revokeObjectURL(url) }
  } finally { await server.close() }
})
