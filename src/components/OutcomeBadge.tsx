import type { InspectionOutcome } from '../domain/types'
import { OUTCOMES } from '../domain/inspections'
import styles from './OutcomeBadge.module.css'
export function OutcomeBadge({ outcome }: { outcome: InspectionOutcome }) { return <span className={`${styles.badge} ${styles[outcome]}`}>{OUTCOMES[outcome]}</span> }
