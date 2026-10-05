import { supabase } from '../supabase'

const fields = [
  'technical_specs',
  'schedule_requirements',
  'bid_security',
  'omnibus',
]

export function copyEditorItems(
  value,
  section,
) {
  if (
    section === 'bid_security' ||
    section === 'omnibus'
  ) {
    if (
      !value ||
      Object.getPrototypeOf(value) !== Object.prototype
    ) {
      throw new Error(
        'Invalid declaration data.',
      )
    }

    if (
      !['old', 'initao_lgu'].includes(
        value.templateVariant,
      )
    ) {
      throw new Error(
        'Invalid template variant.',
      )
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, field]) => {
        if (
          key === 'documentSetup' &&
          section === 'bid_security'
        ) {
          if (
            !field ||
            Object.getPrototypeOf(field) !== Object.prototype ||
            Object.values(field).some(
              (v) => typeof v !== 'string',
            )
          ) {
            throw new Error(
              'Invalid document setup.',
            )
          }

          return [
            key,
            {
              ...field,
            },
          ]
        }

        if (typeof field !== 'string') {
          throw new Error(
            'Invalid declaration field: ' + key,
          )
        }

        return [key, field]
      }),
    )
  }

  if (!Array.isArray(value)) {
    throw new Error(
      'Editor data must be an array.',
    )
  }

  const copyString = (
    object,
    key,
  ) => {
    if (
      typeof object?.[key] !== 'string'
    ) {
      throw new Error(
        'Invalid editor field: ' + key,
      )
    }

    return object[key]
  }

  return value.map((item) => {
    if (
      !item ||
      Object.getPrototypeOf(item) !== Object.prototype
    ) {
      throw new Error(
        'Invalid editor item.',
      )
    }

    if (
      !Array.isArray(
        item.specificationLines,
      ) ||
      !item.specificationLines.length
    ) {
      throw new Error(
        'Each item needs a specification line.',
      )
    }

    const result =
      Object.fromEntries(
        [
          'id',
          'itemNo',
          'qty',
          'unit',
        ].map((key) => [
          key,
          copyString(item, key),
        ]),
      )

    if (
      section === 'schedule_requirements'
    ) {
      result.deliveryPeriod =
        copyString(
          item,
          'deliveryPeriod',
        )

      if (
        item.sharedItemId != null
      ) {
        result.sharedItemId =
          copyString(
            item,
            'sharedItemId',
          )
      }
    }

    result.specificationLines =
      item.specificationLines.map((line) => {
        const row = {
          id: copyString(
            line,
            'id',
          ),
          text: copyString(
            line,
            'text',
          ),
        }

        if (
          section === 'technical_specs'
        ) {
          row.compliance =
            copyString(
              line,
              'compliance',
            )
        }

        return row
      })

    return result
  })
}

export async function getEditorState(
  projectId,
) {
  const {
    data,
    error,
  } = await supabase
    .from('bid_docs_editor_state')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw error

  if (data) {
    for (const field of fields) {
      if (data[field] != null) {
        data[field] =
          copyEditorItems(
            data[field],
            field,
          )
      }
    }
  }

  return data
}

export async function saveEditorState(
  projectId,
  patch,
) {
  const payload = {
    project_id: projectId,
    editor_status: 'editing',
    updated_at:
      new Date().toISOString(),
  }

  for (const field of Object.keys(patch)) {
    if (!fields.includes(field)) {
      throw new Error(
        'Unsupported editor section: ' + field,
      )
    }

    payload[field] =
      copyEditorItems(
        patch[field],
        field,
      )
  }

  if (
    !fields.some((field) =>
      Object.hasOwn(
        payload,
        field,
      ),
    )
  ) {
    throw new Error(
      'No editor data to save.',
    )
  }

  const { error } =
    await supabase
      .from('bid_docs_editor_state')
      .upsert(payload, {
        onConflict: 'project_id',
        defaultToNull: false,
      })

  if (error) throw error
}

export function saveTechnicalSpecs(
  projectId,
  value,
) {
  return saveEditorState(
    projectId,
    {
      technical_specs: value,
    },
  )
}

export function saveScheduleRequirements(
  projectId,
  value,
) {
  return saveEditorState(
    projectId,
    {
      schedule_requirements: value,
    },
  )
}

export function saveBidSecurity(
  projectId,
  value,
) {
  return saveEditorState(
    projectId,
    {
      bid_security: value,
    },
  )
}

export function saveOmnibus(
  projectId,
  value,
) {
  return saveEditorState(
    projectId,
    {
      omnibus: value,
    },
  )
}

export async function hasDeclarationColumns() {
  const { error } =
    await supabase
      .from('bid_docs_editor_state')
      .select(
        'bid_security,omnibus',
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

  if (error) throw error

  return true
}