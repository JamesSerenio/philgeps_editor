import { useCallback, useEffect, useRef, useState } from 'react'

export default function useDocumentZoom(scrollRef, containerRef) {
  const fitRef = useRef(true)
  const fitModeRef = useRef('reading')
  const [zoom, setZoom] = useState(1)
  const preservePosition = useCallback(
    (change) => {
      const root = scrollRef.current
      const pages = Array.from(
        containerRef.current.querySelectorAll('section.docx'),
      )
      const top = root.getBoundingClientRect().top
      const anchor = pages.find(
        (page) => page.getBoundingClientRect().bottom > top,
      )
      const fraction = anchor
        ? (top - anchor.getBoundingClientRect().top) /
          anchor.getBoundingClientRect().height
        : 0
      change()
      if (anchor)
        root.scrollTop +=
          anchor.getBoundingClientRect().top -
          root.getBoundingClientRect().top +
          fraction * anchor.getBoundingClientRect().height
    },
    [scrollRef, containerRef],
  )
  const applyZoom = useCallback(
    (value) => {
      fitRef.current = false
      const scale = Math.max(0.5, Math.min(2, value))
      preservePosition(() => {
        containerRef.current
          .querySelectorAll('section.docx')
          .forEach((page) =>
            page.style.removeProperty('--bid-export-page-zoom'),
          )
        containerRef.current.style.setProperty('--bid-export-word-zoom', scale)
      })
      setZoom(scale)
    },
    [containerRef, preservePosition],
  )
  const fitPages = useCallback(() => {
    const width = scrollRef.current?.clientWidth
    const pages = containerRef.current?.querySelectorAll('section.docx')
    if (!width || !pages?.length) return
    let firstScale
    preservePosition(() => {
      containerRef.current.style.setProperty('--bid-export-word-zoom', 1)
      const scales = Array.from(pages, (page) => {
        const scale = Math.max(
          0.1,
          Math.min(
            fitModeRef.current === 'width' ? 2 : 1.125,
            (width - 32) / page.offsetWidth,
          ),
        )
        page.style.setProperty('--bid-export-page-zoom', scale)
        return scale
      })
      firstScale = scales[0]
    })
    setZoom(firstScale)
  }, [scrollRef, containerRef, preservePosition])
  const fit = useCallback(() => {
    fitRef.current = true
    fitModeRef.current = 'width'
    fitPages()
  }, [fitPages])
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (fitRef.current) fitPages()
    })
    observer.observe(scrollRef.current)
    return () => observer.disconnect()
  }, [scrollRef, fitPages])
  return { zoom, applyZoom, fit, fitPages }
}
