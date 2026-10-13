import type { PointId, TrendPeriod } from '../domain/types'
import { formatKstDateTime } from '../domain/time'
import { equipmentRepository } from '../services/equipmentRepository'

export function TrendRange({ pointId, period }: { pointId: PointId; period: TrendPeriod }) {
  const readings = equipmentRepository.getHealthTrend(pointId, period)
  const start = readings[0].timestamp, end = readings.at(-1)!.timestamp
  const from = formatKstDateTime(start), to = formatKstDateTime(end)
  return <><time dateTime={new Date(start).toISOString()}>{from}</time>–<time dateTime={new Date(end).toISOString()}>{from.slice(0, 4) === to.slice(0, 4) ? to.slice(5) : to}</time> (KST)</>
}
