// Verified against live philgeps_posts rows and Flutter's ProjectPost model.
export function getDeadline(project) {
  return [project.manual_deadline,project.manualDeadline,project.closing_date,project.closingDate].find(value => String(value ?? '').trim()) || null
}

export function parseProjectDate(value) {
  if (!value || typeof value !== 'string') return null
  const text = value.trim()
  // Supabase supplies timezone-aware ISO dates; unzoned ISO values are Philippine time.
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? `${text}T00:00:00+08:00`
    : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)
      ? `${text}+08:00` : text
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value, fallback = 'Not available') {
  const date = parseProjectDate(value)
  if (!date) return value ? 'Date unavailable' : fallback
  const day = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) return day
  const time = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: true }).format(date)
  return `${day} · ${time}`
}

export function getTimeRemaining(value, now) {
  const date = parseProjectDate(value)
  if (!date) return value ? 'Date unavailable' : 'No deadline'
  const end = /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim()) ? date.getTime()+86400000-1 : date.getTime()
  const remaining = end - now
  if (remaining <= 0) return 'Expired'
  const minutes = Math.floor(remaining / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `Closes in ${days}d ${hours % 24}h`
  if (hours > 0) return `Closes in ${hours}h ${minutes % 60}m`
  return minutes > 0 ? `Closes in ${minutes}m` : 'Closes in <1m'
}

export function formatPeso(value) {
  if (value == null || String(value).trim() === '') return 'Not available'
  const numeric = typeof value === 'number' ? value : String(value).replace(/PHP|₱|,/gi, '').trim()
  if (numeric === '') return 'Not available'
  const amount = Number(numeric)
  return Number.isFinite(amount) ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount) : 'Not available'
}


// Unknown deadlines stay visible; hiding a card never deletes saved data.
export function isBiddingProjectClosed(project, now = Date.now()) {
  if (['closed', 'expired'].includes(String(project.status ?? '').trim().toLowerCase())) return true
  return getTimeRemaining(getDeadline(project), now) === 'Expired'
}
