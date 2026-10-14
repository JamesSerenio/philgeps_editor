import { useEffect, useRef, useState } from 'react'
import DocumentViewerToolbar from './DocumentViewerToolbar'
import useDocumentPagination from './useDocumentPagination'
import useDocumentZoom from './useDocumentZoom'

export default function WordDocumentViewer({ file, onStatus, ...toolbar }) {
  const containerRef = useRef(null)
  const scrollRef = useRef(null)
  const pagination = useDocumentPagination(scrollRef, containerRef)
  const zoomControls = useDocumentZoom(scrollRef, containerRef)
  const { refresh } = pagination
  const { fitPages } = zoomControls

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
        refresh()
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
  }, [file, onStatus, fitPages, refresh])

  return (
    <>
      <DocumentViewerToolbar
        {...toolbar}
        pagination={pagination}
        zoomControls={zoomControls}
      />
      <div ref={scrollRef} className="bid-export-word-scroll">
        <p className="bid-export-word-note">
          Browser pagination may differ from Microsoft Word. Page count reflects
          this rendered preview.
        </p>
        {status.loading && (
          <p role="status" className="bid-export-render-status">
            Rendering Word pages...
          </p>
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
