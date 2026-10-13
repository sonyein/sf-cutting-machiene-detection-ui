import { useEffect, useRef } from 'react'
import { HEALTH_ORDER, HEALTH_STATES } from '../domain/health'
import { StatusBadge } from './StatusBadge'
import { Icon } from './Icon'
import styles from './CriteriaDialog.module.css'

export default function CriteriaDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current!
    dialog.showModal()
    return () => dialog.close()
  }, [])
  return <dialog ref={ref} className={styles.dialog} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="criteria-title">
    <div className={styles.content}>
      <div className={styles.heading}><h2 id="criteria-title">HI 상태 기준</h2><button className="icon-button" aria-label="기준 안내 닫기" onClick={onClose}><Icon name="close" /></button></div>
      <p>Health Index는 이상 정도를 0~1로 나타냅니다.<br />0에 가까울수록 정상, 1에 가까울수록 이상입니다.</p>
      <table><thead><tr><th>상태</th><th>HI 범위</th><th>점검 방향</th></tr></thead><tbody>{HEALTH_ORDER.map((state, index) => <tr key={state}><td><StatusBadge hi={[0.2, 0.5, 0.7, 0.9][index]} /></td><td>{HEALTH_STATES[state].range}</td><td>{HEALTH_STATES[state].action}</td></tr>)}</tbody></table>
      <div className={styles.note}>설비 전체 HI는 4개 진단 지점 중 최댓값입니다. 이 기준과 조치 방향은 프로토타입의 예시이며, 실제 설비 적용 시 검증이 필요합니다.</div>
      <button className="button primary" onClick={onClose}>확인</button>
    </div>
  </dialog>
}
