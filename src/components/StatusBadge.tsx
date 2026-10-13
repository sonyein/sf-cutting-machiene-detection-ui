import { classifyHealth, HEALTH_STATES } from '../domain/health'
import styles from './StatusBadge.module.css'

export function StatusBadge({ hi, subtle = true }: { hi: number; subtle?: boolean }) {
  const state = classifyHealth(hi)
  return <span className={`${styles.badge} ${styles[state]} ${subtle ? styles.subtle : ''}`}><span className={styles.dot} />{HEALTH_STATES[state].label}</span>
}
