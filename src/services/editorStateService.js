import { supabase } from '../supabase'

const fields = ['technical_specs', 'schedule_requirements']

// Reject unsafe data rather than silently dropping functions or event objects.
export function copyEditorItems(value, section) {
  if (!Array.isArray(value)) throw new Error('Editor data must be an array.')
  const copyString = (object, key) => {
    if (typeof object?.[key] !== 'string') throw new Error('Invalid editor field: ' + key)
    return object[key]
  }
  return value.map((item) => {
    if (!item || Object.getPrototypeOf(item) !== Object.prototype) throw new Error('Invalid editor item.')
    if (!Array.isArray(item.specificationLines) || !item.specificationLines.length) throw new Error('Each item needs a specification line.')
    const result = Object.fromEntries(['id', 'itemNo', 'qty', 'unit'].map((key) => [key, copyString(item, key)]))
    if (section === 'schedule_requirements') result.deliveryPeriod = copyString(item, 'deliveryPeriod')
    result.specificationLines = item.specificationLines.map((line) => {
      const row = { id: copyString(line, 'id'), text: copyString(line, 'text') }
      if (section === 'technical_specs') row.compliance = copyString(line, 'compliance')
      return row
    })
    return result
  })
}

export async function getEditorState(projectId) {
  const { data, error } = await supabase.from('bid_docs_editor_state').select('*').eq('project_id', projectId).maybeSingle()
  if (error) throw error
  if (data) for (const field of fields) if (data[field] != null) data[field] = copyEditorItems(data[field], field)
  return data
}

export async function saveEditorState(projectId, patch) {
  const payload = { project_id: projectId, editor_status: 'editing', updated_at: new Date().toISOString() }
  for (const field of Object.keys(patch)) {
    if (!fields.includes(field)) throw new Error('Unsupported editor section: ' + field)
    payload[field] = copyEditorItems(patch[field], field)
  }
  if (!fields.some((field) => Object.hasOwn(payload, field))) throw new Error('No editor data to save.')
  // PostgREST updates only columns in this single-object payload on conflict.
  // Never include the other section as null or read/merge an outdated snapshot.
  const { error } = await supabase.from('bid_docs_editor_state').upsert(payload, { onConflict: 'project_id', defaultToNull: false })
  if (error) throw error
}

export function saveTechnicalSpecs(projectId, value) {
  return saveEditorState(projectId, { technical_specs: value })
}

export function saveScheduleRequirements(projectId, value) {
  return saveEditorState(projectId, { schedule_requirements: value })
}
