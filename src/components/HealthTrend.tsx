import { memo, useEffect, useMemo, useRef } from 'react'
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { DiagnosticPoint, PointId, TrendPeriod } from '../domain/types'
import { equipmentRepository } from '../services/equipmentRepository'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip)
ChartJS.defaults.font.family = 'Pretendard, sans-serif'
ChartJS.defaults.font.size = 12
ChartJS.defaults.color = '#6b7684'

const colors: Record<PointId, string> = { blade: '#3182f6', hydraulic: '#fe9800', motor: '#03b26c', feed: '#8b95a1' }

export default memo(function HealthTrend({ points, selected, period }: { points: DiagnosticPoint[]; selected: PointId; period: TrendPeriod }) {
  const ref = useRef<ChartJS<'line'>>(null)
  useEffect(() => {
    let cancelled = false
    document.fonts.ready.then(() => { if (!cancelled) ref.current?.update('none') })
    return () => { cancelled = true }
  }, [])
  const data = useMemo(() => {
    const formatTime = new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' })
    const end = equipmentRepository.getHealthTrend(points[0].id, period).at(-1)!.timestamp
    const start = equipmentRepository.getHealthTrend(points[0].id, period)[0].timestamp
    return {
      datasets: [
        ...points.map((point) => {
          const readings = equipmentRepository.getHealthTrend(point.id, period)
          return { label: point.name, data: readings.map((reading) => ({ x: reading.timestamp, y: reading.value })), borderColor: colors[point.id], borderWidth: selected === point.id ? 2 : 1.4, pointRadius: 0, pointHitRadius: 8, pointHoverRadius: 3, tension: 0, order: point.id === selected ? 0 : 1 }
        }),
        ...[0.4, 0.6, 0.8].map((value) => ({ label: `상태 경계 ${value}`, data: [{ x: start, y: value }, { x: end, y: value }], borderColor: '#d1d6db', borderWidth: 1, borderDash: [4, 4], pointRadius: 0, pointHitRadius: 0, order: 2 })),
      ],
      // Accessibility table text is in the adjoining point list; time uses a true linear axis.
      formatTime,
      start, end,
    }
  }, [points, selected, period])
  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#191f28', padding: 10, displayColors: true, filter: (item) => item.datasetIndex < points.length, callbacks: { title: (items) => `${data.formatTime.format(items[0]?.parsed.x ?? 0)} KST`, label: (item) => `${item.dataset.label}: HI ${item.parsed.y?.toFixed(2)}` } },
    },
    scales: {
      y: { min: 0, max: 1, title: { display: true, text: 'HI (0~1, 무단위)' }, ticks: { stepSize: 0.2, padding: 8, callback: (value) => Number(value).toFixed(1) }, border: { display: false }, grid: { color: '#f2f4f6', drawTicks: false } },
      x: { type: 'linear', min: data.start, max: data.end, ticks: { maxTicksLimit: period === '7d' ? 7 : 6, maxRotation: 0, padding: 8, callback: (value) => new Intl.DateTimeFormat('ko-KR', period === '7d' ? { month: '2-digit', day: '2-digit', timeZone: 'Asia/Seoul' } : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).format(Number(value)) }, border: { display: false }, grid: { display: false } },
    },
  }), [period, data, points.length])
  return <Line ref={ref} data={data} options={options} aria-label={`진단 지점 ${points.length}개의 ${period === '7d' ? '7일' : period === '24h' ? '24시간' : '8시간'} 가상 HI 추이, 세로축 0~1`} role="img" />
})
