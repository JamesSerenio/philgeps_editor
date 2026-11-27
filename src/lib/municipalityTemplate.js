export function municipalityKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

// Municipality is project content, not an instruction to change templates.
export function resolveMunicipalityTemplate(_municipality, saved = {}) {
  const explicit = saved?.templateSelection === 'manual' || typeof saved?.templateMunicipality === 'string'
  if (explicit && ['old_default', 'initao_lgu'].includes(saved?.templateVariant)) return saved.templateVariant
  return 'initao_lgu'
}

export function selectMunicipalityTemplate(municipality, value) {
  return { ...value, templateSelection: 'manual', templateMunicipality: municipalityKey(municipality) }
}

export function resolveDocumentTemplate(setup = {}) {
  return setup.documentTemplateVariant === 'initao_lgu' ? 'initao_lgu' : 'old_default'
}
