import { useCallback, useEffect, useRef, useState } from 'react'

export default function useDocumentPagination(scrollRef, containerRef) {
  const pagesRef = useRef([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const measure = useCallback(() => {
    const root = scrollRef.current
    const pages = pagesRef.current
    if (!root?.clientHeight || !pages.length) return
    const top =
      root.getBoundingClientRect().top + Math.min(100, root.clientHeight / 4)
    let current = 0
    pages.forEach((node, index) => {
      if (node.getBoundingClientRect().top <= top) current = index
    })
    if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2)
      current = pages.length - 1
    setPage(current + 1)
  }, [scrollRef])
  const refresh = useCallback(() => {
    pagesRef.current = Array.from(
      containerRef.current.querySelectorAll('section.docx'),
    )
    setTotal(pagesRef.current.length)
    measure()
  }, [containerRef, measure])
  const jump = useCallback(
    (value) => {
      const root = scrollRef.current
      const index = Math.max(
        0,
        Math.min(pagesRef.current.length - 1, Number(value) - 1),
      )
      const target = pagesRef.current[index]
      if (!root || !target || !Number.isInteger(index)) return
      root.scrollTop +=
        target.getBoundingClientRect().top -
        root.getBoundingClientRect().top -
        16
      setPage(index + 1)
    },
    [scrollRef],
  )
  useEffect(() => {
    const root = scrollRef.current
    let frame
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    root.addEventListener('scroll', schedule, { passive: true })
    const observer = new ResizeObserver(schedule)
    observer.observe(root)
    return () => {
      root.removeEventListener('scroll', schedule)
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [scrollRef, measure])
  return { page, total, jump, refresh }
}
