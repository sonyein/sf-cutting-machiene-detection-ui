import { mockInspections } from '../data/mockInspections'
import { isInspectionRecord, sortInspections, validateInspection } from '../domain/inspections'
import type { InspectionDraft, InspectionRecord } from '../domain/types'

export const INSPECTION_STORAGE_KEY = 'cutting-diagnostics:inspections:v1'
interface StorageLike { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface InspectionState { records: InspectionRecord[]; error: string | null; canSave: boolean }
export interface InspectionRepository {
  getSnapshot(): InspectionState
  subscribe(listener: () => void): () => void
  save(draft: InspectionDraft, hiBefore: number): Promise<InspectionRecord>
  refresh(): void
}
export function createInspectionRepository(getStorage: () => StorageLike, seed: InspectionRecord[] = mockInspections): InspectionRepository {
  let state: InspectionState | undefined
  const listeners = new Set<() => void>()
  const read = (): InspectionState => {
    try {
      const raw = getStorage().getItem(INSPECTION_STORAGE_KEY)
      if (raw === null) return { records: sortInspections(seed), error: null, canSave: true }
      const envelope: unknown = JSON.parse(raw)
      if (!envelope || typeof envelope !== 'object' || !('version' in envelope) || envelope.version !== 1 || !('records' in envelope) || !Array.isArray(envelope.records) || !envelope.records.every(isInspectionRecord) || new Set(envelope.records.map((r) => r.id)).size !== envelope.records.length) throw new Error('invalid')
      return { records: sortInspections(envelope.records), error: null, canSave: true }
    } catch {
      return { records: sortInspections(seed), error: '저장된 이력을 읽을 수 없습니다. 기존 데이터는 변경하지 않았습니다. 현재 예시 이력만 표시합니다.', canSave: false }
    }
  }
  const emit = () => listeners.forEach((listener) => listener())
  return {
    getSnapshot: () => state ??= read(),
    subscribe(listener) { listeners.add(listener); return () => { listeners.delete(listener) } },
    async save(draft, hiBefore) {
      if (Object.keys(validateInspection(draft)).length || !Number.isFinite(hiBefore) || hiBefore < 0 || hiBefore > 1) throw new Error('입력값을 확인하세요.')
      // Read the newest persistent state before saving, so another tab's records are retained.
      const current = read()
      if (!current.canSave) { state = current; emit(); throw new Error(current.error!) }
      const record: InspectionRecord = { ...draft, cause: draft.cause.trim(), action: draft.action.trim(), result: draft.result.trim(), notes: draft.notes.trim(), hiBefore, id: crypto.randomUUID(), createdAt: new Date().toISOString(), source: 'user' }
      const records = sortInspections([record, ...current.records])
      try { getStorage().setItem(INSPECTION_STORAGE_KEY, JSON.stringify({ version: 1, records })) }
      catch { throw new Error('이력을 저장하지 못했습니다. 브라우저 저장 공간과 권한을 확인하세요. 입력 내용은 유지됩니다.') }
      state = { records, error: null, canSave: true }; emit()
      return record
    },
    refresh() { state = read(); emit() },
  }
}
export const inspectionRepository = createInspectionRepository(() => window.localStorage)
