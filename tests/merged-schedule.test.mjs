import assert from 'node:assert/strict'
import test from 'node:test'
import { createServer } from 'vite'
import { mergeTechnicalItems } from '../src/lib/technicalSpecs.js'

test('delivery schedule shares quantity, unit and period while keeping separate item numbers across pages', async () => {
  const server = await createServer({ server: { middlewareMode: true, ws: false }, appType: 'custom' })
  try {
    const { generateScheduleRequirementsPreview } = await server.ssrLoadModule('/src/services/pdf/schedulePdf.js')
    const { copyEditorItems } = await server.ssrLoadModule('/src/services/editorStateService.js')
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs')
    for (const long of [false, true]) {
      const original = [
        { id: 'radio', qty: '18', unit: 'sets', specificationLines: [{ id: 'base', text: long ? 'Base radio specifications '.repeat(400) : 'Base radio' }] },
        { id: 'handheld', qty: '', unit: '', specificationLines: [{ id: 'handheld-spec', text: 'Two handheld radios' }] },
      ]
      const items = copyEditorItems(mergeTechnicalItems(original, 1, 2).map(item => ({ ...item, deliveryPeriod: '30 days' })), 'schedule_requirements')
      const url = await generateScheduleRequirementsPreview({ items })
      try {
        const loading = getDocument({ data: new Uint8Array(await (await fetch(url)).arrayBuffer()), useSystemFonts: true })
        try {
          const pdf = await loading.promise
          const text = [], numbers = []
          for (let p = 1; p <= pdf.numPages; p++) {
            const content = (await (await pdf.getPage(p)).getTextContent()).items
            text.push(...content.map(part => part.str))
            numbers.push(...content.filter(part => part.transform[4] >= 44 && part.transform[4] < 93 && /^\d+$/.test(part.str)).map(part => part.str))
          }
          assert.deepEqual(numbers, ['1', '2'])
          for (const value of ['18', 'sets', '30 days']) assert.equal(text.filter(part => part === value).length, 1, `Repeated shared ${value}`)
          assert.ok(text.some(part => part.includes('Two handheld radios')))
          if (long) assert.ok(pdf.numPages > 1)
        } finally { await loading.destroy() }
      } finally { URL.revokeObjectURL(url) }
    }
  } finally { await server.close() }
})
