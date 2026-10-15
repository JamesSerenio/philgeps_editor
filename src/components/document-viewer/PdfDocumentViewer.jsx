import { useState, useSyncExternalStore } from 'react'
import MobilePdfViewer from './MobilePdfViewer'
import DocumentViewerToolbar from './DocumentViewerToolbar'

const mobileQuery = '(max-width: 1023px), (pointer: coarse)'
const subscribe = callback => {
  const media = window.matchMedia(mobileQuery)
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const mobileSnapshot = () => window.matchMedia(mobileQuery).matches

export default function PdfDocumentViewer({ file, onStatus, ...toolbar }) {
  const [ready, setReady] = useState(false)
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, () => false)
  if (mobile) return <MobilePdfViewer key={file.url} file={file} onStatus={onStatus} {...toolbar} />
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
