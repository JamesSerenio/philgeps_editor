import { useEffect, useRef, useState } from 'react'
import { PDFDocument } from 'pdf-lib'
import { assetExists, getStaticDocumentPath, staticDocumentNames } from '../lib/bidderAssets'

export default function CompanyCertificates({ value, onChange }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const latestValue = useRef(value)
  const active = useRef(true)
  useEffect(() => { latestValue.current = value }, [value])
  useEffect(() => {
    active.current = true
    return () => { active.current = false }
  }, [])
  async function upload(filename, file) {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Choose a PDF smaller than 10 MB.')
      const bytes = await file.arrayBuffer()
      if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') throw new Error('Choose a valid PDF document.')
      const pdf = await PDFDocument.load(bytes)
      if (!pdf.getPageCount()) throw new Error('The PDF has no pages.')
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve('data:application/pdf;base64,' + String(reader.result).split(',')[1])
        reader.onerror = () => reject(new Error('Unable to read the PDF.'))
        reader.readAsDataURL(new Blob([bytes], { type: 'application/pdf' }))
      })
      if (!active.current) return
      const current = latestValue.current
      onChange({ ...current, certificateUploads: { ...current.certificateUploads,
        [filename]: { bidderId: current.bidderId, name: file.name, dataUrl } } })
    } catch (cause) { setError(cause.message) }
    finally { setBusy(false) }
  }
  return <>
    <h3>MANOTECH Official Documents</h3>
    <p>Upload genuine Manotech PDFs. Documents are saved with this project.</p>
    {error && <p role="alert">{error}</p>}
    {staticDocumentNames.map(filename => {
      const source = getStaticDocumentPath(value, filename, { required: false })
      const uploaded = value.certificateUploads?.[filename]
      const present = source.startsWith('data:application/pdf;') || assetExists(source)
      return <label key={filename}>{filename}
        <span role="status">{present ? 'Ready' : 'Missing Document'}</span>
        {uploaded?.bidderId === value.bidderId && <small>{uploaded.name}</small>}
        <input aria-label={'Upload ' + filename} type="file" accept="application/pdf,.pdf" disabled={busy}
          onChange={event => { void upload(filename, event.target.files?.[0]); event.target.value = '' }} />
      </label>
    })}
  </>
}
