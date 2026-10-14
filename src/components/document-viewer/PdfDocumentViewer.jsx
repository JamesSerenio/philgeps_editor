import { useState } from 'react'
import DocumentViewerToolbar from './DocumentViewerToolbar'

export default function PdfDocumentViewer({ file, onStatus, ...toolbar }) {
  const [ready, setReady] = useState(false)
  return (
    <>
      <DocumentViewerToolbar {...toolbar} />
      <iframe
        title="Actual generated PDF preview"
        src={file.url}
        className="bid-export-pdf-frame"
        onLoad={() => {
          setReady(true)
          onStatus?.(file.url, 'ready')
        }}
      />
      {!ready && (
        <p className="bid-export-render-status" role="status">
          Loading PDF viewer...
        </p>
      )}
    </>
  )
}
