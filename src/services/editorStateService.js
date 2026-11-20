
import { supabase } from '../supabase'
import { assertSharedMetadata } from '../lib/projectMetadata'

// =====================================================
// SUPABASE CONFIGURATION
// =====================================================

const TABLE = 'bid_docs_editor_state'

const JSON_FIELDS = [
  'technical_specs',
  'schedule_requirements',
  'bid_security',
  'omnibus',
  'contents',
]

const WRITABLE_FIELDS = new Set([
  ...JSON_FIELDS,
  'editor_status',
])

// =====================================================
// HELPERS
// =====================================================

function isRecord(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

function jsonCopy(value, name) {
  try {
    const json = JSON.stringify(value)

    if (json === undefined) {
      throw new Error('Not JSON serializable')
    }

    return JSON.parse(json)
  } catch {
    throw new Error(
      `Invalid ${name}: must be JSON-serializable.`
    )
  }
}

function text(value, fallback = '') {
  return value === null ||
    value === undefined
    ? fallback
    : String(value)
}

// =====================================================
// NORMALIZE TECHNICAL SPECIFICATIONS
// AND SCHEDULE REQUIREMENTS
// =====================================================

function normalizeRows(value, section) {
  if (value == null) {
    return null
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid ${section}: expected an array.`
    )
  }

  const rows = jsonCopy(value, section)

  return rows.map((item, itemIndex) => {
    if (!isRecord(item)) {
      throw new Error(
        `Invalid item ${itemIndex + 1} in ${section}.`
      )
    }

    // =====================================
    // FIX MISSING itemNo AND OTHER FIELDS
    // =====================================

    const itemId = text(
      item.id,
      `item-${itemIndex + 1}`
    )

    const itemNo = text(
      item.itemNo,
      String(itemIndex + 1)
    )

    const result = {
      ...item,

      id: itemId,

      itemNo:
        itemNo || String(itemIndex + 1),

      qty: text(item.qty),

      unit: text(item.unit),
    }

    // =====================================
    // SCHEDULE REQUIREMENTS
    // =====================================

    if (
      section === 'schedule_requirements' &&
      item.deliveryPeriod != null
    ) {
      result.deliveryPeriod = text(
        item.deliveryPeriod
      )
    }

    // =====================================
    // SPECIFICATION LINES
    // =====================================

    const sourceLines = Array.isArray(
      item.specificationLines
    )
      ? item.specificationLines
      : []

    result.specificationLines =
      sourceLines.map(
        (line, lineIndex) => {
          const lineId =
            `${itemId}-line-${lineIndex + 1}`

          // Support older string-only lines.
          if (typeof line === 'string') {
            return {
              id: lineId,
              text: line,

              ...(section ===
              'technical_specs'
                ? {
                    compliance: 'COMPLY',
                  }
                : {}),
            }
          }

          if (!isRecord(line)) {
            throw new Error(
              `Invalid specification line ${lineIndex + 1} in item ${itemIndex + 1}.`
            )
          }

          // Keep additional properties like
          // marker, underline and formatting.

          const normalized = {
            ...line,

            id: text(
              line.id,
              lineId
            ),

            text: text(line.text),
          }

          // =================================
          // AUTOMATIC COMPLY
          // =================================

          if (
            section === 'technical_specs'
          ) {
            normalized.compliance =
              text(
                line.compliance,
                'COMPLY'
              ) || 'COMPLY'
          }

          return normalized
        }
      )

    // =====================================
    // ALLOW A NEW EMPTY ITEM TO BE SAVED
    // =====================================

    if (
      section === 'technical_specs' &&
      result.specificationLines.length === 0
    ) {
      result.specificationLines = [
        {
          id: `${itemId}-line-1`,

          text: '',

          compliance: 'COMPLY',
        },
      ]
    }

    return result
  })
}

// =====================================================
// COPY AND VALIDATE EDITOR DATA
// =====================================================

export function copyEditorItems(
  value,
  section
) {
  if (!WRITABLE_FIELDS.has(section)) {
    throw new Error(
      'Unsupported editor section: ' +
      section
    )
  }

  if (section === 'editor_status') {
    return text(value, 'editing')
  }

  if (value == null) {
    return null
  }

  // =====================================
  // TECHNICAL + SCHEDULE
  // =====================================

  if (
    section === 'technical_specs' ||
    section === 'schedule_requirements'
  ) {
    return normalizeRows(
      value,
      section
    )
  }

  // =====================================
  // DECLARATIONS + TABLE OF CONTENTS
  // =====================================

  // Preserve nested data including
  // Document Setup and template settings.

  const copy = jsonCopy(
    value,
    section
  )

  if (
    (
      section === 'bid_security' ||
      section === 'omnibus'
    ) &&
    !isRecord(copy)
  ) {
    throw new Error(
      `Invalid ${section}: expected an object.`
    )
  }

  return copy
}

// =====================================================
// LOAD SAVED EDITOR DATA FROM SUPABASE
// =====================================================

export async function getEditorState(
  projectId
) {
  if (
    projectId == null ||
    String(projectId).trim() === ''
  ) {
    throw new Error(
      'Missing project ID.'
    )
  }

  const {
    data,
    error,
  } = await supabase
    .from(TABLE)
    .select('*')
    .eq(
      'project_id',
      String(projectId)
    )
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  // =====================================
  // RESTORE EACH SECTION
  // =====================================

  const restored = {
    ...data,
  }

  for (const section of JSON_FIELDS) {
    if (restored[section] != null) {
      restored[section] =
        copyEditorItems(
          restored[section],
          section
        )
    }
  }

  const setup = restored.bid_security?.documentSetup
  if (setup) {
    try {
      const result = await supabase.from('philgeps_posts').select('*').eq('id',String(projectId)).single()
      if (result.error || !result.data) throw Error('Shared project information could not be verified.')
      assertSharedMetadata(result.data,setup)
    } catch (error) {
      restored.__metadataPending = true
      restored.__metadataError = error.message
    }
  }
  return restored
}

// =====================================================
// SAVE EDITOR CHANGES TO SUPABASE
// =====================================================

export async function saveEditorState(
  projectId,
  patch,
  options = {}
) {
  if (
    projectId == null ||
    String(projectId).trim() === ''
  ) {
    throw new Error(
      'Missing project ID.'
    )
  }

  if (!isRecord(patch)) {
    throw new Error(
      'Invalid editor changes.'
    )
  }

  const changedFields =
    Object.keys(patch)

  if (!changedFields.length) {
    throw new Error(
      'No editor data to save.'
    )
  }

  // =====================================
  // DATABASE PAYLOAD
  // =====================================

  const payload = {
    project_id:
      String(projectId),

    editor_status:
      'editing',

    updated_at:
      new Date().toISOString(),
  }

  // =====================================
  // NORMALIZE EVERY MODIFIED SECTION
  // =====================================

  for (const section of changedFields) {
    if (!WRITABLE_FIELDS.has(section)) {
      throw new Error(
        'Unsupported editor section: ' +
        section
      )
    }

    payload[section] =
      copyEditorItems(
        patch[section],
        section
      )
  }

  // =====================================
  // SAVE OR UPDATE PROJECT RECORD
  // =====================================

  let expected = options.expectedUpdatedAt
  if (!Object.hasOwn(options,'expectedUpdatedAt')) expected = (await getEditorState(projectId))?.updated_at ?? null
  const request = expected == null
    ? supabase.from(TABLE).insert(payload)
    : supabase.from(TABLE).update(payload).eq('project_id',String(projectId)).eq('updated_at',expected)
  const { data, error } = await request.select('*').single()
  if (error || !data) throw Error(error?.code === 'PGRST116' || error?.code === '23505'
    ? 'No editor row updated: another tab changed it or UPDATE access is missing. Your draft is retained. Reload the saved version and check editor permissions before retrying.'
    : error?.message || 'No editor row was saved. Check this project’s editor INSERT/UPDATE permissions.')
  try { if (payload.bid_security?.documentSetup) {
    const result = await supabase.from('philgeps_posts').select('*').eq('id',String(projectId)).single()
    if (result.error || !result.data) throw Error('Document data saved, but the shared project row could not be verified. Check project read permissions and retry.')
    assertSharedMetadata(result.data,payload.bid_security.documentSetup)
  } } catch (error) { error.savedRevision=data.updated_at; throw error }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('project-metadata-saved'))
  return data
}

// =====================================================
// SAVE TECHNICAL SPECIFICATIONS
// =====================================================

export function saveTechnicalSpecs(
  projectId,
  value
) {
  return saveEditorState(
    projectId,
    {
      technical_specs: value,
    }
  )
}

// =====================================================
// SAVE SCHEDULE REQUIREMENTS
// =====================================================

export function saveScheduleRequirements(
  projectId,
  value
) {
  return saveEditorState(
    projectId,
    {
      schedule_requirements: value,
    }
  )
}

// =====================================================
// SAVE BID SECURITY
// =====================================================

export function saveBidSecurity(
  projectId,
  value
) {
  return saveEditorState(
    projectId,
    {
      bid_security: value,
    }
  )
}

// =====================================================
// SAVE OMNIBUS
// =====================================================

export function saveOmnibus(
  projectId,
  value
) {
  return saveEditorState(
    projectId,
    {
      omnibus: value,
    }
  )
}

// =====================================================
// CHECK DECLARATION DATABASE COLUMNS
// =====================================================

export async function hasDeclarationColumns() {
  const { error } = await supabase
    .from(TABLE)
    .select(
      'bid_security,omnibus'
    )
    .limit(0)

  if (
    error &&
    [
      '42703',
      'PGRST204',
    ].includes(error.code)
  ) {
    return false
  }

  if (error) {
    throw error
  }

  return true
}
