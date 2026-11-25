import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { appendPdfAsA4 } from '../services/pdf/fullBidPackagePdf'
import { supportingUploads, appendSupportingUploads } from '../lib/supportingUploads'

export default function SupportingPdfUpload({ value, onChange, field, title, follows }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const latest = useRef(value)
  const active = useRef(true)
  useEffect(() => { latest.current = value }, [value])
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])

  async function upload(files) {
    if (!files.length) return
    const bidderId = value.bidderId
    setBusy(true)
    setError('')
    try {
      const added = []
      for (const file of files) {
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
      added.push({ name: file.name, dataUrl })
      }
      if (active.current && latest.current.bidderId === bidderId) {
        onChange?.({ ...latest.current, [field]: appendSupportingUploads(latest.current[field], added) })
      }
    } catch (cause) {
      if (active.current) setError(cause.message || 'Unable to upload PDF.')
    } finally {
      if (active.current) setBusy(false)
    }
  }

  return <div style={{ margin: '14px 0', padding: 10, border: '1px solid #c5d9cf', borderRadius: 6 }}>
    <h4 style={{ margin: '0 0 10px', fontSize: 12 }}>{title}</h4>
    <label style={{ display: 'block' }}>Add supporting PDFs
      <input type="file" multiple accept="application/pdf,.pdf" aria-label={`Upload ${title}`} disabled={busy}
        style={{ display: 'block', width: '100%', marginTop: 6 }}
        onChange={event => { void upload(Array.from(event.target.files ?? [])); event.target.value = '' }} />
    </label>
    <p role="status">{busy ? 'Converting PDFs to A4...' : `Add more PDFs anytime. All pages are resized to A4 and included in the order below, immediately after ${follows} in the bid package.`}</p>
    {error && <p role="alert">{error}</p>}
    <ol style={{ paddingLeft: 20 }}>
      {supportingUploads(value[field]).map((file, index) => <li key={index} style={{ marginBottom: 10 }}>
        <a href={file.dataUrl} target="_blank" rel="noreferrer">{file.name} (A4)</a>
        <button type="button" disabled={busy} style={{ display: 'block', marginTop: 6 }} aria-label={`Remove PDF ${index + 1}: ${file.name}`}
          onClick={() => onChange?.({ ...value, [field]: supportingUploads(value[field]).filter((_, position) => position !== index) })}>Remove PDF</button>
      </li>)}
    </ol>
  </div>
}
