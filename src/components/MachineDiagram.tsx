import { memo, useState } from 'react'
import type { DiagnosticPoint, PointId } from '../domain/types'
import { classifyHealth, HEALTH_STATES } from '../domain/health'
import styles from './MachineDiagram.module.css'

interface Props { points: DiagnosticPoint[]; selected: PointId; onSelect: (id: PointId) => void }

export const MachineDiagram = memo(function MachineDiagram({ points, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState<PointId | null>(null)
  return <div className={styles.container}>
    <div className={styles.diagram}>
      <img src={`${import.meta.env.BASE_URL}equipment.svg`} alt="프레스 상단에 유압부, 중앙에 절삭부, 하단에 모터, 오른쪽에 이송부가 배치된 커팅기 개념 구조도" width="840" height="400" draggable={false} />
      <span className={styles.annotation} style={{ left: '17.4%', top: '21.5%' }}>유압 실린더</span>
      <span className={styles.annotation} style={{ left: '14.3%', top: '49.8%' }}>절삭부</span>
      <span className={styles.annotation} style={{ left: '13.0%', top: '76.3%' }}>구동 모터</span>
      <span className={styles.annotation} style={{ left: '81.2%', top: '61.0%' }}>이송 가이드</span>
      {points.map((point) => {
        const status = classifyHealth(point.hi)
        return <div key={point.id} className={`${styles.anchor} ${styles[status]} ${point.id === selected ? styles.selected : ''}`} style={{ left: `${point.anchor.x}%`, top: `${point.anchor.y}%` }}>
          <button className={styles.pin} onClick={() => onSelect(point.id)} onMouseEnter={() => setHovered(point.id)} onMouseLeave={() => setHovered(null)} onFocus={() => setHovered(point.id)} onBlur={() => setHovered(null)} onKeyDown={(event) => { if (event.key === 'Escape') setHovered(null) }} aria-label={`${point.number} ${point.name}, HI ${point.hi.toFixed(2)}, ${HEALTH_STATES[status].label}`} aria-pressed={point.id === selected} aria-describedby={point.id === hovered ? `point-tooltip-${point.id}` : undefined}>{point.number}</button>
          {hovered === point.id && <div className={styles.tooltip} id={`point-tooltip-${point.id}`} role="tooltip"><strong>{point.name}</strong><div><span>HI <b>{point.hi.toFixed(2)}</b></span><span className={styles.tooltipStatus}>{HEALTH_STATES[status].label} · {HEALTH_STATES[status].action}</span></div></div>}
        </div>
      })}
    </div>
    <div className={styles.caption}><span>설비 개념 구조도</span><span>번호를 선택하면 해당 지점의 진단 요약이 표시됩니다.</span></div>
  </div>
})
