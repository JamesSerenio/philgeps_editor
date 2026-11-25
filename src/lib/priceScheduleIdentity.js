export function priceScheduleIdentity(projectId, referenceNumber) {
  const reference = String(referenceNumber ?? '').trim()
  const project = String(projectId ?? '').trim()
  return reference || (project ? `project:${project}` : '')
}

export async function loadPriceSchedule(client, projectId, referenceNumber) {
  const identity = priceScheduleIdentity(projectId, referenceNumber)
  if (!identity) throw new Error('Missing project ID.')
  const read = key => client.from('bid_price_schedules')
    .select('id,total_prices_per_unit').eq('reference_number', key)
    .order('updated_at', { ascending: false }).limit(1)
  const result = await read(identity)
  if (result.error || result.data?.length) return result
  const fallback = priceScheduleIdentity(projectId, '')
  return fallback && fallback !== identity ? read(fallback) : result
}

export function readPriceScheduleCache(storage, projectId, referenceNumber) {
  const keys = [...new Set([
    priceScheduleIdentity(projectId, referenceNumber),
    priceScheduleIdentity(projectId, ''),
  ].filter(Boolean))]
  for (const key of keys) {
    try {
      const value = JSON.parse(storage.getItem(`philgeps-price-schedule:${key}`) || 'null')
      if (value) return value
    } catch { /* Try the project backup if the reference cache is invalid. */ }
  }
  return null
}
