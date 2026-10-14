import { useCallback, useEffect, useRef, useState } from 'react'
import DashboardIcon from './DashboardIcon'
import '../styles/bid-export-preview.css'

function WordPreview({ file, onStatus }) {
  const containerRef = useRef(null)
  const scrollRef = useRef(null)
  const fitRef = useRef(true)
  const [zoom, setZoom] = useState(1)
  const applyZoom = useCallback((value) => {
    const scale = Math.max(0.1, Math.min(2, value))
    containerRef.current?.querySelectorAll('section.docx').forEach(page => page.style.removeProperty('--bid-export-page-zoom'))
    containerRef.current?.style.setProperty('--bid-export-word-zoom', scale)
    setZoom(scale)
  }, [])
  const fitPages = useCallback(() => {
    const width = scrollRef.current?.clientWidth
    const pages = containerRef.current?.querySelectorAll('section.docx')
    if (!width || !pages?.length) return
    containerRef.current.style.setProperty('--bid-export-word-zoom', 1)
    const scales = Array.from(pages, page => {
      const scale = Math.max(0.1, Math.min(1, (width - 32) / page.offsetWidth))
      page.style.setProperty('--bid-export-page-zoom', scale)
      return scale
    })
    setZoom(scales[0])
  }, [])
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (fitRef.current) fitPages()
    })
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [fitPages])
  const [status, setStatus] = useState({ loading: true, error: '' })
  useEffect(() => {
    const container = containerRef.current
    const staging = document.createElement('div')
    let cancelled = false
    async function render() {
      try {
        const { renderAsync } = await import('docx-preview')
        const source =
          file.blob instanceof Blob
            ? file.blob
            : await fetch(file.url).then((response) => {
                if (!response.ok)
                  throw new Error('Unable to load the generated Word file.')
                return response.blob()
              })
        if (cancelled) return
        await renderAsync(source, staging, staging, {
          inWrapper: true,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          ignoreWidth: false,
          ignoreHeight: false,
          useBase64URL: true,
        })
        if (cancelled) return
        container.replaceChildren(...staging.childNodes)
        fitPages()
        setStatus({ loading: false, error: '' })
        onStatus?.(file.url, 'ready')
      } catch (error) {
        if (!cancelled) {
          setStatus({
            loading: false,
            error: error.message || 'Word preview could not be rendered.',
          })
          onStatus?.(file.url, 'error')
        }
      }
    }
    void render()
    return () => {
      cancelled = true
      container.replaceChildren()
      staging.replaceChildren()
    }
  }, [file, onStatus, fitPages])
  return (
    <>
      <div className="bid-export-word-tools">
        <span>Word preview</span>
        <div>
          <button
            type="button"
            aria-label="Zoom out Word preview"
            onClick={() => {
              fitRef.current = false
              applyZoom(zoom - 0.1)
            }}
          >
            -
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in Word preview"
            onClick={() => {
              fitRef.current = false
              applyZoom(zoom + 0.1)
            }}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              fitRef.current = true
              fitPages()
            }}
          >
            Fit width
          </button>
        </div>
      </div>
      <div ref={scrollRef} className="bid-export-word-scroll">
        <p className="bid-export-word-note">
          Browser preview is approximate. Open the DOCX in Microsoft Word to
          review final pagination.
        </p>
        {status.loading && (
          <p role="status" className="bid-export-render-status">
            <span className="bid-export-spinner" />
            Rendering Word pages...
          </p>
        )}
        {status.loading && (
          <div className="bid-export-render-skeleton" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        )}
        {status.error && (
          <p role="alert" className="bid-export-preview-error">
            {status.error} The generated file is still available to download.
          </p>
        )}
        <div ref={containerRef} className="bid-export-word-mount" />
      </div>
    </>
  )
}

export default function DocumentPreview({
  file,
  format,
  busy = false,
  outdated = false,
  onStatus,
}) {
  const [pdfReady, setPdfReady] = useState(false)
  return (
    <section
      className="bid-export-preview"
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
            <>
              <iframe
                title="Actual generated PDF preview"
                src={file.url}
                className="bid-export-pdf-frame"
                onLoad={() => {
                  setPdfReady(true)
                  onStatus?.(file.url, 'ready')
                }}
              />
              {!pdfReady && (
                <div className="bid-export-render-status" role="status">
                  Loading PDF viewer...
                </div>
              )}
            </>
          ) : (
            <WordPreview key={file.url} file={file} onStatus={onStatus} />
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
