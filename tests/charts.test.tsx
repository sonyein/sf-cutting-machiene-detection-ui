// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { ChartData, ChartOptions } from 'chart.js'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import SensorChart from '../src/components/SensorChart'
import HealthTrend from '../src/components/HealthTrend'
import { sensorRepository } from '../src/services/sensorRepository'
import { equipmentRepository } from '../src/services/equipmentRepository'
import { mockEquipment } from '../src/data/mockEquipment'
import { signalWindow } from '../src/domain/signal'

type LineProps = { data: ChartData<'line'>; options: ChartOptions<'line'>; 'aria-label'?: string }
let plotted: LineProps
vi.mock('react-chartjs-2', () => ({ Line: (props: LineProps) => { plotted = props; return <div role="img" aria-label={props['aria-label']} /> } }))
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: Promise.resolve() } })
})
beforeEach(() => { container = document.createElement('div'); document.body.append(container); root = createRoot(container) })
afterEach(async () => { await act(async () => { root.unmount() }); container.remove() })

it('센서 차트는 초기 시간축·재생 커서·분석 표본을 구분하고 끝에서 기록 범위에 맞춘다', async () => {
  const signal = sensorRepository.getSignal('blade', 'vibration')
  for (const cursor of [5.2, 120]) {
    const readings = signalWindow(signal.readings, cursor, 30, signal.config.sampleRate)
    await act(async () => { root.render(<SensorChart signal={signal} readings={readings} cursor={cursor} windowSeconds={30} />) })
    expect(plotted.options.scales?.x?.min).toBe(Math.max(0, cursor - 30))
    expect(plotted.options.scales?.x?.max).toBe(Math.max(30, cursor))
    expect(plotted.data.datasets[1].data).toEqual([{ x: cursor, y: signal.min }, { x: cursor, y: signal.max }])
    const samples = plotted.data.datasets[0].data as { x: number; y: number }[]
    expect(samples.every((sample) => sample.x >= Math.max(0, cursor - 30) && sample.x <= cursor)).toBe(true)
    expect(samples).toHaveLength(Math.min(720, readings.length))
    expect(plotted.options.animation).toBe(false)
    expect(plotted.options.scales?.y?.title?.text).toBe('진동 (mm/s)')
  }
})
it('HI 차트는 선택 기간의 실제 시작·기준 시각을 축 경계로 사용하고 세 경계를 같은 범위에 그린다', async () => {
  for (const period of ['8h', '24h', '7d'] as const) {
    await act(async () => { root.render(<HealthTrend points={mockEquipment.points} selected="blade" period={period} />) })
    const readings = equipmentRepository.getHealthTrend('blade', period)
    const start = readings[0].timestamp, end = Date.parse(mockEquipment.capturedAt)
    expect(plotted.options.scales?.x?.min).toBe(start); expect(plotted.options.scales?.x?.max).toBe(end)
    expect(plotted.options.scales?.y?.min).toBe(0); expect(plotted.options.scales?.y?.max).toBe(1)
    for (const [index, boundary] of [0.4, 0.6, 0.8].entries()) expect(plotted.data.datasets[4 + index].data).toEqual([{ x: start, y: boundary }, { x: end, y: boundary }])
    expect(plotted.options.animation).toBe(false)
    expect(plotted.options.scales?.y?.title?.text).toBe('HI (0~1, 무단위)')
  }
})
