import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

// Exercise the real service with a query stub; no live project is modified.
const metadata = await readFile(new URL('../src/lib/projectMetadata.js', import.meta.url), 'utf8')
const metadataUrl = 'data:text/javascript;base64,' + Buffer.from(metadata).toString('base64')
const source = (await readFile(new URL('../src/services/editorStateService.js', import.meta.url), 'utf8'))
  .replace("import { supabase } from '../supabase'", 'const supabase = globalThis.__editorSaveTestDb')
  .replace("'../lib/projectMetadata'", JSON.stringify(metadataUrl))
const calls = []
let responses = []
globalThis.__editorSaveTestDb = {
  from(table) {
    const call = { table, filters: [] }
    calls.push(call)
    const query = {
      insert(payload) { call.payload = payload; return query },
      update(payload) { call.payload = payload; return query },
      eq(key, value) { call.filters.push([key, value]); return query },
      select(columns) { call.columns = columns; return query },
      single() { return Promise.resolve(responses.shift()) },
    }
    return query
  },
}
const { saveEditorState } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))

test('save retries canceled statements with the same revision and returns only save metadata', async () => {
  calls.length = 0
  responses = [{ error: { code: '57014', message: 'statement timeout' } }, { data: { project_id: 'project', updated_at: 'new' } }]
  const result = await saveEditorState('project', { omnibus: { templateVariant: 'old_default' } }, { expectedUpdatedAt: 'original' })
  assert.equal(result.updated_at, 'new')
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.equal(call.columns, 'project_id,updated_at')
    assert.deepEqual(call.filters, [['project_id', 'project'], ['updated_at', 'original']])
  }
})

test('save does not retry revision conflicts or permission failures', async () => {
  for (const code of ['PGRST116', '42501']) {
    calls.length = 0
    responses = [{ error: { code, message: 'Save rejected' } }]
    await assert.rejects(saveEditorState('project', { omnibus: {} }, { expectedUpdatedAt: 'old' }))
    assert.equal(calls.length, 1)
  }
})

test('persistent timeouts stop after three attempts and explain that the draft remains', async () => {
  calls.length = 0
  responses = Array.from({ length: 3 }, () => ({ error: { code: '57014' } }))
  await assert.rejects(saveEditorState('project', { omnibus: {} }, { expectedUpdatedAt: 'old' }), /draft is retained/)
  assert.equal(calls.length, 3)
})

test('bid declaration save verifies shared metadata with a narrow project query', async () => {
  calls.length = 0
  responses = [{ data: { project_id: 'project', updated_at: 'new' } }, { data: { title: 'Project', is_manual: false } }]
  await saveEditorState('project', { bid_security: { documentSetup: { projectTitle: 'Project' } } }, { expectedUpdatedAt: 'old' })
  assert.equal(calls[1].table, 'philgeps_posts')
  assert.notEqual(calls[1].columns, '*')
})
