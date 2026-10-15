import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import DocumentViewerToolbar from './DocumentViewerToolbar'

function PdfPage({ pdfPage, scale, scrollRef, onReady, onError }) {
  const pageRef = useRef(null)
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const viewport = pdfPage.getViewport({ scale })

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      root: scrollRef.current, rootMargin: '600px 0px',
    })
    observer.observe(pageRef.current)
    return () => observer.disconnect()
  }, [scrollRef])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    const canvas = canvasRef.current
    const view = pdfPage.getViewport({ scale })
    const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4000000 / (view.width * view.height)))
    canvas.width = Math.ceil(view.width * density)
    canvas.height = Math.ceil(view.height * density)
    const task = pdfPage.render({
      canvasContext: canvas.getContext('2d'), viewport: view,
      transform: [density, 0, 0, density, 0, 0],
    })
    void task.promise.then(() => {
      if (!cancelled) onReady()
    }).catch(reason => {
      if (!cancelled && reason.name !== 'RenderingCancelledException') onError(reason)
    })
    return () => {
      cancelled = true
      task.cancel()
      // Release offscreen bitmaps without removing the page's scroll space.
      canvas.width = 0
      canvas.height = 0
    }
  }, [pdfPage, scale, visible, onReady, onError])

  return <div ref={pageRef} className="bid-export-pdf-page"
    data-pdf-page={pdfPage.pageNumber}
    style={{ width: viewport.width, height: viewport.height }}>
    <canvas ref={canvasRef} width={0} height={0} role="img" aria-label={'PDF page ' + pdfPage.pageNumber}
      style={{ width: viewport.width, height: viewport.height }} />
  </div>
}

export default function MobilePdfViewer({ file, onStatus, ...toolbar }) {
  const scrollRef = useRef(null)
  const anchorRef = useRef(null)
  const [loaded, setLoaded] = useState(null)
  const [page, setPage] = useState(1)
  const [width, setWidth] = useState(0)
  const [scale, setScale] = useState(null)
  const [error, setError] = useState('')
  const onReady = useCallback(() => onStatus?.(file.url, 'ready'), [file.url, onStatus])
  const onError = useCallback(reason => {
    setError(reason.message || 'PDF preview could not be displayed.')
    onStatus?.(file.url, 'error')
  }, [file.url, onStatus])

  const rememberPosition = useCallback(() => {
    const root = scrollRef.current
    const top = root.getBoundingClientRect().top
    const current = [...root.querySelectorAll('[data-pdf-page]')].find(node => node.getBoundingClientRect().bottom > top)
    if (current) anchorRef.current = {
      number: current.dataset.pdfPage,
      fraction: (top - current.getBoundingClientRect().top) / current.getBoundingClientRect().height,
    }
  }, [])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      rememberPosition()
      setWidth(entry.contentRect.width)
    })
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [rememberPosition])

  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const root = scrollRef.current
    const node = root.querySelector('[data-pdf-page="' + anchor.number + '"]')
    if (node) root.scrollTop += node.getBoundingClientRect().top - root.getBoundingClientRect().top + anchor.fraction * node.getBoundingClientRect().height
    anchorRef.current = null
  }, [scale, width, loaded])

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
        const pages = []
        // Dimensions reserve stable space for every portrait and landscape page.
        for (let number = 1; number <= document.numPages; number++) {
          if (cancelled) return
          pages.push(await document.getPage(number))
        }
        if (!cancelled) setLoaded(pages)
      } catch (reason) {
        if (!cancelled) onError(reason)
      }
    }
    void load()
    return () => { cancelled = true; void task?.destroy() }
  }, [file, onError])

  const updatePage = () => {
    const root = scrollRef.current
    if (loaded && root.scrollTop > 0 && root.scrollHeight - root.scrollTop - root.clientHeight < 2) {
      setPage(loaded.length)
      return
    }
    const top = root.getBoundingClientRect().top + 40
    const current = [...root.querySelectorAll('[data-pdf-page]')].find(node => node.getBoundingClientRect().bottom > top)
    if (current) setPage(Number(current.dataset.pdfPage))
  }
  const jump = value => {
    if (!loaded) return
    const next = Math.min(loaded.length, Math.max(1, Math.round(Number(value) || 1)))
    const root = scrollRef.current
    const node = root.querySelector('[data-pdf-page="' + next + '"]')
    if (node) root.scrollTop += node.getBoundingClientRect().top - root.getBoundingClientRect().top
    setPage(next)
  }
  const changeZoom = value => { rememberPosition(); setScale(value) }
  const zoom = scale ?? (loaded?.length && width ? Math.max(0.1, (width - 24) / loaded[page - 1].getViewport({ scale: 1 }).width) : 1)
  return <>
    <DocumentViewerToolbar {...toolbar} zoomLabel="PDF"
      pagination={{ page, total: loaded?.length ?? 0, jump }}
      zoomControls={{ zoom, applyZoom: value => changeZoom(Math.max(0.1, Math.min(2, value))), fit: () => changeZoom(null), minZoom: 0.1 }} />
    <div ref={scrollRef} className="bid-export-pdf-scroll" aria-label="PDF pages" onScroll={updatePage}>
      {!loaded && !error && <p className="bid-export-render-status" role="status">Loading PDF pages...</p>}
      {error && <p className="bid-export-preview-error" role="alert">{error} You can still download the PDF or open it in a new tab.</p>}
      {loaded && width > 0 && loaded.map(pdfPage => <PdfPage key={pdfPage.pageNumber}
        pdfPage={pdfPage} scrollRef={scrollRef} onReady={onReady} onError={onError}
        scale={scale ?? Math.max(0.1, (width - 24) / pdfPage.getViewport({ scale: 1 }).width)} />)}
    </div>
  </>
}
