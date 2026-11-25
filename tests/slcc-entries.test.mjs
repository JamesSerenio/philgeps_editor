import assert from 'node:assert/strict'
import test from 'node:test'
import { getSlccEntry, getSlccContractType } from '../src/lib/slccEntries.js'

test('NONE clears every contract detail despite saved streetlight details', () => {
  const data = { bidderId: 'mikata', slccVariant: 'none', slccEntries: { streetlight: { government: { description: 'Construction Materials' } } } }
  const entry = getSlccEntry(data)
  assert.equal(Object.keys(entry).length, 6)
  assert.ok(Object.values(entry).every(value => value === 'NONE'))
})

test('government/private overrides survive serialization and switching, including cleared values', () => {
  const data = JSON.parse(JSON.stringify({ bidderId: 'mikata', slccVariant: 'streetlight', slccContractTypes: { streetlight: 'private' }, slccEntries: { streetlight: {
    government: { awardCompletion: 'A. 500.00', dates: 'JANUARY 1, 2026' },
    private: { awardCompletion: 'A. 900.00', dates: '', percentage: '75%' },
  } } }))
  assert.equal(getSlccContractType(data), 'private')
  assert.equal(getSlccEntry(data).awardCompletion, 'A. 900.00')
  assert.equal(getSlccEntry(data).dates, '')
  data.slccContractTypes.streetlight = 'government'
  assert.equal(getSlccEntry(data).awardCompletion, 'A. 500.00')
})

test('CCTV defaults retained without leaking Mikata history into other companies', () => {
  assert.match(getSlccEntry({ bidderId: 'mikata', slccVariant: 'cctv' }).awardCompletion, /716,500.00/)
  for (const bidderId of ['builtech', 'manotech', 'mega-pluto']) {
    assert.equal(getSlccEntry({ bidderId }).awardCompletion, undefined)
  }
})
