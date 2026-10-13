import type { Reading } from './types.ts'

// Keep first/last values and local extrema; maintain chronological ordering.
export function downsample(readings: readonly Reading[], maxPoints = 160): Reading[] {
  if (!Number.isInteger(maxPoints) || maxPoints < 4) throw new RangeError('표시 개수는 4 이상의 정수여야 합니다.')
  if (readings.length <= maxPoints) return [...readings]
  const buckets = Math.floor((maxPoints - 2) / 2)
  const result: Reading[] = [readings[0]]
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = 1 + Math.floor(bucket * (readings.length - 2) / buckets)
    const end = 1 + Math.floor((bucket + 1) * (readings.length - 2) / buckets)
    let min = start
    let max = start
    for (let index = start + 1; index < end; index++) {
      if (readings[index].value < readings[min].value) min = index
      if (readings[index].value > readings[max].value) max = index
    }
    for (const index of [...new Set([min, max])].sort((a, b) => a - b)) result.push(readings[index])
  }
  result.push(readings[readings.length - 1])
  return result
}
