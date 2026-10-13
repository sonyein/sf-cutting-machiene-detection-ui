import { useMemo, useState } from 'react'
import type { DiagnosticPoint, InspectionRecord, PointId } from '../domain/types'
import type { InspectionFilter } from '../domain/inspections'
import { buildActionGuide, filterInspections, findSimilarRecords } from '../domain/inspections'
import { OutcomeBadge } from '../components/OutcomeBadge'
import { StatusBadge } from '../components/StatusBadge'
import styles from './HistoryPage.module.css'

const PAGE_SIZE = 8

export default function HistoryPage({ points, records, initialPoint = '', initialRecord, onInspect, onDiagnosis }: { points: DiagnosticPoint[]; records: InspectionRecord[]; initialPoint?: PointId | ''; initialRecord?: string; onInspect: (id: PointId) => void; onDiagnosis: (id: PointId) => void }) {
  const [filter, setFilter] = useState<InspectionFilter>({ pointId: initialPoint, start: '', end: '' })
  const [selectedId, setSelectedId] = useState<string | null>(initialRecord ?? null)
  const [page, setPage] = useState(() => Math.floor(Math.max(0, records.filter((r) => !initialPoint || r.pointId === initialPoint).findIndex((r) => r.id === initialRecord)) / PAGE_SIZE) + 1)
  const rangeError = Boolean(filter.start && filter.end && filter.start > filter.end)
  const filtered = useMemo(() => rangeError ? [] : filterInspections(records, filter), [records, filter, rangeError])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), currentPage = Math.min(page, pages)
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = rows.find((r) => r.id === selectedId) ?? rows[0]
  const point = selected ? points.find((p) => p.id === selected.pointId)! : undefined
  const similar = selected ? findSimilarRecords(selected, records) : []
  const guide = selected ? buildActionGuide(selected.pointId, records) : []
  const updateFilter = (next: InspectionFilter) => { setFilter(next); setPage(1); setSelectedId(null) }
  const selectRelated = (record: InspectionRecord) => {
    const next = { pointId: record.pointId, start: '', end: '' }
    const matches = filterInspections(records, next)
    setFilter(next); setPage(Math.floor(matches.findIndex((r) => r.id === record.id) / PAGE_SIZE) + 1); setSelectedId(record.id)
  }
  return <>
    <div className={styles.heading}><div><h1>점검 이력</h1><p>현장에서 확인한 원인과 조치를 기록하고 다음 점검에 참고하세요.</p></div><button className="button primary" onClick={() => onInspect(filter.pointId || selected?.pointId || 'blade')}>점검 결과 입력</button></div>
    <div className="sample-notice"><strong>가상 데이터</strong><span>예시 이력과 이 브라우저에 저장한 사용자 입력을 함께 표시합니다. 조치 후 HI는 기록한 값이며 재진단 결과가 아닙니다.</span></div>
    <div className={styles.workspace}>
      <section className={styles.listPanel} aria-label="점검 이력 목록">
        <div className={styles.filters}>
          <label>진단 지점<select aria-label="이력 진단 지점 필터" value={filter.pointId} onChange={(e) => updateFilter({ ...filter, pointId: e.target.value as PointId | '' })}><option value="">전체 지점</option>{points.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
          <label>시작일<input type="date" aria-label="이력 시작일" value={filter.start} onChange={(e) => updateFilter({ ...filter, start: e.target.value })} /></label>
          <label>종료일<input type="date" aria-label="이력 종료일" value={filter.end} onChange={(e) => updateFilter({ ...filter, end: e.target.value })} /></label>
          <button className="text-button" onClick={() => updateFilter({ pointId: '', start: '', end: '' })}>초기화</button>
        </div>
        {rangeError && <p className={styles.rangeError} role="alert">시작일은 종료일보다 늦을 수 없습니다.</p>}
        <div className={styles.listHeading}><h2>점검 기록 <span>{filtered.length}건</span></h2><span>점검 일자 최신순</span></div>
        <div className="table-scroll"><table className={`data-table ${styles.table}`}><thead><tr><th>점검 일자</th><th>진단 지점</th><th>이상 원인</th><th>조치 상태</th><th>구분</th></tr></thead><tbody>{rows.length ? rows.map((record) => <tr key={record.id} className={record.id === selected?.id ? styles.selectedRow : ''}>
          <td className={styles.date}>{record.inspectedOn.replaceAll('-', '.')}</td><td>{points.find((p) => p.id === record.pointId)?.shortName}</td><td><button aria-label={`${record.inspectedOn} ${record.cause} 기록 상세 보기`} onClick={() => setSelectedId(record.id)}>{record.cause}</button></td><td><OutcomeBadge outcome={record.outcome} /></td><td className={styles.source}>{record.source === 'mock' ? '예시' : '사용자 입력'}</td>
        </tr>) : <tr><td colSpan={5} className={styles.empty}>조건에 맞는 점검 기록이 없습니다.</td></tr>}</tbody></table></div>
        <div className={styles.pagination}><span>{filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length}건</span><div><button className="button" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setSelectedId(null) }}>이전</button><span>{currentPage} / {pages}</span><button className="button" disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); setSelectedId(null) }}>다음</button></div></div>
      </section>
      <aside className={styles.detailPanel} aria-label="점검 상세 정보">
        {selected && point ? <>
          <div className={styles.detailHeading}><div><span>점검 상세 · {selected.source === 'mock' ? '예시 이력' : '사용자 입력'}</span><h2>{point.name}</h2></div><OutcomeBadge outcome={selected.outcome} /></div>
          <dl className={styles.fields}>
            <div><dt>점검 일자</dt><dd>{selected.inspectedOn.replaceAll('-', '.')}</dd></div>
            <div><dt>이상 원인</dt><dd>{selected.cause}</dd></div><div><dt>조치 내용</dt><dd>{selected.action}</dd></div><div><dt>조치 결과</dt><dd>{selected.result}</dd></div><div><dt>작업자 의견</dt><dd>{selected.notes || '입력한 의견이 없습니다.'}</dd></div>
          </dl>
          <div className={styles.hiComparison}><div><span>점검 시 HI · 예시</span><strong>{selected.hiBefore.toFixed(2)}</strong><StatusBadge hi={selected.hiBefore} /></div><span>→</span><div><span>조치 후 HI · 입력값</span><strong>{selected.hiAfter === null ? '—' : selected.hiAfter.toFixed(2)}</strong>{selected.hiAfter !== null && <StatusBadge hi={selected.hiAfter} />}</div></div>
          <button className={`button ${styles.diagnosisButton}`} onClick={() => onDiagnosis(point.id)}>이 지점 상세 진단 보기</button>
          <section className={styles.referenceSection} aria-labelledby="similar-heading"><h3 id="similar-heading">유사 사례</h3><p className={styles.explanation}>동일 지점·원인 키워드 기준으로 찾은 기록입니다.</p>{similar.length ? similar.map((record) => <button className={styles.relatedRecord} key={record.id} onClick={() => selectRelated(record)}><span>{record.inspectedOn.replaceAll('-', '.')}<OutcomeBadge outcome={record.outcome} /></span><strong>{record.cause}</strong><span>{record.action}</span></button>) : <p className={styles.explanation}>같은 지점의 다른 기록이 없습니다.</p>}</section>
          <section className={styles.referenceSection} aria-labelledby="guide-heading"><h3 id="guide-heading">과거 조치 참고</h3><p className={styles.explanation}>조치 완료·상태 개선 기록을 조치 내용별로 묶었습니다. 현재 원인에 맞는지 확인해 참고하세요.</p>{guide.length ? guide.map((item) => <div className={styles.guideItem} key={item.action}><strong>{item.action}</strong><span>관련 기록 {item.count}건 · 최근 {item.latest.inspectedOn.replaceAll('-', '.')}</span><p>{item.latest.result}</p><button className="text-button" onClick={() => selectRelated(item.latest)}>근거 기록 보기</button></div>) : <p className={styles.explanation}>참고할 완료·개선 기록이 없습니다.</p>}</section>
        </> : <div className={styles.empty}>목록에서 점검 기록을 선택하세요.</div>}
      </aside>
    </div>
  </>
}
