import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { appendPdfAsA4 } from '../services/pdf/fullBidPackagePdf'

export default function SupportingPdfUpload({ value, onChange, field, title, follows }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = useRef(value)
  const active = useRef(true)
  useEffect(() => { latest.current = value }, [value])
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])

  async function upload(file) {
    if (!file) return
    const bidderId = value.bidderId
    setBusy(true)
    setError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a PDF smaller than 10 MB.')
      const source = await PDFDocument.load(await file.arrayBuffer())
      if (!source.getPageCount()) throw new Error('The PDF has no pages.')
      const normalized = await PDFDocument.create()
      await appendPdfAsA4(normalized, source)
      const bytes = await normalized.save()
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Unable to read the PDF.'))
        reader.readAsDataURL(new Blob([bytes], { type: 'application/pdf' }))
      })
      if (active.current && latest.current.bidderId === bidderId) {
        onChange?.({ ...latest.current, [field]: { name: file.name, dataUrl } })
      }
    } catch (cause) {
      if (active.current) setError(cause.message || 'Unable to upload PDF.')
    } finally {
      if (active.current) setBusy(false)
    }
  }

  return <div style={{ margin: '14px 0', padding: 10, border: '1px solid #c5d9cf', borderRadius: 6 }}>
    <h4 style={{ margin: '0 0 10px', fontSize: 12 }}>{title}</h4>
    <label style={{ display: 'block' }}>Upload supporting PDF
      <input type="file" accept="application/pdf,.pdf" aria-label={`Upload ${title}`} disabled={busy}
        style={{ display: 'block', width: '100%', marginTop: 6 }}
        onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} />
    </label>
    <p role="status">{busy ? 'Converting PDF to A4...' : `Uploaded pages are resized to A4 and included immediately after ${follows} in the bid package.`}</p>
    {error && <p role="alert">{error}</p>}
    {value[field]?.dataUrl && <>
      <a href={value[field].dataUrl} target="_blank" rel="noreferrer">{value[field].name} (A4)</a>
      <button type="button" disabled={busy} style={{ marginTop: 8 }}
        onClick={() => onChange?.({ ...value, [field]: null })}>Remove PDF</button>
    </>}
  </div>
}
