import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createServer } from 'vite'
import { quantityUnitLayout, quantityText, quantityColumnWidths } from '../src/lib/quantityUnitLayout.js'

test('legacy layouts stay separate and blank units are accepted in every format', () => {
  assert.equal(quantityUnitLayout(undefined), 'separate')
  assert.equal(quantityUnitLayout('unknown'), 'separate')
  for (const mode of ['separate', 'quantity_only', 'merged']) {
    assert.equal(quantityText({ qty: '65', unit: '' }, mode), '65')
  }
  assert.equal(quantityText({ qty: '65', unit: 'pcs' }, 'merged'), '65 pcs')
  assert.equal(quantityText({ qty: '65', unit: 'pcs' }, 'quantity_only'), '65')
})

test('optional and merged columns retain table width and all price-column boundaries', () => {
  const widths = [40,154,48,42,42,70,80,80,68,72,72]
  const sum = values => values.reduce((n,value) => n + value, 0)
  for (const mode of ['separate','quantity_only','merged']) {
    const columns = quantityColumnWidths(widths,3,4,mode)
    assert.equal(sum(columns),sum(widths))
    assert.equal(sum(columns.slice(0,5)),sum(widths.slice(0,5)))
    assert.deepEqual(columns.slice(5),widths.slice(5))
    assert.equal(columns.filter(width => width > 0).length,mode==='separate'?11:10)
  }
  assert.deepEqual(widths,[40,154,48,42,42,70,80,80,68,72,72])
})

test('saved setup layouts and original numeric quantities survive existing persistence and calculation adapters', async () => {
  const server = await createServer({server:{middlewareMode:true,ws:false},appType:'custom'})
  try {
    const {copyEditorItems} = await server.ssrLoadModule('/src/services/editorStateService.js')
    const {setupProject} = await server.ssrLoadModule('/src/lib/documentSetup.js')
    const {validateTechnicalItems} = await server.ssrLoadModule('/src/lib/technicalSpecs.js')
    const {summaryRows} = await server.ssrLoadModule('/src/lib/summaryPrices.js')
    const items=[{id:'tile',itemNo:'1',qty:'65',unit:'',specificationLines:[{id:'line',text:'Ceramic tiles',compliance:'COMPLY'}]}]
    assert.deepEqual(validateTechnicalItems(items),[])
    const expected=summaryRows(items,{tile:{price:200,deduction:0}})
    for(const qtyUnitLayout of ['quantity_only','merged','separate']) {
      const stored=copyEditorItems({documentSetup:{qtyUnitLayout}},'bid_security')
      const setup=setupProject(JSON.parse(JSON.stringify(stored)).documentSetup)
      assert.equal(setup.qtyUnitLayout,qtyUnitLayout)
      assert.deepEqual(summaryRows(copyEditorItems(items,'technical_specs'),{tile:{price:200,deduction:0}}),expected)
      assert.equal(items[0].qty,'65')
    }
  } finally {await server.close()}
})
