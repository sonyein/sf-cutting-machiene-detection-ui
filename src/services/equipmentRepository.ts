import { mockEquipment } from '../data/mockEquipment'
import type { EquipmentSnapshot, PointId, Reading, TrendPeriod } from '../domain/types'
import { downsample } from '../domain/downsample'

export interface EquipmentRepository {
  getSnapshot(): Promise<EquipmentSnapshot>
  getHealthTrend(pointId: PointId, period: TrendPeriod): Reading[]
}

const cache = new Map<string, Reading[]>()
const durations: Record<TrendPeriod, number> = { '8h': 8 * 3600_000, '24h': 24 * 3600_000, '7d': 7 * 86400_000 }

// Replace this adapter with HTTP requests when a Python diagnostics API is available.
export const equipmentRepository: EquipmentRepository = {
  getSnapshot: () => Promise.resolve(mockEquipment),
  getHealthTrend(pointId, period) {
    const key = `${pointId}:${period}`
    const cached = cache.get(key)
    if (cached) return cached
    const point = mockEquipment.points.find((item) => item.id === pointId)
    if (!point) throw new Error('진단 지점을 찾을 수 없습니다.')
    const end = Date.parse(mockEquipment.capturedAt)
    const count = 960
    const readings = Array.from({ length: count }, (_, index) => {
      const ratio = index / (count - 1)
      const rise = pointId === 'blade' ? 0.32 : pointId === 'hydraulic' ? 0.12 : 0.03
      const noise = (Math.sin(index * 0.037) + Math.sin(index * 0.113) * 0.4) * 0.012 * Math.sin(Math.PI * ratio)
      return { timestamp: end - durations[period] * (1 - ratio), value: Number(Math.max(0, Math.min(1, point.hi - rise * (1 - ratio) + noise)).toFixed(4)) }
    })
    const sampled = downsample(readings, 160)
    cache.set(key, sampled)
    return sampled
  },
}
