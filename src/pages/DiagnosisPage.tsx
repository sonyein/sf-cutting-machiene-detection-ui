import { lazy, memo, Suspense, useMemo, useState } from 'react'
import type { DiagnosticPoint, InspectionRecord, PointId, TrendPeriod } from '../domain/types'
import { sensorRepository } from '../services/sensorRepository'
import { formatElapsed, signalViewport, signalWindow } from '../domain/signal'
import { formatKstDateTime } from '../domain/time'
import { usePlayback } from '../hooks/usePlayback'
import { StatusBadge } from '../components/StatusBadge'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { FeatureTable } from '../components/FeatureTable'
import { Icon } from '../components/Icon'
import { TrendRange } from '../components/TrendRange'
import { overviewGuidance } from '../data/overviewGuidance'
import { checkItems } from '../data/checkItems'
import styles from './DiagnosisPage.module.css'

const SensorChart = lazy(() => import('../components/SensorChart'))
const HealthTrend = lazy(() => import('../components/HealthTrend'))

const DiagnosisContext = memo(function DiagnosisContext({ point, latest, onHistory }: { point: DiagnosticPoint; latest?: InspectionRecord; onHistory: (id: PointId, record?: string) => void }) {
  return <aside className={styles.context} aria-label="진단 판단 근거와 점검 참고">
    <div className={styles.contextHeading}><h2>현재 상태</h2><StatusBadge hi={point.hi} /></div>
    <dl className={styles.contextFields}>
      <div><dt>판단 근거</dt><dd>{overviewGuidance[point.id].evidence.map((reason) => <p key={reason}>{reason}</p>)}</dd></div>
      <div><dt>권장 점검</dt><dd>{checkItems[point.id].map((item) => <p key={item}>{item}</p>)}</dd></div>
      <div><dt>최근 점검</dt><dd>{latest ? <><button className={styles.recordLink} onClick={() => onHistory(point.id, latest.id)}>{latest.inspectedOn.replaceAll('-', '.')} · {latest.action}</button><OutcomeBadge outcome={latest.outcome} /><p className={styles.historyResult}>{latest.result}</p><span className={styles.source}>{latest.source === 'mock' ? '예시 이력' : '사용자 입력'}</span></> : '등록된 기록이 없습니다.'}</dd></div>
    </dl>
    <button className="button" onClick={() => onHistory(point.id)}>이 지점의 이력·조치 가이드</button>
  </aside>
})

export default function DiagnosisPage({ point, points, records, capturedAt, onSelect, onBack, onInspect, onHistory }: { point: DiagnosticPoint; points: DiagnosticPoint[]; records: InspectionRecord[]; capturedAt: string; onSelect: (id: PointId) => void; onBack: () => void; onInspect: (id: PointId) => void; onHistory: (id: PointId, record?: string) => void }) {
  const sensors = useMemo(() => sensorRepository.getSensors(point.id), [point.id])
  const [sensorId, setSensorId] = useState(sensors[0].id)
  const [windowSeconds, setWindowSeconds] = useState(30)
  const [period, setPeriod] = useState<TrendPeriod>('24h')
  const signal = useMemo(() => sensorRepository.getSignal(point.id, sensorId), [point.id, sensorId])
  const playback = usePlayback(signal.duration)
  const readings = useMemo(() => signalWindow(signal.readings, playback.position, windowSeconds, signal.config.sampleRate), [signal, playback.position, windowSeconds])
  const pointSeries = useMemo(() => [point], [point])
  const latest = records.find((record) => record.pointId === point.id)
  const chooseSensor = (id: typeof sensorId) => { playback.seek(signal.duration); setSensorId(id) }
  const viewport = signalViewport(playback.position, windowSeconds, signal.duration)
  const analysisRange = `${formatElapsed(readings[0].timestamp, 1)}–${formatElapsed(readings.at(-1)!.timestamp, 1)}`
  const atEnd = playback.position >= signal.duration

  return <>
    <div className={styles.backRow}><button className="text-button" onClick={onBack}><Icon name="back" size={14} />설비 전체로 돌아가기</button><label>진단 지점<select aria-label="상세 진단 지점 선택" value={point.id} onChange={(e) => onSelect(e.target.value as PointId)}>{points.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label></div>
    <div className={styles.heading}>
      <div><h1>{point.name}</h1><p>{point.summary}</p></div>
      <div className={styles.headingActions}><div className={styles.currentHi}><span>현재 예시 HI</span><strong>{point.hi.toFixed(2)}</strong><StatusBadge hi={point.hi} /></div><button className="button primary" onClick={() => { playback.pause(); onInspect(point.id) }}>점검 결과 입력</button></div>
    </div>
    <div className="sample-notice"><strong>가상 데이터</strong><span>현재 HI 기준 {formatKstDateTime(capturedAt)} KST · 원신호는 별도의 2분 예시 기록입니다. 재생·점검 입력은 현재 HI를 바꾸지 않으며 실제 모델과 연결되지 않았습니다.</span></div>
    <div className={styles.analysisWorkspace}>
      <section className={styles.signalPanel} aria-labelledby="signal-heading">
        <div className={styles.panelHeading}><h2 id="signal-heading">센서 원신호</h2><span>기록 길이 {formatElapsed(signal.duration)}</span></div>
        <div className={styles.sensorTabs} role="tablist" aria-label="센서 선택">{sensors.map((sensor, index) => <button key={sensor.id} id={`sensor-tab-${sensor.id}`} role="tab" aria-selected={sensor.id === sensorId} aria-controls="sensor-panel" tabIndex={sensor.id === sensorId ? 0 : -1} onClick={() => chooseSensor(sensor.id)} onKeyDown={(event) => {
          if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
          event.preventDefault(); const next = sensors[(index + (event.key === 'ArrowRight' ? 1 : sensors.length - 1)) % sensors.length]; chooseSensor(next.id); document.getElementById(`sensor-tab-${next.id}`)?.focus()
        }}>{sensor.label}</button>)}</div>
        <div id="sensor-panel" role="tabpanel" aria-labelledby={`sensor-tab-${sensorId}`}>
          <div className={styles.signalToolbar}><span>샘플링 {signal.config.sampleRate} Hz · 단위 {signal.config.unit}</span><div className={styles.windowControl}><span>그래프 구간</span><div className="segment-control" role="group" aria-label="원신호 표시 구간">{[10, 30, 120].map((seconds) => <button key={seconds} aria-pressed={windowSeconds === seconds} onClick={() => { playback.pause(); setWindowSeconds(seconds) }}>{seconds === 120 ? '전체 2분' : `최근 ${seconds}초`}</button>)}</div></div></div>
          <div className={styles.signalChart}><Suspense fallback={<div className="chart-loading" role="status">원신호를 불러오는 중입니다.</div>}><SensorChart signal={signal} readings={readings} cursor={playback.position} windowSeconds={windowSeconds} /></Suspense></div>
        </div>
        <div className={styles.playback}>
          <div className={styles.playbackButtons}><button className="button" onClick={playback.playing ? playback.pause : playback.play}>{playback.playing ? '일시정지' : atEnd ? '처음부터 재생' : '재생'}</button><button className="text-button" onClick={() => playback.seek(0)}>처음으로</button><label>재생 속도<select aria-label="원신호 재생 속도" value={playback.speed} onChange={(e) => playback.setSpeed(Number(e.target.value))}><option value={0.5}>0.5배</option><option value={1}>1배</option><option value={2}>2배</option></select></label><div className={styles.playbackTime}><span>재생 위치</span><output aria-label="원신호 재생 시간">{formatElapsed(playback.position, 1)} / {formatElapsed(signal.duration, 1)}</output></div></div>
          <input type="range" aria-label="원신호 재생 위치" aria-valuetext={`${formatElapsed(playback.position, 1)}, 전체 ${formatElapsed(signal.duration)}`} min={0} max={signal.duration} step={0.1} value={playback.position} onChange={(e) => playback.seek(Number(e.target.value))} />
          <div className={styles.playbackCaption}><span>그래프 시간축 {formatElapsed(viewport.start, 1)}–{formatElapsed(viewport.end, 1)}</span><span>분석 구간 {analysisRange}</span><span>실선: 센서 신호 · 점선: 재생 위치</span></div>
          <p className={styles.playbackHint}>{atEnd ? '기록 끝입니다. 처음부터 재생을 누르면 00:00에서 시작합니다.' : '재생 위치까지의 신호만 표시·분석합니다. 위치를 이동하면 일시정지합니다.'}</p>
        </div>
      </section>
      <DiagnosisContext point={point} latest={latest} onHistory={onHistory} />
    </div>
    <section className={styles.featuresAndTrend} aria-label="원신호 특징값과 HI 추이">
      <div className={styles.features}><div className={styles.panelHeading}><h2>주요 특징값 · {signal.config.label}</h2><span>재생 구간 분석</span></div><FeatureTable config={signal.config} readings={readings} /><p className={styles.calculationNote}>분석 구간 {analysisRange} · {readings.length.toLocaleString('ko-KR')}개 표본<br />특징값은 선택 센서의 가상 원신호에서 계산합니다. 비교 기준은 예시이며 HI 산출 모델은 구현되지 않았습니다.</p></div>
      <div className={styles.trend}><div className={styles.panelHeading}><h2>HI 추이</h2><div className="segment-control" role="group" aria-label="상세 HI 추이 기간">{(['8h', '24h', '7d'] as TrendPeriod[]).map((item) => <button key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{{ '8h': '8시간', '24h': '24시간', '7d': '7일' }[item]}</button>)}</div></div><div className={styles.hiChart}><Suspense fallback={<div className="chart-loading">HI 추이를 불러오는 중입니다.</div>}><HealthTrend points={pointSeries} selected={point.id} period={period} /></Suspense></div><p className={styles.calculationNote}>실선: {point.shortName} HI · 점선: 0.4 / 0.6 / 0.8 경계<br />예시 추이 · <TrendRange pointId={point.id} period={period} /></p></div>
    </section>
  </>
}
