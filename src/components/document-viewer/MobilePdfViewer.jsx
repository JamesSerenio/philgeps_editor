import { useEffect, useRef, useState } from 'react'
import DocumentViewerToolbar from './DocumentViewerToolbar'

// Render only the selected page so large bid packages do not exhaust phone memory.
export default function MobilePdfViewer({ file, onStatus, ...toolbar }) {
  const scrollRef = useRef(null)
  const canvasRef = useRef(null)
  const [loaded, setLoaded] = useState(null)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(0)
  const [scale, setScale] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    let task
    async function load() {
      try {
        const pdfjs = await import('pdfjs-dist')
        const { default: worker } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = worker
        const source = file.blob instanceof Blob
          ? await file.blob.arrayBuffer()
          : await fetch(file.url).then(response => {
              if (!response.ok) throw new Error('Unable to load the generated PDF.')
              return response.arrayBuffer()
            })
        if (cancelled) return
        task = pdfjs.getDocument({ data: source })
        const document = await task.promise
        if (!cancelled) setLoaded(document)
      } catch (reason) {
        if (!cancelled) {
          setError(reason.message || 'PDF preview could not be loaded.')
          onStatus?.(file.url, 'error')
        }
      }
    }
    void load()
    return () => { cancelled = true; void task?.destroy() }
  }, [file, onStatus])

  useEffect(() => {
    if (!loaded || !width) return
    let cancelled = false
    let renderTask
    async function render() {
      try {
        const pdfPage = await loaded.getPage(page)
        if (cancelled) return
        const original = pdfPage.getViewport({ scale: 1 })
        const currentScale = scale ?? Math.max(0.1, (width - 24) / original.width)
        const viewport = pdfPage.getViewport({ scale: currentScale })
        // Bound backing pixels for mobile devices while preserving sharp text.
        const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (viewport.width * viewport.height)))
        const canvas = canvasRef.current
        canvas.width = Math.ceil(viewport.width * density)
        canvas.height = Math.ceil(viewport.height * density)
        canvas.style.width = viewport.width + 'px'
        canvas.style.height = viewport.height + 'px'
        renderTask = pdfPage.render({
          canvasContext: canvas.getContext('2d'), viewport,
          transform: [density, 0, 0, density, 0, 0],
        })
        await renderTask.promise
        if (!cancelled) {
          setZoom(currentScale)
          setReady(true)
          scrollRef.current.scrollTop = 0
          onStatus?.(file.url, 'ready')
        }
      } catch (reason) {
        if (!cancelled && reason.name !== 'RenderingCancelledException') {
          setError(reason.message || 'PDF page could not be displayed.')
          onStatus?.(file.url, 'error')
        }
      }
    }
    void render()
    return () => { cancelled = true; renderTask?.cancel() }
  }, [loaded, page, width, scale, file.url, onStatus])

  const jump = value => {
    const next = Math.min(loaded.numPages, Math.max(1, Math.round(Number(value) || 1)))
    setPage(next)
  }
  return <>
    <DocumentViewerToolbar {...toolbar}
      zoomLabel="PDF"
      pagination={{ page, total: loaded?.numPages ?? 0, jump }}
      zoomControls={{ zoom, applyZoom: value => setScale(Math.max(0.1, Math.min(2, value))), fit: () => setScale(null), minZoom: 0.1 }}
    />
    <div ref={scrollRef} className="bid-export-pdf-scroll" aria-label="PDF pages">
      {!ready && !error && <p className="bid-export-render-status" role="status">Loading PDF pages...</p>}
      {error && <p className="bid-export-preview-error" role="alert">{error} You can still download the PDF or open it in a new tab.</p>}
      <canvas ref={canvasRef} role="img" aria-label={'PDF page ' + page + ' of ' + (loaded?.numPages ?? 0)} />
    </div>
  </>
}
