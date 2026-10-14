export function exportFilename(title, reference, extension) {
  const clean = value => String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 150).replace(/_+$/g, '')
  let stem = clean(title) || 'BID_DOCUMENTS_' + (clean(reference) || 'PROJECT')
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)) stem = 'BID_' + stem
  return stem + '.' + (extension === 'docx' ? 'docx' : 'pdf')
}
