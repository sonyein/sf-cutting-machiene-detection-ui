import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DiagnosticPoint, InspectionRecord, PointId } from '../domain/types'
import type { InspectionFilter } from '../domain/inspections'
import { buildActionGuide, filterInspections, findSimilarRecords, sharedCauseKeywords } from '../domain/inspections'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { StatusBadge } from '../components/StatusBadge'
import { ScrollableTable } from '../components/ScrollableTable'
import { MOBILE_TABLE_QUERY, STACKED_HISTORY_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import styles from './HistoryPage.module.css'

const PAGE_SIZE = 8
const detailTabs = [{ id: 'details', label: '상세 기록' }, { id: 'similar', label: '유사 사례' }, { id: 'guide', label: '조치 참고' }] as const

function HistoryDetail({ record, point, records, onRelated, onDiagnosis }: { record: InspectionRecord; point: DiagnosticPoint; records: InspectionRecord[]; onRelated: (record: InspectionRecord) => void; onDiagnosis: (id: PointId) => void }) {
  const [tab, setTab] = useState<(typeof detailTabs)[number]['id']>('details')
  const similar = useMemo(() => findSimilarRecords(record, records), [record, records])
  const guide = useMemo(() => buildActionGuide(record.pointId, records), [record.pointId, records])
  const openRelated = (item: InspectionRecord) => { setTab('details'); onRelated(item) }
  return <>
    <div className={styles.detailHeading}><div><span>선택 기록 · {record.source === 'mock' ? '예시 이력' : '사용자 입력'}</span><h2>{point.name}</h2></div><OutcomeBadge outcome={record.outcome} /></div>
    <dl className={styles.fields}>
      <div><dt>점검 일자</dt><dd>{record.inspectedOn.replaceAll('-', '.')}</dd></div>
      <div><dt>이상 원인</dt><dd>{record.cause}</dd></div>
    </dl>
    <div className={styles.hiComparison} aria-label="선택 기록의 HI 비교"><div><span>{record.source === 'mock' ? '점검 당시 HI' : '저장 시 HI'}</span><strong>{record.hiBefore.toFixed(2)}</strong><StatusBadge hi={record.hiBefore} /></div><span aria-hidden="true">→</span><div><span>조치 후 HI · 기록값</span><strong>{record.hiAfter === null ? '—' : record.hiAfter.toFixed(2)}</strong>{record.hiAfter !== null ? <StatusBadge hi={record.hiAfter} /> : <span className={styles.explanation}>미입력</span>}</div></div>
    <p className={styles.hiNote}>{record.source === 'mock' ? 'HI 전후 비교는 이 점검 기록의 예시값입니다.' : '저장 시 HI는 저장 당시 화면의 예시 진단값이며, 점검 일자의 실측값이 아닙니다.'} 조치 후 HI는 재진단 결과가 아닙니다.</p>
    <div className={styles.detailTabs} role="tablist" aria-label="선택 기록 정보">{detailTabs.map((item, index) => <button key={item.id} id={`history-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls="history-tab-panel" tabIndex={tab === item.id ? 0 : -1} onClick={() => setTab(item.id)} onKeyDown={(event) => {
      let next: number
      if (event.key === 'ArrowRight') next = (index + 1) % detailTabs.length
      else if (event.key === 'ArrowLeft') next = (index + detailTabs.length - 1) % detailTabs.length
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = detailTabs.length - 1
      else return
      event.preventDefault(); setTab(detailTabs[next].id); document.getElementById(`history-tab-${detailTabs[next].id}`)?.focus()
    }}>{item.label}</button>)}</div>
    <section id="history-tab-panel" role="tabpanel" tabIndex={0} aria-labelledby={`history-tab-${tab}`} className={styles.tabContent}>
      {tab === 'details' && <dl className={styles.fields}>
        <div><dt>조치 내용</dt><dd>{record.action}</dd></div><div><dt>조치 결과</dt><dd>{record.result}</dd></div><div><dt>작업자 의견</dt><dd>{record.notes || '입력한 의견이 없습니다.'}</dd></div>
      </dl>}
      {tab === 'similar' && <><h3 id="similar-heading">원인이 겹치는 기록</h3><p className={styles.explanation}>동일 지점에서 원인·징후 키워드가 겹치는 기록만 표시합니다. 키워드 일치가 원인의 동일성을 보장하지는 않습니다.</p>{similar.length ? similar.map((item) => <button className={styles.relatedRecord} key={item.id} onClick={() => openRelated(item)}><span>{item.inspectedOn.replaceAll('-', '.')}<OutcomeBadge outcome={item.outcome} /></span><strong>{item.cause}</strong><span>일치 키워드 · {sharedCauseKeywords(record, item).join(', ')}</span><span>{item.action}</span></button>) : <p className={styles.explanation}>원인·징후 키워드가 겹치는 다른 기록이 없습니다.</p>}</>}
      {tab === 'guide' && <><h3 id="guide-heading">기록 기반 조치 참고</h3><p className={styles.explanation}>같은 지점의 완료·개선 기록을 조치 내용별로 묶었습니다. 모델이 생성한 권장 조치가 아니며, 현재 원인에 적용할 수 있는지는 점검자가 확인해야 합니다.</p>{guide.length ? guide.map((item) => <div className={styles.guideItem} key={item.action}><strong>{item.action}</strong><span>근거 기록 {item.count}건 · 최근 {item.latest.inspectedOn.replaceAll('-', '.')}</span><p>{item.latest.result}</p><button className="text-button" onClick={() => openRelated(item.latest)}>근거 기록 보기</button></div>) : <p className={styles.explanation}>참고할 완료·개선 기록이 없습니다.</p>}</>}
    </section>
    <div className={styles.detailAction}><span>현재 예시 진단 HI {point.hi.toFixed(2)} · 선택 기록과 별도</span><button className={`button ${styles.diagnosisButton}`} onClick={() => onDiagnosis(point.id)}>이 지점 상세 진단 보기</button></div>
  </>
}

export default function HistoryPage({ points, records, initialPoint = '', initialRecord, onInspect, onDiagnosis }: { points: DiagnosticPoint[]; records: InspectionRecord[]; initialPoint?: PointId | ''; initialRecord?: string; onInspect: (id: PointId) => void; onDiagnosis: (id: PointId) => void }) {
  const [filter, setFilter] = useState<InspectionFilter>({ pointId: initialPoint, start: '', end: '' })
  const [selectedId, setSelectedId] = useState<string | null>(initialRecord ?? null)
  const stacked = useMediaQuery(STACKED_HISTORY_QUERY)
  const mobileTable = useMediaQuery(MOBILE_TABLE_QUERY)
  const listPanel = useRef<HTMLElement>(null)
  const detailPanel = useRef<HTMLElement>(null)
  const pendingDetailFocus = useRef(Boolean(initialRecord && stacked))
  const [detailVisit, setDetailVisit] = useState(0)
  const [page, setPage] = useState(() => Math.floor(Math.max(0, records.filter((r) => !initialPoint || r.pointId === initialPoint).findIndex((r) => r.id === initialRecord)) / PAGE_SIZE) + 1)
  const rangeError = Boolean(filter.start && filter.end && filter.start > filter.end)
  const filtered = useMemo(() => rangeError ? [] : filterInspections(records, filter), [records, filter, rangeError])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0]
  const point = selected ? points.find((p) => p.id === selected.pointId)! : undefined
  useLayoutEffect(() => {
    if (!pendingDetailFocus.current) return
    pendingDetailFocus.current = false
    detailPanel.current?.focus({ preventScroll: true })
    detailPanel.current?.scrollIntoView({ block: 'start' })
  }, [detailVisit])
  const selectRecord = (id: string) => {
    setSelectedId(id)
    if (stacked) { pendingDetailFocus.current = true; setDetailVisit((visit) => visit + 1) }
  }
  const returnToList = () => {
    listPanel.current?.scrollIntoView({ block: 'start' })
    const selectedButton = [...(listPanel.current?.querySelectorAll<HTMLButtonElement>('[data-record-id]') ?? [])].find((button) => button.dataset.recordId === selected?.id)
    selectedButton?.focus({ preventScroll: true })
    const bounds = selectedButton?.getBoundingClientRect()
    if (bounds && (bounds.top < 0 || bounds.bottom > window.innerHeight)) selectedButton?.scrollIntoView({ block: 'nearest' })
  }
  const updateFilter = (next: InspectionFilter) => { setFilter(next); setPage(1); setSelectedId(null) }
  const selectRelated = (record: InspectionRecord) => {
    const next = { pointId: record.pointId, start: '', end: '' }
    const matches = filterInspections(records, next)
    setFilter(next); setPage(Math.floor(matches.findIndex((r) => r.id === record.id) / PAGE_SIZE) + 1); selectRecord(record.id)
  }
  return <>
    <div className={styles.heading}><div><h1>점검 이력</h1><p>현장에서 확인한 원인과 조치를 기록하고 다음 점검에 참고하세요.</p></div><button className="button primary" onClick={() => onInspect(filter.pointId || selected?.pointId || 'blade')}>점검 결과 입력</button></div>
    <div className="sample-notice"><strong>가상 데이터</strong><span>예시 이력과 이 브라우저에 저장한 사용자 입력을 함께 표시합니다. 조치 후 HI는 기록한 값이며 재진단 결과가 아닙니다.</span></div>
    <div className={styles.workspace}>
      <section ref={listPanel} className={styles.listPanel} aria-label="점검 이력 목록">
        <div className={styles.filters}>
          <label>진단 지점<select aria-label="이력 진단 지점 필터" value={filter.pointId} onChange={(e) => updateFilter({ ...filter, pointId: e.target.value as PointId | '' })}><option value="">전체 지점</option>{points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>시작일<input type="date" aria-label="이력 시작일" value={filter.start} onChange={(e) => updateFilter({ ...filter, start: e.target.value })} /></label>
          <label>종료일<input type="date" aria-label="이력 종료일" value={filter.end} onChange={(e) => updateFilter({ ...filter, end: e.target.value })} /></label>
          <button className="text-button" onClick={() => updateFilter({ pointId: '', start: '', end: '' })}>초기화</button>
        </div>
        {rangeError && <p className={styles.rangeError} role="alert">시작일은 종료일보다 늦을 수 없습니다.</p>}
        <div className={styles.listHeading}><h2>점검 기록 <span>{filtered.length}건</span></h2><span>점검 일자 최신순</span></div>
        <ScrollableTable label="점검 이력 표"><table className={`data-table ${styles.table}`}><colgroup><col className={styles.dateColumn} /><col className={styles.pointColumn} /><col /><col className={styles.outcomeColumn} />{!mobileTable && <col className={styles.sourceColumn} />}</colgroup><thead><tr><th>점검 일자</th><th>진단 지점</th><th>이상 원인</th><th>조치 상태</th>{!mobileTable && <th className={styles.sourceColumn}>구분</th>}</tr></thead><tbody>{rows.length ? rows.map((record) => <tr key={record.id} className={record.id === selected?.id ? styles.selectedRow : ''}>
          <td className={styles.date}><time dateTime={record.inspectedOn}><span>{record.inspectedOn.slice(0, 4)}.</span><span>{record.inspectedOn.slice(5).replace('-', '.')}</span></time></td><td>{points.find((p) => p.id === record.pointId)?.shortName}</td><td><button className={styles.causeButton} title={record.cause} data-record-id={record.id} aria-label={`${record.inspectedOn} ${record.cause} 기록 상세 보기`} onClick={() => selectRecord(record.id)}>{record.cause}</button>{mobileTable && <span className={styles.mobileSource}>{record.source === 'mock' ? '예시' : '사용자 입력'}</span>}</td><td><OutcomeBadge outcome={record.outcome} /></td>{!mobileTable && <td className={`${styles.source} ${styles.sourceColumn}`}>{record.source === 'mock' ? '예시' : '사용자 입력'}</td>}
        </tr>) : <tr><td colSpan={mobileTable ? 4 : 5} className={styles.empty}>조건에 맞는 점검 기록이 없습니다.</td></tr>}</tbody></table></ScrollableTable>
        <div className={styles.pagination}><span>{filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}건</span><div><button className="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setSelectedId(null) }}>이전</button><span>{currentPage} / {pages}</span><button className="button" disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); setSelectedId(null) }}>다음</button></div></div>
      </section>
      <aside ref={detailPanel} tabIndex={-1} className={styles.detailPanel} aria-label="점검 상세 정보">
        {stacked && selected && <button className={`text-button ${styles.returnButton}`} onClick={returnToList}>목록으로 돌아가기</button>}
        {selected && point ? <HistoryDetail key={selected.id} record={selected} point={point} records={records} onRelated={selectRelated} onDiagnosis={onDiagnosis} /> : <div className={styles.empty}>목록에서 점검 기록을 선택하세요.</div>}
      </aside>
    </div>
  </>
}
