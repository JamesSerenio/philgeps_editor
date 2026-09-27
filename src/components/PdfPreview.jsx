export default function PdfPreview({ src, title = 'PDF preview' }) {
  if (!src) {
    return <div className="empty-editor" role="status"><h3>{title}</h3><p>No PDF preview is available for this document yet.</p></div>
  }

  return (
    <section className="pdf-preview" aria-label={`${title} preview`}>
      <div className="pdf-preview-toolbar">
        <span>PDF preview</span>
        <a className="pdf-open-link" href={src} target="_blank" rel="noopener noreferrer">Open Full PDF</a>
      </div>
      <iframe key={src} className="pdf-preview-frame" src={src} title={title} />
      <p className="pdf-preview-help">If your browser cannot display the PDF, use Open Full PDF to view or download it.</p>
    </section>
  )
}
