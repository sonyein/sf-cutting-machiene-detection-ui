import type { PointId, Reading } from '../domain/types'
import { extractSignalFeatures } from '../domain/signal'

type SensorId = 'vibration' | 'current' | 'pressure' | 'displacement' | 'position' | 'plc'
type FeatureKey = keyof NonNullable<ReturnType<typeof extractSignalFeatures>>
export interface FeatureRule { key: FeatureKey; label: string; unit: string; min?: number; max?: number; reference: string }
export interface SensorConfig { id: SensorId; label: string; unit: string; sampleRate: number; rules: FeatureRule[] }
export interface SensorSignal { config: SensorConfig; readings: Reading[]; duration: number; min: number; max: number }
const config: Record<SensorId, SensorConfig> = {
  vibration: { id: 'vibration', label: '진동', unit: 'mm/s', sampleRate: 200, rules: [
    { key: 'rms', label: 'RMS', unit: 'mm/s', max: 2.5, reference: '2.50 이하' }, { key: 'kurtosis', label: '첨도', unit: '', max: 3.5, reference: '3.50 이하' }, { key: 'std', label: '표준편차', unit: 'mm/s', max: 2.5, reference: '2.50 이하' }, { key: 'peak', label: '피크', unit: 'mm/s', max: 8, reference: '8.00 이하' },
  ] },
  current: { id: 'current', label: '전류', unit: 'A', sampleRate: 100, rules: [
    { key: 'mean', label: '평균 전류', unit: 'A', min: 5, max: 9, reference: '5.00~9.00' }, { key: 'rms', label: 'RMS', unit: 'A', max: 9, reference: '9.00 이하' }, { key: 'std', label: '표준편차', unit: 'A', max: 0.7, reference: '0.70 이하' }, { key: 'peak', label: '피크', unit: 'A', max: 12, reference: '12.00 이하' },
  ] },
  pressure: { id: 'pressure', label: '압력', unit: 'MPa', sampleRate: 50, rules: [
    { key: 'mean', label: '평균 압력', unit: 'MPa', min: 12, max: 13, reference: '12.00~13.00' }, { key: 'std', label: '표준편차', unit: 'MPa', max: 0.5, reference: '0.50 이하' }, { key: 'range', label: '압력 변동 폭', unit: 'MPa', max: 1.4, reference: '1.40 이하' }, { key: 'max', label: '최대 압력', unit: 'MPa', max: 14, reference: '14.00 이하' },
  ] },
  displacement: { id: 'displacement', label: '변위', unit: 'mm', sampleRate: 50, rules: [
    { key: 'mean', label: '평균 변위', unit: 'mm', min: 20, max: 40, reference: '20.00~40.00' }, { key: 'std', label: '표준편차', unit: 'mm', max: 15, reference: '15.00 이하' }, { key: 'min', label: '최소 변위', unit: 'mm', min: 5, reference: '5.00 이상' }, { key: 'max', label: '최대 변위', unit: 'mm', max: 55, reference: '55.00 이하' },
  ] },
  position: { id: 'position', label: '위치 편차', unit: 'mm', sampleRate: 50, rules: [
    { key: 'mean', label: '평균 편차', unit: 'mm', min: -0.3, max: 0.3, reference: '-0.30~0.30' }, { key: 'std', label: '표준편차', unit: 'mm', max: 0.15, reference: '0.15 이하' }, { key: 'peak', label: '최대 절대 편차', unit: 'mm', max: 0.3, reference: '0.30 이하' }, { key: 'range', label: '변동 폭', unit: 'mm', max: 0.4, reference: '0.40 이하' },
  ] },
  plc: { id: 'plc', label: 'PLC 이송 신호', unit: '0 / 1', sampleRate: 20, rules: [
    { key: 'duty', label: '고레벨 비율', unit: '%', min: 60, max: 85, reference: '60.00~85.00' }, { key: 'risingEdges', label: '상승 에지 수', unit: '회', reference: '선택 구간 내 사이클 수' },
  ] },
}
const sensors: Record<PointId, SensorId[]> = { blade: ['vibration', 'current'], hydraulic: ['pressure', 'displacement', 'vibration'], motor: ['current', 'vibration'], feed: ['position', 'displacement', 'plc'] }
const cache = new Map<string, SensorSignal>()
export interface SensorRepository { getSensors(pointId: PointId): SensorConfig[]; getSignal(pointId: PointId, sensorId: SensorId): SensorSignal }
export const sensorRepository: SensorRepository = {
  getSensors: (pointId) => sensors[pointId].map((id) => config[id]),
  getSignal(pointId, sensorId) {
    if (!sensors[pointId].includes(sensorId)) throw new Error('해당 지점에 없는 센서입니다.')
    const key = `${pointId}:${sensorId}`
    const cached = cache.get(key)
    if (cached) return cached
    const sensor = config[sensorId], duration = 120
    const readings = Array.from({ length: duration * sensor.sampleRate + 1 }, (_, i) => {
      const t = i / sensor.sampleRate, cycle = pointId === 'feed' ? 1.24 : 4.82
      let value: number
      if (sensorId === 'vibration') {
        const amplitude = pointId === 'blade' ? 2.2 + (t / duration) * 1.8 : pointId === 'motor' ? 1.4 : 1.8
        const pulse = pointId === 'blade' && t > 75 && Math.sin(t * 2 * Math.PI * 0.73) > 0.996 ? 12 * Math.sin(t * 2 * Math.PI * 37) : 0
        value = amplitude * Math.sin(t * 2 * Math.PI * 21) + amplitude * 0.3 * Math.sin(t * 2 * Math.PI * 47) + pulse
      } else if (sensorId === 'current') value = (pointId === 'blade' ? 8.2 : 6.4) + 0.5 * Math.sin(t * 2 * Math.PI / cycle) + 0.16 * Math.sin(t * 2 * Math.PI * 13)
      else if (sensorId === 'pressure') value = 12.6 + (0.5 + t / duration * 0.18) * Math.sin(t * 2 * Math.PI / cycle) + 0.12 * Math.sin(t * 2 * Math.PI * 3.2)
      else if (sensorId === 'displacement') value = 30 + 20 * Math.sin(t * 2 * Math.PI / cycle)
      else if (sensorId === 'position') value = 0.1 + 0.08 * Math.sin(t * 2 * Math.PI / cycle) + 0.02 * Math.sin(t * 2 * Math.PI * 4)
      else value = t % cycle < cycle * 0.75 ? 1 : 0
      return { timestamp: t, value: Number(value.toFixed(5)) }
    })
    let min = Infinity, max = -Infinity
    readings.forEach((r) => { min = Math.min(min, r.value); max = Math.max(max, r.value) })
    const padding = Math.max((max - min) * 0.08, 0.1)
    const signal = { config: sensor, readings, duration, min: min - padding, max: max + padding }
    cache.set(key, signal); return signal
  },
}
