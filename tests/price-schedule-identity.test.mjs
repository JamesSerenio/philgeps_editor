import assert from 'node:assert/strict'
import test from 'node:test'
import { priceScheduleIdentity, loadPriceSchedule, readPriceScheduleCache } from '../src/lib/priceScheduleIdentity.js'

test('blank reference numbers use distinct project identities; existing references stay compatible', () => {
  assert.equal(priceScheduleIdentity('one', '  '), 'project:one')
  assert.notEqual(priceScheduleIdentity('one', ''), priceScheduleIdentity('two', ''))
  assert.equal(priceScheduleIdentity('one', ' REF-123 '), 'REF-123')
})

function database(records, reads) {
  return { from() {
    let key
    const query = {
      select() { return query },
      eq(column, value) { assert.equal(column, 'reference_number'); key = value; reads.push(value); return query },
      order() { return query },
      limit() { return Promise.resolve({ data: records[key] || [], error: null }) },
    }
    return query
  } }
}

test('prices saved before a reference exists remain available after assigning one', async () => {
  const record = { id: 'saved-row', total_prices_per_unit: { item: { price: '125.00' } } }
  const reads = []
  const db = database({ 'project:one': [record] }, reads)
  assert.deepEqual((await loadPriceSchedule(db, 'one', '')).data, [record])
  assert.deepEqual((await loadPriceSchedule(db, 'one', 'REF-NEW')).data, [record])
  assert.deepEqual(reads, ['project:one', 'REF-NEW', 'project:one'])
})

test('existing reference prices take priority and other blank projects stay separate', async () => {
  const record = { id: 'legacy', total_prices_per_unit: { item: 50 } }
  const db = database({ REF: [record] }, [])
  assert.deepEqual((await loadPriceSchedule(db, 'one', 'REF')).data, [record])
  assert.deepEqual((await loadPriceSchedule(db, 'two', '')).data, [])
})

test('unsaved project price backups survive assignment of a reference', () => {
  const backup = { dirty: true, values: { item: '125.00' } }
  const storage = { getItem: key => key === 'philgeps-price-schedule:project:one' ? JSON.stringify(backup) : null }
  assert.deepEqual(readPriceScheduleCache(storage, 'one', 'REF-NEW'), backup)
  assert.equal(readPriceScheduleCache(storage, 'two', ''), null)
})
