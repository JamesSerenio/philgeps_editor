import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getOngoingContractEntry,
  getOngoingContractEntries,
  getOngoingContractType,
  ongoingContractDefaults,
} from '../src/lib/ongoingContracts.js'

test('ongoing contract rows initially contain NONE', () => {
  assert.deepEqual(getOngoingContractEntry({}, 'government'), ongoingContractDefaults)
  assert.deepEqual(getOngoingContractEntry({}, 'private'), ongoingContractDefaults)
})

test('legacy pipe-delimited contract data remains usable', () => {
  const entry = getOngoingContractEntry({
    ongoingEntries: { government: 'LGU SUMILAO|SUPPLY|Materials|100%|1000|May 7, 2026' },
  }, 'government')
  assert.equal(entry.ownerDetails, 'LGU SUMILAO')
  assert.equal(entry.awardCompletion, '1000')
})

test('government and private rows are separate', () => {
  const value = {
    ongoingContractType: 'private',
    ongoingEntries: {
      government: { ownerDetails: 'LGU SUMILAO' },
      private: { ownerDetails: 'PRIVATE OWNER' },
    },
  }
  assert.equal(getOngoingContractType(value), 'private')
  assert.equal(getOngoingContractEntry(value, 'government').ownerDetails, 'LGU SUMILAO')
  assert.equal(getOngoingContractEntry(value, 'private').ownerDetails, 'PRIVATE OWNER')
})

test('each contract type supports multiple independently editable rows', () => {
  const rows = getOngoingContractEntries({
    ongoingEntries: {
      government: [
        { ownerDetails: 'LGU SUMILAO' },
        { ownerDetails: 'LGU MALITBOG' },
      ],
    },
  }, 'government')
  assert.equal(rows.length, 2)
  assert.equal(rows[0].ownerDetails, 'LGU SUMILAO')
  assert.equal(rows[1].ownerDetails, 'LGU MALITBOG')
  assert.equal(rows[0].description, 'NONE')
})
