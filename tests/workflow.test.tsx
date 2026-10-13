// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { inspectionRepository, INSPECTION_STORAGE_KEY } from '../src/services/inspectionRepository'

vi.mock('../src/components/HealthTrend', () => ({ default: ({ period }: { period: string }) => <div data-testid="hi-trend" data-period={period} /> }))
vi.mock('../src/components/SensorChart', () => ({ default: ({ signal, cursor, windowSeconds }: { signal: { config: { id: string } }; cursor: number; windowSeconds: number }) => <div data-testid="sensor-chart" data-sensor={signal.config.id} data-cursor={cursor} data-window={windowSeconds} /> }))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeAll(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  window.scrollTo = vi.fn()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  await Promise.all([import('../src/pages/OverviewPage'), import('../src/pages/DiagnosisPage'), import('../src/pages/HistoryPage'), import('../src/components/InspectionModal')])
})
beforeEach(async () => {
  window.localStorage.clear(); inspectionRepository.refresh(); window.history.replaceState(null, '', '/')
  container = document.createElement('div'); document.body.append(container); root = createRoot(container)
  await act(async () => { root.render(<App />) })
})
afterEach(async () => { await act(async () => { root.unmount() }); container.remove(); vi.restoreAllMocks() })
function button(text: string) { const found = [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === text); if (!found) throw new Error(`Missing button: ${text}`); return found }
async function route(path: string) { await act(async () => { window.location.hash = path; await new Promise((resolve) => setTimeout(resolve, 0)) }) }
async function change(selector: string, value: string) {
  await act(async () => {
    const element = container.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)!
    if (!element) throw new Error(`Missing field: ${selector}`)
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

describe('상세 진단과 점검 이력 사용자 흐름', () => {
  it('4개 지점의 센서 탭과 특징값이 실제로 전환된다', async () => {
    const expected = { blade: ['vibration', 'current'], hydraulic: ['pressure', 'displacement', 'vibration'], motor: ['current', 'vibration'], feed: ['position', 'displacement', 'plc'] }
    for (const [point, sensors] of Object.entries(expected)) {
      await route(`/diagnosis/${point}`)
      expect(container.querySelectorAll('[role="tab"]')).toHaveLength(sensors.length)
      for (const id of sensors) {
        await act(async () => { container.querySelector<HTMLButtonElement>(`#sensor-tab-${id}`)!.click() })
        expect(container.querySelector('[data-testid="sensor-chart"]')?.getAttribute('data-sensor')).toBe(id)
        expect(container.querySelector(`#sensor-tab-${id}`)?.getAttribute('aria-selected')).toBe('true')
        expect(container.textContent).toContain('예시 비교 기준')
      }
    }
  })
  it('원신호 구간·탐색 위치·배속과 HI 기간을 변경한다', async () => {
    await route('/diagnosis/blade')
    await act(async () => { button('10초').click() })
    expect(container.querySelector('[data-testid="sensor-chart"]')?.getAttribute('data-window')).toBe('10')
    await change('[aria-label="원신호 재생 위치"]', '45')
    expect(container.querySelector('[data-testid="sensor-chart"]')?.getAttribute('data-cursor')).toBe('45')
    expect(container.querySelector('output')?.textContent).toBe('00:45 / 02:00')
    await change('[aria-label="원신호 재생 속도"]', '2')
    expect(container.querySelector<HTMLSelectElement>('[aria-label="원신호 재생 속도"]')?.value).toBe('2')
    await act(async () => { button('처음으로').click(); button('7일').click() })
    expect(container.querySelector('output')?.textContent).toBe('00:00 / 02:00')
    expect(container.querySelector('[data-testid="hi-trend"]')?.getAttribute('data-period')).toBe('7d')
  })
  it('입력 검증 후 저장하고 이력 및 새로 렌더링한 화면에서 기록을 찾는다', async () => {
    await route('/diagnosis/blade'); await act(async () => { button('점검 결과 입력').click() })
    await act(async () => { button('기록 저장').click() })
    expect(container.querySelector('#error-cause')?.textContent).toContain('2자 이상')
    expect(document.activeElement?.id).toBe('inspection-cause')
    expect(window.localStorage.getItem(INSPECTION_STORAGE_KEY)).toBeNull()
    await change('#inspection-cause', '커팅날 마모 재확인')
    await change('#inspection-action', '커팅날 교체 및 체결 확인')
    await act(async () => { container.querySelector<HTMLTextAreaElement>('#inspection-action')!.focus() })
    await change('#inspection-action', '커팅날 교체 및 체결 확인 완료')
    expect(document.activeElement?.id).toBe('inspection-action')
    await change('#inspection-result', '진동 감소 확인')
    await change('#inspection-hiAfter', '0.19')
    await change('#inspection-notes', '다음 점검 때 절삭면 재확인')
    await act(async () => { button('기록 저장').click() })
    expect(container.querySelector('dialog')).toBeNull()
    expect(container.textContent).toContain('점검 기록을 이 브라우저에 저장했습니다.')
    expect(JSON.parse(window.localStorage.getItem(INSPECTION_STORAGE_KEY)!).records).toHaveLength(13)
    await act(async () => { button('저장 이력 보기').click(); await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(container.querySelector('h1')?.textContent).toBe('점검 이력')
    expect(container.querySelector('[aria-label="점검 상세 정보"]')?.textContent).toContain('다음 점검 때 절삭면 재확인')
    await act(async () => { root.unmount(); inspectionRepository.refresh(); root = createRoot(container); root.render(<App />) })
    expect(container.textContent).toContain('커팅날 마모 재확인')
    await route('/')
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toContain('커팅날 교체 및 체결 확인 완료')
  })
  it('날짜·지점 필터와 빈 결과, 잘못된 기간, 페이지 이동이 동작한다', async () => {
    await route('/history')
    expect(container.textContent).toContain('1–8 / 12건')
    await act(async () => { button('다음').click() }); expect(container.textContent).toContain('9–12 / 12건')
    await change('[aria-label="이력 진단 지점 필터"]', 'blade')
    await change('[aria-label="이력 시작일"]', '2026-09-14'); await change('[aria-label="이력 종료일"]', '2026-10-07')
    expect(container.textContent).toContain('1–2 / 2건')
    await change('[aria-label="이력 시작일"]', '2026-10-08')
    expect(container.textContent).toContain('시작일은 종료일보다 늦을 수 없습니다.')
    await change('[aria-label="이력 종료일"]', '2026-10-13')
    expect(container.textContent).toContain('조건에 맞는 점검 기록이 없습니다.')
    await act(async () => { button('초기화').click() }); expect(container.textContent).toContain('1–8 / 12건')
  })
  it('유사 사례와 조치 가이드의 근거 기록을 실제로 선택한다', async () => {
    await route('/history?point=blade&record=example-1')
    const original = container.querySelector('[aria-label="점검 상세 정보"]')!
    expect(original.textContent).toContain('유사 사례'); expect(original.textContent).toContain('과거 조치 참고')
    const related = container.querySelector<HTMLButtonElement>('#similar-heading + p + button')!
    await act(async () => { related.click() })
    expect(original.textContent).toContain('2026.09.14')
    await act(async () => { button('근거 기록 보기').click() })
    expect(original.textContent).toContain('2026.10.07')
  })
  it('저장 실패 시 입력을 유지하고 성공으로 표시하지 않는다', async () => {
    await route('/diagnosis/motor'); await act(async () => { button('점검 결과 입력').click() })
    await change('#inspection-cause', '베어링 상태 확인'); await change('#inspection-action', '베어링 윤활'); await change('#inspection-result', '진동 감소')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await act(async () => { button('기록 저장').click() })
    expect(container.querySelector('dialog[open]')).not.toBeNull()
    expect(container.querySelector<HTMLTextAreaElement>('#inspection-action')?.value).toBe('베어링 윤활')
    expect(container.querySelector('dialog [role="alert"]')?.textContent).toContain('저장하지 못했습니다')
    expect(inspectionRepository.getSnapshot().records).toHaveLength(12)
  })
})
