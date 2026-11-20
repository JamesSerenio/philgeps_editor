// Shared post fields only. Company/document settings remain in editor JSON.
export function projectMetadataPatch(setup = {}, project = {}) {
  const mapping = { title:'projectTitle', reference_number:'referenceNumber', procuring_entity:'procuringEntity', lgu:'municipality', area_of_delivery:'province' }
  const patch = {}
  for (const [column,key] of Object.entries(mapping)) {
    if (Object.hasOwn(setup,key) && (String(setup[key] ?? '').trim() || project.is_manual === true)) patch[column] = String(setup[key] ?? '').trim()
  }
  if (project.is_manual === true && Object.hasOwn(setup,'closingDate')) {
    const value = String(setup.closingDate ?? '').trim()
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error('Deadline must be YYYY-MM-DD.')
    patch.manual_deadline = value || null
  }
  return patch
}
export function assertSharedMetadata(project,setup) {
  const expected=projectMetadataPatch(setup,project)
  const missing=Object.keys(expected).filter(key => String(project[key] ?? '').trim() !== String(expected[key] ?? '').trim())
  if (missing.length) throw Error('Document data saved, but shared project information was not saved ('+missing.join(', ')+'). Apply supabase/project_metadata_sync.sql in this Supabase project, then retry. Your inputs are retained.')
}

export function firstProjectText(project,keys,fallback='') {
  for (const key of keys) { const value=String(project[key] ?? '').trim(); if(value) return value }
  return fallback
}
