import { useRef, useState } from 'react'
import type { DiagnosticPoint, InspectionDraft, InspectionRecord, PointId } from '../domain/types'
import { OUTCOMES, todayKst, validateInspection } from '../domain/inspections'
import { inspectionRepository } from '../services/inspectionRepository'
import { Dialog } from './Dialog'
import styles from './InspectionModal.module.css'

export default function InspectionModal({ points, initialPoint, onClose, onSaved }: { points: DiagnosticPoint[]; initialPoint: PointId; onClose: () => void; onSaved: (record: InspectionRecord) => void }) {
  const [draft, setDraft] = useState<InspectionDraft>({ pointId: initialPoint, cause: '', action: '', result: '', outcome: 'resolved', inspectedOn: todayKst(), notes: '', hiAfter: null })
  const [errors, setErrors] = useState<Partial<Record<keyof InspectionDraft, string>>>({})
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const form = useRef<HTMLFormElement>(null)
  const point = points.find((item) => item.id === draft.pointId)!
  const update = <K extends keyof InspectionDraft>(key: K, value: InspectionDraft[K]) => { setDraft((prev) => ({ ...prev, [key]: value })); setErrors((prev) => ({ ...prev, [key]: undefined })); setSaveError('') }
  const error = (key: keyof InspectionDraft) => errors[key] ? <span className={styles.error} id={`error-${key}`}>{errors[key]}</span> : null
  const fieldProps = (key: keyof InspectionDraft) => ({ id: `inspection-${key}`, name: key, 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `error-${key}` : undefined })
  return <Dialog title="점검 결과 입력" onClose={() => { if (!saving) onClose() }}>
    <form ref={form} noValidate onSubmit={async (event) => {
      event.preventDefault()
      if (saving) return
      const validation = validateInspection(draft)
      if (Object.keys(validation).length) { setErrors(validation); (form.current?.elements.namedItem(Object.keys(validation)[0]) as HTMLElement | null)?.focus(); return }
      setSaving(true)
      try { const record = await inspectionRepository.save(draft, point.hi); onSaved(record) } catch (err) { setSaveError(err instanceof Error ? err.message : '저장하지 못했습니다.') } finally { setSaving(false) }
    }}>
      <div className={styles.body}>
        <p className={styles.note}>저장 시 HI에는 현재 예시 진단값을 기록합니다. 점검 일자의 실측값은 아닙니다. 조치 후 HI는 직접 입력한 참고 값이며 재진단 결과가 아닙니다. 기록은 이 브라우저에 저장됩니다.</p>
        <div className={styles.twoColumns}>
          <label htmlFor="inspection-pointId">진단 지점 <span className={styles.required}>필수</span><select {...fieldProps('pointId')} value={draft.pointId} onChange={(e) => update('pointId', e.target.value as PointId)}>{points.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>{error('pointId')}</label>
          <label htmlFor="inspection-inspectedOn">점검 일자 <span className={styles.required}>필수</span><input {...fieldProps('inspectedOn')} type="date" max={todayKst()} value={draft.inspectedOn} onChange={(e) => update('inspectedOn', e.target.value)} />{error('inspectedOn')}</label>
        </div>
        <label htmlFor="inspection-cause">이상 원인 <span className={styles.required}>필수</span><textarea {...fieldProps('cause')} rows={2} maxLength={1000} value={draft.cause} onChange={(e) => update('cause', e.target.value)} placeholder="현장에서 확인한 원인을 입력하세요." />{error('cause')}</label>
        <label htmlFor="inspection-action">조치 내용 <span className={styles.required}>필수</span><textarea {...fieldProps('action')} rows={2} maxLength={1000} value={draft.action} onChange={(e) => update('action', e.target.value)} placeholder="실제로 수행한 점검과 조치를 입력하세요." />{error('action')}</label>
        <div className={styles.twoColumns}>
          <label htmlFor="inspection-outcome">조치 상태<select {...fieldProps('outcome')} value={draft.outcome} onChange={(e) => update('outcome', e.target.value as InspectionDraft['outcome'])}>{Object.entries(OUTCOMES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>{error('outcome')}</label>
          <label htmlFor="inspection-hiAfter">조치 후 HI <span className={styles.optional}>선택 · 현재 예시 HI {point.hi.toFixed(2)}</span><input {...fieldProps('hiAfter')} type="number" min="0" max="1" step="0.01" value={draft.hiAfter ?? ''} onChange={(e) => update('hiAfter', e.target.value === '' ? null : e.target.valueAsNumber)} placeholder="0~1" />{error('hiAfter')}</label>
        </div>
        <label htmlFor="inspection-result">조치 결과 <span className={styles.required}>필수</span><textarea {...fieldProps('result')} rows={2} maxLength={1000} value={draft.result} onChange={(e) => update('result', e.target.value)} placeholder="조치 후 확인한 변화와 남은 문제를 입력하세요." />{error('result')}</label>
        <label htmlFor="inspection-notes">작업자 의견 <span className={styles.optional}>선택</span><textarea {...fieldProps('notes')} rows={2} maxLength={2000} value={draft.notes} onChange={(e) => update('notes', e.target.value)} placeholder="다음 점검에 참고할 내용을 기록하세요." />{error('notes')}</label>
        {saveError && <p className="error-notice" role="alert">{saveError}</p>}
      </div>
      <div className={styles.footer}><button type="button" className="button" onClick={onClose} disabled={saving}>취소</button><button type="submit" className="button primary" disabled={saving}>{saving ? '저장 중…' : '기록 저장'}</button></div>
    </form>
  </Dialog>
}
