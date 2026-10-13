import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function ScrollableTable({ label, children }: { label: string; children: ReactNode }) {
  const container = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState(false)
  const hintId = useId()
  useEffect(() => {
    const element = container.current!
    const measure = () => setOverflow(element.scrollWidth > element.clientWidth + 1)
    const frame = requestAnimationFrame(measure)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    observer?.observe(element)
    if (element.firstElementChild) observer?.observe(element.firstElementChild)
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', measure) }
  }, [])
  return <><div ref={container} className="table-scroll" role={overflow ? 'region' : undefined} aria-label={label} aria-describedby={overflow ? hintId : undefined} tabIndex={overflow ? 0 : undefined}>{children}</div>{overflow && <p id={hintId} className="table-overflow-hint">숨은 열이 있습니다. 표를 좌우로 스크롤해 확인하세요.</p>}</>
}
