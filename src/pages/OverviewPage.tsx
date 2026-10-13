import { lazy, Suspense, useMemo, useState } from 'react'
import type { EquipmentSnapshot, InspectionRecord, PointId, TrendPeriod } from '../domain/types'
import { classifyHealth, countHealthStates, HEALTH_ORDER, HEALTH_STATES, overallHealth } from '../domain/health'
import { Icon } from '../components/Icon'
import { StatusBadge } from '../components/StatusBadge'
import { MachineDiagram } from '../components/MachineDiagram'
import { overviewGuidance } from '../data/overviewGuidance'
import styles from './OverviewPage.module.css'

const HealthTrend = lazy(() => import('../components/HealthTrend'))

interface Props { snapshot: EquipmentSnapshot; selected: PointId; records: InspectionRecord[]; onSelect: (id: PointId) => void; onNavigate: (id: PointId) => void; onOpenCriteria: () => void; onHistory: (id: PointId, record?: string) => void }
const pointColors: Record<PointId, string> = { blade: '#3182f6', hydraulic: '#fe9800', motor: '#03b26c', feed: '#8b95a1' }
const periodLabels: Record<TrendPeriod, string> = { '8h': '8시간', '24h': '24시간', '7d': '7일' }

export default function OverviewPage({ snapshot, selected, records, onSelect, onNavigate, onOpenCriteria, onHistory }: Props) {
  const [period, setPeriod] = useState<TrendPeriod>('24h')
  const hi = useMemo(() => overallHealth(snapshot.points.map((point) => point.hi)), [snapshot])
  const counts = useMemo(() => countHealthStates(snapshot.points.map((point) => point.hi)), [snapshot])
  const point = snapshot.points.find((item) => item.id === selected)!
  const state = classifyHealth(point.hi)
  const latest = records.find((record) => record.pointId === selected)
  const captureParts = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Seoul' }).formatToParts(new Date(snapshot.capturedAt))
  const capture = Object.fromEntries(captureParts.map((part) => [part.type, part.value]))

  return <>
    <div className={styles.pageHeading}><div><h1>설비 전체 진단</h1><p>설비 상태를 확인하고 점검할 지점을 선택하세요.</p></div><button className="button" onClick={onOpenCriteria}><Icon name="info" size={16} />상태 기준</button></div>
    <div className={styles.sampleNotice}><span className={styles.sampleBadge}>가상 데이터</span><span>화면의 센서값과 진단 결과는 시연용 예시입니다. 실제 설비와 연결되지 않았습니다.</span><span className={styles.captureTime}>기준 시각 {capture.year}.{capture.month}.{capture.day} {capture.hour}:{capture.minute}</span></div>
    <section className={styles.summary} aria-label="설비 상태 요약">
      <div className={styles.equipmentIdentity}><span className={styles.equipmentId}>{snapshot.id}</span><strong>{snapshot.name}</strong><span>{snapshot.location}</span></div>
      <div className={styles.overall}><div className={styles.metricLabel}>설비 전체 HI<button className="text-button" onClick={onOpenCriteria} aria-label="설비 전체 HI 산정 기준"><Icon name="info" size={13} /></button></div><div className={styles.overallValue}><strong>{hi.toFixed(2)}</strong><StatusBadge hi={hi} subtle /></div><span className={styles.overallHint}>4개 진단 지점 HI의 최댓값</span></div>
      <div className={styles.stateCounts}>{HEALTH_ORDER.map((status) => <div key={status} className={styles[status]}><span><i />{HEALTH_STATES[status].label}</span><strong>{counts[status]}<small>지점</small></strong></div>)}</div>
    </section>
    <div className={styles.workspace}>
      <div className={styles.visualColumn}>
      <section className={styles.diagnosticPanel} aria-labelledby="diagram-heading">
        <div className={styles.panelHeading}><h2 id="diagram-heading">설비 진단 위치</h2><div className={styles.legend}>{HEALTH_ORDER.map((status) => <span key={status} className={styles[status]}><i />{HEALTH_STATES[status].label}</span>)}</div></div>
        <MachineDiagram points={snapshot.points} selected={selected} onSelect={onSelect} />
      </section>
      <section className={styles.trendPanel} aria-labelledby="trend-heading">
        <div className={styles.chartHeading}><div><h2 id="trend-heading">HI 추이</h2><span>0 정상 → 1 이상</span></div><div className={styles.periodSelector} role="group" aria-label="HI 추이 기간">{(Object.keys(periodLabels) as TrendPeriod[]).map((item) => <button key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{periodLabels[item]}</button>)}</div></div>
        <div className={styles.chartLegend}>{snapshot.points.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} aria-pressed={item.id === selected}><i style={{ background: pointColors[item.id] }} />{item.shortName}</button>)}<span>점선: 상태 경계</span></div>
        <div className={styles.chartContainer}><Suspense fallback={<div className={styles.chartLoading} role="status">HI 추이를 불러오는 중입니다.</div>}><HealthTrend points={snapshot.points} selected={selected} period={period} /></Suspense></div>
        <div className={styles.chartFooter}>고정된 예시 데이터 · {periodLabels[period]} 구간 · 기준 시각까지의 추이</div>
      </section>
      </div>
      <section className={styles.pointPanel} aria-labelledby="points-heading">
        <div className={styles.panelHeading}><h2 id="points-heading">진단 지점</h2><span className={styles.pointCount}>4개 지점</span></div>
        <div className={styles.pointList} aria-label="진단 지점 선택">
          <div className={styles.listHeader} aria-hidden="true"><span>번호</span><span>지점 / 상태 설명</span><span>HI</span><span>상태</span></div>
          {snapshot.points.map((item) => <button key={item.id} className={`${styles.pointRow} ${item.id === selected ? styles.pointSelected : ''}`} aria-pressed={item.id === selected} onClick={() => onSelect(item.id)}>
            <span className={styles.pointNumber}>{item.number.toString().padStart(2, '0')}</span>
            <span className={styles.pointText}><strong>{item.name}</strong><span title={item.summary}>{item.summary.split(' · ')[0]}</span></span>
            <span className={styles.pointHi}>{item.hi.toFixed(2)}</span>
            <StatusBadge hi={item.hi} subtle />
          </button>)}
        </div>
        <section className={styles.pointDetail} aria-labelledby="selected-point-heading" aria-live="polite">
          <div className={styles.detailEyebrow}><span>선택 지점</span><span>{point.number.toString().padStart(2, '0')}</span></div>
          <h3 id="selected-point-heading">{point.name}</h3>
          <dl className={styles.statusFacts}>
            <div><dt>현재 상태</dt><dd><StatusBadge hi={point.hi} subtle /><span>{HEALTH_STATES[state].action}</span></dd></div>
            <div><dt>현재 HI</dt><dd><strong>{point.hi.toFixed(2)}</strong></dd></div>
          </dl>
          <dl className={styles.detailFields}>
            <div className={styles.detailField}><dt>판단 근거</dt><dd>{overviewGuidance[point.id].evidence.map((reason) => <p key={reason}>{reason}</p>)}</dd></div>
            <div className={styles.detailField}><dt>권장 조치</dt><dd>{overviewGuidance[point.id].action}</dd></div>
            <div className={`${styles.detailField} ${styles.inspectionField}`}><dt>최근 점검<span>{!latest ? '기록 없음' : latest.source === 'mock' ? '예시 이력' : '사용자 입력'}</span></dt><dd>{latest ? <><time dateTime={latest.inspectedOn}>{latest.inspectedOn.replaceAll('-', '.')}</time><button className={styles.inspectionLink} onClick={() => onHistory(point.id, latest.id)}>{latest.action}</button><span className={styles.inspectionResult}>조치 후 HI {latest.hiAfter === null ? '미입력' : latest.hiAfter.toFixed(2)}</span></> : '등록된 기록이 없습니다.'}</dd></div>
          </dl>
          <div className={styles.detailActions}><button className={`button primary ${styles.detailButton}`} onClick={() => onNavigate(selected)}>상세 진단 보기</button></div>
        </section>
      </section>
    </div>
    <footer className={styles.pageFooter}><span>HI와 판단 근거는 가상 데이터 기준이며, 실제 진단 알고리즘은 연동되지 않았습니다.</span><span>설비 진단 프로토타입 · v0.1</span></footer>
  </>
}
