export function municipalityKey(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function resolveMunicipalityTemplate(municipality, saved = {}) {
  const key = municipalityKey(municipality)
  if (saved?.templateMunicipality === key && ['old_default', 'initao_lgu'].includes(saved?.templateVariant)) {
    return saved.templateVariant
  }
  return /\binitao\b/.test(key) ? 'initao_lgu' : 'old_default'
}

export function selectMunicipalityTemplate(municipality, value) {
  return { ...value, templateMunicipality: municipalityKey(municipality) }
}
