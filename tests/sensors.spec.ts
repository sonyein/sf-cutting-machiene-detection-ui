import { expect, it } from 'vitest'
import { sensorRepository } from '../src/services/sensorRepository'
import { equipmentRepository } from '../src/services/equipmentRepository'
import { mockEquipment } from '../src/data/mockEquipment'
import { extractSignalFeatures, signalWindow } from '../src/domain/signal'

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
    expect(trend).toBe(equipmentRepository.getHealthTrend(point.id, period))
  }
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
