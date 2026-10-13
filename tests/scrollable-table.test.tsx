// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { ScrollableTable } from '../src/components/ScrollableTable'

it('넘치는 표에만 숨은 열 안내와 키보드 스크롤 포커스를 제공하고 이벤트를 정리한다', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  const container = document.createElement('div'); document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => { root.render(<ScrollableTable label="검증 표"><table><tbody><tr><td>기록</td></tr></tbody></table></ScrollableTable>) })
    const region = container.querySelector<HTMLDivElement>('.table-scroll')!
    Object.defineProperty(region, 'clientWidth', { configurable: true, value: 280 })
    Object.defineProperty(region, 'scrollWidth', { configurable: true, value: 580 })
    await act(async () => { window.dispatchEvent(new Event('resize')) })
    expect(region.getAttribute('tabindex')).toBe('0'); expect(region.getAttribute('role')).toBe('region')
    expect(container.textContent).toContain('숨은 열이 있습니다.')
    expect(region.getAttribute('aria-describedby')).toBe(container.querySelector('p')?.id)
    Object.defineProperty(region, 'scrollWidth', { configurable: true, value: 280 })
    await act(async () => { window.dispatchEvent(new Event('resize')) })
    expect(container.querySelector('p')).toBeNull(); expect(region.getAttribute('tabindex')).toBeNull()
  } finally { await act(async () => { root.unmount() }); container.remove(); vi.unstubAllGlobals() }
})
