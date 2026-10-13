import { expect, it } from 'vitest'
import { sensorRepository } from '../src/services/sensorRepository'
import { equipmentRepository } from '../src/services/equipmentRepository'
import { mockEquipment } from '../src/data/mockEquipment'
import { extractSignalFeatures, signalWindow, signalViewport } from '../src/domain/signal'
import { formatKstDateTime } from '../src/domain/time'

it('모든 센서가 유한하고 정렬된 120초 신호를 제공하며 재조회 시 캐시를 재사용한다', () => {
  for (const point of mockEquipment.points) for (const config of sensorRepository.getSensors(point.id)) {
    const signal = sensorRepository.getSignal(point.id, config.id)
    expect(signal.readings.length).toBe(config.sampleRate * 120 + 1)
    expect(signal.readings[0].timestamp).toBe(0); expect(signal.readings.at(-1)!.timestamp).toBe(120)
    expect(signal.readings.every((r, i, all) => Number.isFinite(r.value) && (i === 0 || r.timestamp > all[i - 1].timestamp))).toBe(true)
    expect(signal).toBe(sensorRepository.getSignal(point.id, config.id))
  }
  expect(() => sensorRepository.getSignal('blade', 'pressure')).toThrow()
})
it('기간별 HI 구간은 고정 시각·현재 HI와 일치하고 표시 예산을 지킨다', () => {
  for (const point of mockEquipment.points) for (const period of ['8h', '24h', '7d'] as const) {
    const trend = equipmentRepository.getHealthTrend(point.id, period)
    expect(trend.length).toBeLessThanOrEqual(160)
    expect(trend.at(-1)!.timestamp).toBe(Date.parse(mockEquipment.capturedAt))
    expect(trend.at(-1)!.value).toBe(point.hi)
    expect(trend[0].timestamp).toBe(Date.parse(mockEquipment.capturedAt) - { '8h': 8 * 3600_000, '24h': 24 * 3600_000, '7d': 7 * 86400_000 }[period])
    expect(trend.every((r, i) => r.timestamp >= trend[0].timestamp && r.timestamp <= Date.parse(mockEquipment.capturedAt) && (i === 0 || r.timestamp > trend[i - 1].timestamp))).toBe(true)
    expect(trend).toBe(equipmentRepository.getHealthTrend(point.id, period))
  }
})
it('재생 초기·중간·끝의 시간축과 분석 표본 구간은 서로 구분되며 기록 범위를 넘지 않는다', () => {
  const signal = sensorRepository.getSignal('blade', 'vibration')
  for (const window of [10, 30, 120]) for (const cursor of [0, 5.2, 45, 120]) {
    const viewport = signalViewport(cursor, window, signal.duration)
    const readings = signalWindow(signal.readings, cursor, window, signal.config.sampleRate)
    expect(viewport.start).toBe(Math.max(0, cursor - window)); expect(viewport.end).toBe(Math.max(cursor, window))
    expect(readings.every((r) => r.timestamp >= viewport.start && r.timestamp <= cursor && r.timestamp <= viewport.end)).toBe(true)
    expect(viewport.end).toBeLessThanOrEqual(120)
  }
  expect(signalViewport(5, 30, 120)).toEqual({ start: 0, end: 30 })
  expect(signalViewport(120, 30, 120)).toEqual({ start: 90, end: 120 })
})
it('HI 기준 시각과 24시간/7일 추이의 날짜는 KST로 표시한다', () => {
  expect(formatKstDateTime(mockEquipment.capturedAt)).toBe('2026.10.13 09:30')
  expect(formatKstDateTime(equipmentRepository.getHealthTrend('blade', '24h')[0].timestamp)).toBe('2026.10.12 09:30')
  expect(formatKstDateTime(equipmentRepository.getHealthTrend('blade', '7d')[0].timestamp)).toBe('2026.10.06 09:30')
})
it('절삭부의 최근 원신호 특징값이 표시한 예시 판단 근거와 일치한다', () => {
  const signal = sensorRepository.getSignal('blade', 'vibration')
  const features = extractSignalFeatures(signalWindow(signal.readings, 120, 30, signal.config.sampleRate))!
  expect(features.rms).toBeGreaterThan(2.5)
  expect(features.kurtosis).toBeGreaterThan(3.5)
  const current = sensorRepository.getSignal('blade', 'current')
  const currentFeatures = extractSignalFeatures(signalWindow(current.readings, 120, 30, current.config.sampleRate))!
  expect(currentFeatures.mean).toBeGreaterThan(5)
  expect(currentFeatures.mean).toBeLessThan(9)
})
