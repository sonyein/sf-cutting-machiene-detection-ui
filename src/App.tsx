import { lazy, Suspense, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { EquipmentSnapshot, InspectionRecord, PointId } from './domain/types'
import { POINT_IDS } from './domain/inspections'
import { equipmentRepository } from './services/equipmentRepository'
import { inspectionRepository, INSPECTION_STORAGE_KEY } from './services/inspectionRepository'
import { Icon } from './components/Icon'
import { COMPACT_NAV_QUERY, useMediaQuery } from './hooks/useMediaQuery'
import styles from './App.module.css'

const OverviewPage = lazy(() => import('./pages/OverviewPage'))
const DiagnosisPage = lazy(() => import('./pages/DiagnosisPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const CriteriaDialog = lazy(() => import('./components/CriteriaDialog'))
const InspectionModal = lazy(() => import('./components/InspectionModal'))

type Route = { page: 'overview' } | { page: 'diagnosis'; pointId: PointId } | { page: 'history'; pointId: PointId | ''; recordId?: string }
function readRoute(): Route {
  const [path, query] = window.location.hash.slice(1).split('?')
  const match = path?.match(/^\/diagnosis\/(blade|hydraulic|motor|feed)$/)
  if (match) return { page: 'diagnosis', pointId: match[1] as PointId }
  if (path === '/history') {
    const params = new URLSearchParams(query), point = params.get('point')
    return { page: 'history', pointId: POINT_IDS.includes(point as PointId) ? point as PointId : '', recordId: params.get('record') ?? undefined }
  }
  return { page: 'overview' }
}

export default function App() {
  const [snapshot, setSnapshot] = useState<EquipmentSnapshot | null>(null)
  const [error, setError] = useState(false)
  const [route, setRoute] = useState(readRoute)
  const [selected, setSelected] = useState<PointId>('blade')
  const [expanded, setExpanded] = useState(false)
  const compactNav = useMediaQuery(COMPACT_NAV_QUERY)
  const pointMenuButton = useRef<HTMLButtonElement>(null)
  const pointMenu = useRef<HTMLDivElement>(null)
  const keyboardOpen = useRef(false)
  const [criteriaOpen, setCriteriaOpen] = useState(false)
  const [inspectionPoint, setInspectionPoint] = useState<PointId | null>(null)
  const [saved, setSaved] = useState<InspectionRecord | null>(null)
  const history = useSyncExternalStore(inspectionRepository.subscribe, inspectionRepository.getSnapshot)
  useEffect(() => {
    let cancelled = false
    equipmentRepository.getSnapshot().then((data) => { if (!cancelled) setSnapshot(data) }).catch(() => { if (!cancelled) setError(true) })
    const onHash = () => {
      const next = readRoute(); setRoute(next)
      if (next.page === 'diagnosis') setSelected(next.pointId)
      if (window.matchMedia?.(COMPACT_NAV_QUERY).matches) {
        if (pointMenu.current?.contains(document.activeElement)) document.getElementById('main-content')?.focus({ preventScroll: true })
        setExpanded(false)
      }
      window.scrollTo(0, 0)
    }
    const onStorage = (event: StorageEvent) => { if (event.key === INSPECTION_STORAGE_KEY || event.key === null) inspectionRepository.refresh() }
    window.addEventListener('hashchange', onHash); window.addEventListener('storage', onStorage)
    return () => { cancelled = true; window.removeEventListener('hashchange', onHash); window.removeEventListener('storage', onStorage) }
  }, [])
  useEffect(() => {
    if (!expanded || !compactNav) return
    if (keyboardOpen.current) { pointMenu.current?.querySelector<HTMLAnchorElement>('a')?.focus(); keyboardOpen.current = false }
    const onOutside = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node) || pointMenu.current?.contains(target) || pointMenuButton.current?.contains(target)) return
      if (pointMenu.current?.contains(document.activeElement) && !(target instanceof Element && target.closest('a, button, input, select, textarea, [tabindex]'))) pointMenuButton.current?.focus({ preventScroll: true })
      setExpanded(false)
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault(); setExpanded(false); pointMenuButton.current?.focus({ preventScroll: true })
    }
    const onFocusOutside = (event: FocusEvent) => {
      if (event.target instanceof Node && !pointMenu.current?.contains(event.target) && !pointMenuButton.current?.contains(event.target)) setExpanded(false)
    }
    document.addEventListener('pointerdown', onOutside); document.addEventListener('keydown', onEscape); document.addEventListener('focusin', onFocusOutside)
    return () => { document.removeEventListener('pointerdown', onOutside); document.removeEventListener('keydown', onEscape); document.removeEventListener('focusin', onFocusOutside) }
  }, [expanded, compactNav])
  useEffect(() => { document.title = `커팅기 진단 · ${{ overview: '설비 전체', diagnosis: '상세 진단', history: '점검 이력' }[route.page]}` }, [route.page])
  const openCriteria = useCallback(() => setCriteriaOpen(true), [])
  const closeCriteria = useCallback(() => setCriteriaOpen(false), [])
  const navigatePoint = useCallback((id: PointId) => { window.location.hash = `/diagnosis/${id}` }, [])
  const navigateHistory = useCallback((id: PointId, record?: string) => { window.location.hash = `/history?point=${id}${record ? `&record=${encodeURIComponent(record)}` : ''}` }, [])
  const inspect = useCallback((id: PointId) => { setSaved(null); setInspectionPoint(id) }, [])
  const onSaved = useCallback((record: InspectionRecord) => { setInspectionPoint(null); setSaved(record) }, [])
  return <div className={styles.app}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>본문으로 이동</a>
    <aside className={styles.sidebar} aria-label="주 메뉴">
      <a className={styles.brand} href="#/" aria-label="커팅기 진단 홈"><span className={styles.brandMark}><span /><span /><span /></span>커팅기 진단</a>
      <div className={styles.workspace}><span className={styles.workspaceLabel}>설비</span><strong>커팅기 01</strong><span className={styles.workspaceId}>CUT-01 · 절단 공정</span></div>
      <nav className={styles.nav}>
        <a href="#/" className={`${styles.navItem} ${route.page === 'overview' ? styles.active : ''}`} aria-current={route.page === 'overview' ? 'page' : undefined}><Icon name="grid" />설비 전체</a>
        <button ref={pointMenuButton} className={`${styles.navItem} ${route.page === 'diagnosis' ? styles.active : ''}`} onClick={(event) => { keyboardOpen.current = event.detail === 0; setExpanded(!expanded) }} onKeyDown={(event) => { if (compactNav && event.key === 'ArrowDown') { event.preventDefault(); keyboardOpen.current = true; setExpanded(true) } }} aria-controls={expanded ? 'point-navigation' : undefined} aria-expanded={expanded} aria-label="지점별 진단 메뉴"><Icon name="target" />지점별 진단<Icon name="chevron" size={14} style={{ marginLeft: 'auto', transform: expanded ? 'rotate(180deg)' : undefined }} /></button>
        {expanded && <div ref={pointMenu} id="point-navigation" className={styles.subnav}>{snapshot?.points.map((point) => <a key={point.id} href={`#/diagnosis/${point.id}`} onClick={(event) => { if (compactNav) { event.preventDefault(); navigatePoint(point.id); setExpanded(false); document.getElementById('main-content')?.focus({ preventScroll: true }) } }} aria-current={route.page === 'diagnosis' && point.id === route.pointId ? 'page' : undefined}><span>{point.number.toString().padStart(2, '0')}</span>{point.shortName}</a>)}</div>}
        <a href="#/history" className={`${styles.navItem} ${route.page === 'history' ? styles.active : ''}`} aria-current={route.page === 'history' ? 'page' : undefined}><Icon name="clock" />점검 이력</a>
      </nav>
      <div className={styles.sidebarBottom}><button onClick={openCriteria}><Icon name="info" size={17} />HI 상태 기준</button><div><span className={styles.sampleDot} />가상 데이터 환경<p>실제 설비와 연결되지 않았습니다.</p></div></div>
    </aside>
    <div className={styles.mainArea}>
      <header className={styles.header}><div>제1공장<span>/</span>절단 공정<span>/</span><strong>커팅기 01</strong></div><span className={styles.prototype}>프로토타입</span></header>
      <main id="main-content" className={styles.content} tabIndex={-1}>
        {history.error && <p className="error-notice" role="alert">{history.error}</p>}
        {saved && <div className="save-notice" role="status"><span>점검 기록을 이 브라우저에 저장했습니다.</span><button className="text-button" onClick={() => { navigateHistory(saved.pointId, saved.id); setSaved(null) }}>저장 이력 보기</button><button className="icon-button" aria-label="저장 알림 닫기" onClick={() => setSaved(null)}><Icon name="close" size={16} /></button></div>}
        {error ? <div role="alert" className="loading">데이터를 불러오지 못했습니다. 페이지를 새로고침해 주세요.</div> : !snapshot ? <div role="status" className="loading">설비 데이터를 불러오는 중입니다.</div> : <Suspense fallback={<div role="status" className="loading">화면을 불러오는 중입니다.</div>}>
          {route.page === 'diagnosis' ? <DiagnosisPage key={route.pointId} point={snapshot.points.find((point) => point.id === route.pointId)!} points={snapshot.points} records={history.records} capturedAt={snapshot.capturedAt} onSelect={navigatePoint} onBack={() => { setSelected(route.pointId); window.location.hash = '/' }} onInspect={inspect} onHistory={navigateHistory} /> : route.page === 'history' ? <HistoryPage key={`${route.pointId}:${route.recordId ?? ''}`} points={snapshot.points} records={history.records} initialPoint={route.pointId} initialRecord={route.recordId} onInspect={inspect} onDiagnosis={navigatePoint} /> : <OverviewPage snapshot={snapshot} selected={selected} records={history.records} onSelect={setSelected} onNavigate={navigatePoint} onOpenCriteria={openCriteria} onHistory={navigateHistory} />}
        </Suspense>}
      </main>
    </div>
    {criteriaOpen && <Suspense fallback={null}><CriteriaDialog onClose={closeCriteria} /></Suspense>}
    {inspectionPoint && snapshot && <Suspense fallback={<div className="modal-loading" role="status">점검 입력을 불러오는 중입니다.</div>}><InspectionModal points={snapshot.points} initialPoint={inspectionPoint} onClose={() => setInspectionPoint(null)} onSaved={onSaved} /></Suspense>}
  </div>
}
