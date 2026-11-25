// Keep older projects with one supporting PDF compatible with ordered uploads.
export function supportingUploads(value) {
  return (Array.isArray(value) ? value : value ? [value] : [])
    .filter(upload => typeof upload?.dataUrl === 'string' && upload.dataUrl)
}

export function appendSupportingUploads(current, added) {
  return [...supportingUploads(current), ...supportingUploads(added)]
}
