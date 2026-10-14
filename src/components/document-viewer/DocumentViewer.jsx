import { useEffect, useRef, useState } from 'react'
import DashboardIcon from '../DashboardIcon'
import WordDocumentViewer from './WordDocumentViewer'
import PdfDocumentViewer from './PdfDocumentViewer'
import '../../styles/bid-export-preview.css'
import './document-viewer.css'

export default function DocumentViewer({
  file,
  format,
  busy = false,
  outdated = false,
  onStatus,
  onDownload,
  downloadDisabled = false,
}) {
  const viewerRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)
  const fullscreenRef = useRef(false)
  const toggleFullscreen = async () => {
    if (fullscreenRef.current) {
      fullscreenRef.current = false
      setFullscreen(false)
      if (document.fullscreenElement)
        await document.exitFullscreen().catch(() => {})
      return
    }
    fullscreenRef.current = true
    setFullscreen(true)
    try {
      await viewerRef.current.requestFullscreen()
    } catch {
      /* CSS fallback remains active. */
    }
  }
  useEffect(() => {
    const change = () => {
      if (!document.fullscreenElement) {
        fullscreenRef.current = false
        setFullscreen(false)
      }
    }
    const escape = (event) => {
      if (event.key === 'Escape' && fullscreenRef.current) {
        event.preventDefault()
        event.stopPropagation()
        fullscreenRef.current = false
        setFullscreen(false)
        if (document.fullscreenElement)
          void document.exitFullscreen().catch(() => {})
      }
    }
    document.addEventListener('fullscreenchange', change)
    window.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('fullscreenchange', change)
      window.removeEventListener('keydown', escape, true)
    }
  }, [])
  return (
    <section
      ref={viewerRef}
      className={
        'bid-export-preview document-viewer' +
        (fullscreen ? ' is-fullscreen' : '')
      }
      aria-label="Generated document preview"
      aria-busy={busy}
    >
      <div className="bid-export-viewer-toolbar">
        <div className="bid-export-file-info">
          <DashboardIcon name="document" />
          <div>
            <strong title={file?.filename}>
              {file?.filename || 'Document workspace'}
            </strong>
            <span>
              {file
                ? format === 'pdf'
                  ? 'PDF document'
                  : 'Microsoft Word document'
                : 'Review your complete bid package'}
            </span>
          </div>
        </div>
        <div className="bid-export-viewer-actions">
          <span className="bid-export-preview-badge">
            {busy
              ? 'Preparing'
              : outdated
                ? 'Update needed'
                : file
                  ? 'Generated file'
                  : 'Preview'}
          </span>
          {file && format === 'pdf' && (
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bid-export-open"
            >
              Open in new tab <DashboardIcon name="arrow" />
            </a>
          )}
        </div>
      </div>
      {outdated && (
        <p className="bid-export-stale" role="status">
          Project details changed after this preview. Generate a new preview to
          include your latest edits.
        </p>
      )}
      <div className="bid-export-document-area">
        {file ? (
          format === 'pdf' ? (
            <PdfDocumentViewer
              file={file}
              onStatus={onStatus}
              fullscreen={fullscreen}
              onFullscreen={toggleFullscreen}
              onDownload={onDownload}
              downloadDisabled={downloadDisabled}
            />
          ) : (
            <WordDocumentViewer
              key={file.url}
              file={file}
              onStatus={onStatus}
              fullscreen={fullscreen}
              onFullscreen={toggleFullscreen}
              onDownload={onDownload}
              downloadDisabled={downloadDisabled}
            />
          )
        ) : (
          <div className="bid-export-empty">
            <div
              className="bid-export-document-illustration"
              aria-hidden="true"
            >
              <DashboardIcon name="document" width="42" height="42" />
              <i />
              <i />
              <i />
            </div>
            <span className="bid-export-eyebrow">YOUR BID PACKAGE</span>
            <h3>
              {busy
                ? 'Preparing your documents'
                : 'Your document preview will appear here'}
            </h3>
            <p>
              {busy
                ? 'Your selected templates and saved values are being assembled. You can review the file as soon as it is ready.'
                : 'Select a format and generate a preview to review all pages before downloading.'}
            </p>
            {busy ? (
              <span className="bid-export-spinner" />
            ) : (
              <span className="bid-export-empty-detail">
                21 documents, one complete package
              </span>
            )}
          </div>
        )}
        {file && busy && (
          <div className="bid-export-updating" role="status">
            <span className="bid-export-spinner" />
            Preparing an updated preview
          </div>
        )}
      </div>
    </section>
  )
}
