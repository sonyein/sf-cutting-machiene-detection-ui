import type { HealthStatus } from './types.ts'

export const HEALTH_STATES: Record<HealthStatus, { label: string; action: string; range: string }> = {
  normal: { label: '정상', action: '정기 점검 유지', range: '0 ≤ HI < 0.4' },
  watch: { label: '관찰', action: '추이 확인', range: '0.4 ≤ HI < 0.6' },
  warning: { label: '주의', action: '점검 필요', range: '0.6 ≤ HI < 0.8' },
  danger: { label: '위험', action: '우선 점검', range: '0.8 ≤ HI ≤ 1' },
}

export const HEALTH_ORDER: HealthStatus[] = ['normal', 'watch', 'warning', 'danger']

export function classifyHealth(hi: number): HealthStatus {
  if (!Number.isFinite(hi) || hi < 0 || hi > 1) throw new RangeError('HI는 0~1 사이의 유한한 값이어야 합니다.')
  if (hi >= 0.8) return 'danger'
  if (hi >= 0.6) return 'warning'
  if (hi >= 0.4) return 'watch'
  return 'normal'
}

export function overallHealth(values: number[]): number {
  if (values.length === 0) throw new RangeError('진단 지점이 필요합니다.')
  values.forEach(classifyHealth)
  return Math.max(...values)
}

export function countHealthStates(values: number[]): Record<HealthStatus, number> {
  const counts = { normal: 0, watch: 0, warning: 0, danger: 0 }
  for (const hi of values) counts[classifyHealth(hi)] += 1
  return counts
}
