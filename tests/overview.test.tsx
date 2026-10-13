// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { inspectionRepository } from '../src/services/inspectionRepository'

vi.mock('../src/components/HealthTrend', () => ({ default: ({ period }: { period: string }) => <div data-testid="trend" data-period={period}>HI 추이 테스트</div> }))
vi.mock('../src/components/SensorChart', () => ({ default: () => <div>가상 원신호</div> }))

let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeAll(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  window.scrollTo = vi.fn()
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  await Promise.all([import('../src/pages/OverviewPage'), import('../src/pages/DiagnosisPage'), import('../src/components/CriteriaDialog')])
})

beforeEach(async () => {
  window.history.replaceState(null, '', '/')
  window.localStorage.clear(); inspectionRepository.refresh()
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root.render(<App />) })
})

afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
})

function button(text: string): HTMLButtonElement {
  const match = [...container.querySelectorAll('button')].find((element) => element.textContent?.includes(text))
  if (!match) throw new Error(`버튼을 찾을 수 없습니다: ${text}`)
  return match
}

describe('설비 전체 진단 화면의 사용자 흐름', () => {
  it('가상 데이터 표시와 4개 진단 지점을 렌더링한다', () => {
    expect(container.querySelector('h1')?.textContent).toBe('설비 전체 진단')
    expect(container.textContent).toContain('실제 설비와 연결되지 않았습니다.')
    expect(container.querySelectorAll('button[aria-pressed][aria-label*="HI "]')).toHaveLength(4)
    expect(container.textContent).toContain('0.78')
  })

  it('구조도 클릭과 우측 목록 선택이 동일한 진단 요약을 갱신한다', async () => {
    const motorPin = container.querySelector<HTMLButtonElement>('button[aria-label^="3 모터"]')!
    await act(async () => { motorPin.click() })
    expect(motorPin.getAttribute('aria-pressed')).toBe('true')
    const detail = container.querySelector('[aria-live="polite"]')!
    expect(detail.querySelector('h3')?.textContent).toBe('모터 / 회전체')
    expect(detail.textContent).toContain('진동 RMS·모터 전류는 예시 정상 범위')
    expect(detail.textContent).toContain('0.23')
    expect(detail.textContent).toContain('베어링 윤활')
    await act(async () => { button('유압 / 프레스').click() })
    expect(detail.querySelector('h3')?.textContent).toBe('유압 / 프레스')
    expect(detail.textContent).toContain('압력 변동 폭이 예시 기준보다 높음')
    expect(detail.textContent).toContain('0.46')
    expect(detail.textContent).toContain('유압 오일 보충')
    expect(container.querySelector('button[aria-label^="2 유압"]')?.getAttribute('aria-pressed')).toBe('true')
    expect(motorPin.getAttribute('aria-pressed')).toBe('false')
  })

  it('마우스 오버 시 해당 지점 HI와 상태 툴팁을 표시한다', async () => {
    const pin = container.querySelector<HTMLButtonElement>('button[aria-label^="1 커팅날"]')!
    await act(async () => { pin.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })) })
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain('0.78')
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain('주의')
    await act(async () => { pin.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })) })
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
    await act(async () => { pin.focus() })
    expect(container.querySelector('[role="tooltip"]')?.textContent).toContain('커팅날 / 절삭부')
    await act(async () => { pin.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })) })
    expect(container.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('그래프 기간을 변경하고 선택 상태와 그래프 입력을 갱신한다', async () => {
    await act(async () => { button('7일').click() })
    expect(button('7일').getAttribute('aria-pressed')).toBe('true')
    expect(button('24시간').getAttribute('aria-pressed')).toBe('false')
    expect(container.querySelector('[data-testid="trend"]')?.getAttribute('data-period')).toBe('7d')
    expect(container.textContent).toContain('2026.10.06 09:30–10.13 09:30 (KST)')
  })

  it('HI 기준 모달을 열고 닫는다', async () => {
    await act(async () => { button('상태 기준').click() })
    expect(document.querySelector('dialog[open]')).not.toBeNull()
    expect(document.querySelector('dialog')?.textContent).toContain('0.8 ≤ HI ≤ 1')
    await act(async () => { document.querySelector<HTMLButtonElement>('dialog .primary')!.click() })
    expect(document.querySelector('dialog')).toBeNull()
  })

  it('선택 지점 요약으로 이동하고 돌아오면 선택을 유지한다', async () => {
    await act(async () => { button('이송 / 정렬부').click() })
    await act(async () => { button('상세 진단 보기').click(); await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(window.location.hash).toBe('#/diagnosis/feed')
    expect(container.querySelector('h1')?.textContent).toBe('이송 / 정렬부')
    expect(container.textContent).toContain('센서 원신호')
    expect(container.textContent).not.toContain('디자인 검수 단계')
    await act(async () => { container.querySelector<HTMLAnchorElement>('.skip-link')!.click() })
    expect(window.location.hash).toBe('#/diagnosis/feed')
    expect(document.activeElement?.id).toBe('main-content')
    await act(async () => { button('설비 전체로 돌아가기').click(); await new Promise((resolve) => setTimeout(resolve, 0)) })
    expect(container.querySelector('h1')?.textContent).toBe('설비 전체 진단')
    expect(container.querySelector('button[aria-label^="4 이송"]')?.getAttribute('aria-pressed')).toBe('true')
  })
})
