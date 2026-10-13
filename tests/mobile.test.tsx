// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import App from '../src/App'
import { inspectionRepository, INSPECTION_STORAGE_KEY } from '../src/services/inspectionRepository'

vi.mock('../src/components/HealthTrend', () => ({ default: () => <div data-testid="trend" /> }))
vi.mock('../src/components/SensorChart', () => ({ default: ({ signal }: { signal: { config: { id: string } } }) => <div data-testid="sensor" data-sensor={signal.config.id} /> }))
let width: number
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let queries: Map<string, MediaQueryList>
const scroll = vi.fn()
function matches(query: string) { const maximum = query.match(/max-width:\s*(\d+)px/); return maximum ? width <= Number(maximum[1]) : false }
async function resize(next: number) {
  await act(async () => {
    width = next
    for (const media of queries.values()) { const event = new Event('change'); Object.assign(event, { matches: media.matches, media: media.media }); media.dispatchEvent(event) }
    window.dispatchEvent(new Event('resize'))
  })
}
beforeAll(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  await Promise.all([import('../src/pages/OverviewPage'), import('../src/pages/DiagnosisPage'), import('../src/pages/HistoryPage'), import('../src/components/InspectionModal')])
})
beforeEach(async () => {
  width = 390; queries = new Map(); scroll.mockClear()
  vi.stubGlobal('matchMedia', (query: string) => {
    if (!queries.has(query)) {
      const media = Object.assign(new EventTarget(), { media: query, matches: false, onchange: null, addListener: vi.fn(), removeListener: vi.fn() })
      Object.defineProperty(media, 'matches', { get: () => matches(query) })
      queries.set(query, media as MediaQueryList)
    }
    return queries.get(query)!
  })
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1)); vi.stubGlobal('cancelAnimationFrame', vi.fn())
  window.scrollTo = vi.fn(); HTMLElement.prototype.scrollIntoView = scroll
  window.localStorage.clear(); inspectionRepository.refresh(); window.history.replaceState(null, '', '/')
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root.render(<App />) })
})
afterEach(async () => { await act(async () => { root.unmount() }); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
function button(text: string) { const target = [...container.querySelectorAll('button')].find((item) => item.textContent?.trim() === text); if (!target) throw new Error(`Missing button ${text}`); return target }
async function click(target: HTMLElement) { await act(async () => { target.click(); await new Promise((resolve) => setTimeout(resolve, 0)) }) }
async function route(path: string) { await act(async () => { window.location.hash = path; await new Promise((resolve) => setTimeout(resolve, 0)) }) }
async function change(selector: string, value: string) {
  await act(async () => {
    const element = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)!
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

it.each([1440, 390, 320])('%ipx 조건에서 기존 선택 요약 한 개를 해당 구획에 배치하고 선택·리사이즈 상태를 유지한다', async (viewport) => {
  await resize(viewport)
  const motor = container.querySelector<HTMLButtonElement>('[aria-label^="3 모터"]')!
  await click(motor)
  let summary = container.querySelector('[aria-live="polite"]')!
  expect(container.querySelectorAll('#selected-point-heading')).toHaveLength(1)
  expect(summary.querySelector('h3')?.textContent).toBe('모터 / 회전체')
  expect(summary.closest('[aria-labelledby="diagram-heading"]') !== null).toBe(viewport <= 760)
  await resize(viewport > 760 ? 320 : 1440)
  summary = container.querySelector('[aria-live="polite"]')!
  expect(container.querySelectorAll('#selected-point-heading')).toHaveLength(1)
  expect(summary.querySelector('h3')?.textContent).toBe('모터 / 회전체')
  expect(summary.closest('[aria-labelledby="diagram-heading"]') !== null).toBe(viewport > 760)
})

it.each([390, 320])('%ipx 지점 메뉴는 선택·동일 경로 선택·경로 변경·바깥 클릭·Escape로 닫히고 포커스를 복구한다', async (viewport) => {
  await resize(viewport)
  const trigger = container.querySelector<HTMLButtonElement>('[aria-label="지점별 진단 메뉴"]')!
  await act(async () => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })) })
  expect(document.activeElement?.closest('#point-navigation')).not.toBeNull()
  await click(container.querySelector<HTMLAnchorElement>('#point-navigation [href="#/diagnosis/feed"]')!)
  expect(container.querySelector('h1')?.textContent).toBe('이송 / 정렬부')
  expect(container.querySelector('#point-navigation')).toBeNull(); expect(document.activeElement?.id).toBe('main-content')
  await click(trigger); await click(container.querySelector<HTMLAnchorElement>('#point-navigation [href="#/diagnosis/feed"]')!)
  expect(container.querySelector('#point-navigation')).toBeNull()
  await click(trigger)
  await act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
  expect(container.querySelector('#point-navigation')).toBeNull(); expect(document.activeElement).toBe(trigger)
  await click(trigger)
  await act(async () => { container.querySelector('#main-content')!.dispatchEvent(new Event('pointerdown', { bubbles: true })) })
  expect(container.querySelector('#point-navigation')).toBeNull()
  await click(trigger)
  await act(async () => { container.querySelector<HTMLSelectElement>('[aria-label="상세 진단 지점 선택"]')!.focus() })
  expect(container.querySelector('#point-navigation')).toBeNull()
  expect(document.activeElement?.getAttribute('aria-label')).toBe('상세 진단 지점 선택')
  await click(trigger); await route('/history')
  expect(container.querySelector('#point-navigation')).toBeNull(); expect(document.activeElement?.id).toBe('main-content')
})

it.each([390, 320])('%ipx 이력은 네 열로 표시하고 상세 이동·목록 복귀 시 필터·페이지·선택과 포커스를 보존한다', async (viewport) => {
  await resize(viewport); await route('/history')
  await change('[aria-label="이력 시작일"]', '2026-01-01'); await change('[aria-label="이력 종료일"]', '2026-10-13')
  await click(button('다음'))
  const list = container.querySelector('[aria-label="점검 이력 목록"]')!
  expect(list.querySelectorAll('thead th')).toHaveLength(4)
  expect(list.querySelector('tbody tr')?.children).toHaveLength(4)
  expect(list.querySelector('tbody tr td:nth-child(3)')?.textContent).toContain('예시')
  const recordButton = list.querySelector<HTMLButtonElement>('[data-record-id]')!
  await click(recordButton)
  const detail = container.querySelector<HTMLElement>('[aria-label="점검 상세 정보"]')!
  expect(document.activeElement).toBe(detail); expect(scroll.mock.contexts.at(-1)).toBe(detail)
  expect(container.querySelector('#history-tab-details')?.getAttribute('aria-selected')).toBe('true')
  await click(button('조치 참고')); await click(button('목록으로 돌아가기'))
  expect(scroll.mock.contexts.at(-1)).toBe(list); expect(document.activeElement).toBe(recordButton)
  expect(list.textContent).toContain('9–12 / 12건')
  expect(container.querySelector<HTMLInputElement>('[aria-label="이력 시작일"]')?.value).toBe('2026-01-01')
  expect(container.querySelector<HTMLInputElement>('[aria-label="이력 종료일"]')?.value).toBe('2026-10-13')
  expect(recordButton.closest('tr')?.className).not.toBe('')
  await click(list.querySelectorAll<HTMLButtonElement>('[data-record-id]')[1])
  expect(container.querySelector('#history-tab-details')?.getAttribute('aria-selected')).toBe('true')
})

it.each([390, 320])('%ipx 입력 저장→이력 이동→앱 재생성 후 긴 원인과 기록값을 유지한다', async (viewport) => {
  await resize(viewport); await route('/diagnosis/blade'); await click(button('점검 결과 입력'))
  const cause = '커팅날 마모 확인 및 현장 점검 '.repeat(12).trim()
  await change('#inspection-cause', cause); await change('#inspection-action', '커팅날 교체 및 체결 확인')
  await change('#inspection-result', '진동 감소 확인'); await change('#inspection-hiAfter', '0.16')
  await change('#inspection-notes', '다음 점검에서 절삭면 재확인'); await click(button('기록 저장'))
  expect(container.querySelector('dialog')).toBeNull()
  await click(button('저장 이력 보기'))
  let detail = container.querySelector<HTMLElement>('[aria-label="점검 상세 정보"]')!
  expect(document.activeElement).toBe(detail)
  expect(detail.textContent).toContain(cause); expect(detail.textContent).toContain('저장 시 HI')
  expect(detail.textContent).toContain('0.78'); expect(detail.textContent).toContain('0.16')
  expect(container.querySelector('tbody tr td:nth-child(3)')?.textContent).toContain('사용자 입력')
  const raw = window.localStorage.getItem(INSPECTION_STORAGE_KEY)!
  await act(async () => { root.unmount(); inspectionRepository.refresh(); root = createRoot(container); root.render(<App />) })
  detail = container.querySelector<HTMLElement>('[aria-label="점검 상세 정보"]')!
  expect(detail.textContent).toContain(cause); expect(detail.textContent).toContain('다음 점검에서 절삭면 재확인')
  expect(window.localStorage.getItem(INSPECTION_STORAGE_KEY)).toBe(raw)
  expect(inspectionRepository.getSnapshot().records).toHaveLength(13)
})

it.each([390, 320])('%ipx 네 상세 지점에서 센서 전환·재생·속도·탐색·구간 선택을 유지한다', async (viewport) => {
  await resize(viewport)
  for (const point of ['blade', 'hydraulic', 'motor', 'feed']) {
    await route(`/diagnosis/${point}`)
    const tabs = [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    await click(tabs.at(-1)!)
    expect(tabs.at(-1)?.getAttribute('aria-selected')).toBe('true')
    await click(button('처음부터 재생')); expect(button('일시정지')).toBeDefined()
    await change('[aria-label="원신호 재생 속도"]', '2'); await click(button('일시정지'))
    await change('[aria-label="원신호 재생 위치"]', '45.2'); await click(button('최근 10초'))
    expect(container.querySelector('output')?.textContent).toBe('00:45.2 / 02:00.0')
    expect(container.textContent).toContain('분석 구간 00:35.2–00:45.2')
    expect(container.textContent).toContain('실제 모델과 연결되지 않았습니다.')
  }
})
