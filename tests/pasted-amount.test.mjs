import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pastedAmount } from '../src/lib/pastedAmount.js'

test('copied numbers and peso currency cells normalize without losing decimals', () => {
  for (const [input, expected] of [
    ['200','200'], ['0','0'], ['13,000.00','13000.00'],
    ['₱ 13,000.50','13000.50'], ['PHP 1,234.56','1234.56'],
    ['P 1,200','1200'], [' 1,200.25\r\n','1200.25'],
    ['1,200.00 PHP','1200.00'], ['₱\u00a0100.50','100.50'], ['.50','.50'],
  ]) assert.equal(pastedAmount(input), expected)
})

test('invalid amounts and multiple cells cannot be silently converted to another price', () => {
  for (const input of ['', 'abc', '-100', '₱ -100', '100\t200', '100\n200',
    '12,34.56', '1.234,56', '100.123', '1e3', '200 pcs', '(100.00)']) {
    assert.equal(pastedAmount(input), null, input)
  }
})
