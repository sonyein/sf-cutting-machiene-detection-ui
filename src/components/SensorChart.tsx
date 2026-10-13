import { memo, useEffect, useMemo, useRef } from 'react'
import { Chart as ChartJS, LinearScale, PointElement, LineElement, Tooltip } from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Line } from 'react-chartjs-2'
import type { Reading } from '../domain/types'
import type { SensorSignal } from '../services/sensorRepository'
import { downsample } from '../domain/downsample'

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip)
ChartJS.defaults.font.family = 'Pretendard, sans-serif'
ChartJS.defaults.font.size = 11
ChartJS.defaults.color = '#6b7684'

export default memo(function SensorChart({ signal, readings, cursor, windowSeconds }: { signal: SensorSignal; readings: Reading[]; cursor: number; windowSeconds: number }) {
  const ref = useRef<ChartJS<'line'>>(null)
  useEffect(() => { let cancelled = false; document.fonts.ready.then(() => { if (!cancelled) ref.current?.update('none') }); return () => { cancelled = true } }, [])
  const data = useMemo(() => ({ datasets: [
    { label: signal.config.label, data: downsample(readings, 720).map((r) => ({ x: r.timestamp, y: r.value })), borderColor: '#3182f6', borderWidth: 1.25, pointRadius: 0, pointHitRadius: 5, stepped: signal.config.id === 'plc', tension: 0 },
    { label: '재생 위치', data: [{ x: cursor, y: signal.min }, { x: cursor, y: signal.max }], borderColor: '#6b7684', borderWidth: 1, borderDash: [3, 3], pointRadius: 0, pointHitRadius: 0 },
  ] }), [signal, readings, cursor])
  const options: ChartOptions<'line'> = useMemo(() => ({
    responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#191f28', filter: (item) => item.datasetIndex === 0, callbacks: { title: (items) => `${items[0]?.parsed.x?.toFixed(2)} s`, label: (item) => `${signal.config.label}: ${item.parsed.y?.toFixed(3)} ${signal.config.unit}` } } },
    scales: {
      x: { type: 'linear', min: Math.max(0, cursor - windowSeconds), max: Math.max(cursor, windowSeconds), title: { display: true, text: '기록 시작 후 시간 (s)' }, ticks: { maxTicksLimit: 7, maxRotation: 0, callback: (v) => Number(v).toFixed(0) }, border: { display: false }, grid: { display: false } },
      y: { min: signal.min, max: signal.max, title: { display: true, text: signal.config.unit }, ticks: { maxTicksLimit: 6 }, border: { display: false }, grid: { color: '#f2f4f6', drawTicks: false } },
    },
  }), [signal, cursor, windowSeconds])
  return <Line ref={ref} data={data} options={options} role="img" aria-label={`${signal.config.label} 가상 원신호, ${Math.max(0, cursor - windowSeconds).toFixed(1)}초부터 ${cursor.toFixed(1)}초까지, 단위 ${signal.config.unit}`} />
})
