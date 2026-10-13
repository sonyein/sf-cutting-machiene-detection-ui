import type { InspectionDraft, InspectionOutcome, InspectionRecord, PointId } from './types.ts'

export const OUTCOMES: Record<InspectionOutcome, string> = { resolved: '조치 완료', improved: '상태 개선', monitoring: '경과 관찰' }
export const POINT_IDS: PointId[] = ['blade', 'hydraulic', 'motor', 'feed']

export function todayKst(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const parsed = new Date(`${date}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
}
export function validateInspection(draft: InspectionDraft, today = todayKst()): Partial<Record<keyof InspectionDraft, string>> {
  const errors: Partial<Record<keyof InspectionDraft, string>> = {}
  if (!POINT_IDS.includes(draft.pointId)) errors.pointId = '진단 지점을 선택하세요.'
  for (const field of ['cause', 'action', 'result'] as const) {
    if (draft[field].trim().length < 2) errors[field] = '2자 이상 입력하세요.'
    else if (draft[field].trim().length > 1000) errors[field] = '1,000자 이내로 입력하세요.'
  }
  if (!Object.hasOwn(OUTCOMES, draft.outcome)) errors.outcome = '조치 결과 상태를 선택하세요.'
  if (!isValidDate(draft.inspectedOn)) errors.inspectedOn = '올바른 점검 일자를 입력하세요.'
  else if (draft.inspectedOn > today) errors.inspectedOn = '미래 날짜는 점검 일자로 저장할 수 없습니다.'
  if (draft.notes.length > 2000) errors.notes = '2,000자 이내로 입력하세요.'
  if (draft.hiAfter !== null && (!Number.isFinite(draft.hiAfter) || draft.hiAfter < 0 || draft.hiAfter > 1)) errors.hiAfter = '0~1 사이의 값을 입력하세요.'
  return errors
}
export function isInspectionRecord(value: unknown): value is InspectionRecord {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  return typeof r.id === 'string' && r.id.length > 0 && typeof r.createdAt === 'string' && Number.isFinite(Date.parse(r.createdAt)) && POINT_IDS.includes(r.pointId as PointId) && ['cause', 'action', 'result', 'notes'].every((field) => typeof r[field] === 'string') && typeof r.inspectedOn === 'string' && isValidDate(r.inspectedOn) && Object.hasOwn(OUTCOMES, String(r.outcome)) && typeof r.hiBefore === 'number' && Number.isFinite(r.hiBefore) && r.hiBefore >= 0 && r.hiBefore <= 1 && (r.hiAfter === null || (typeof r.hiAfter === 'number' && Number.isFinite(r.hiAfter) && r.hiAfter >= 0 && r.hiAfter <= 1)) && (r.source === 'mock' || r.source === 'user')
}
export function sortInspections(records: readonly InspectionRecord[]): InspectionRecord[] {
  return [...records].sort((a, b) => b.inspectedOn.localeCompare(a.inspectedOn) || Date.parse(b.createdAt) - Date.parse(a.createdAt))
}
export interface InspectionFilter { pointId: PointId | ''; start: string; end: string }
export function filterInspections(records: readonly InspectionRecord[], filter: InspectionFilter): InspectionRecord[] {
  return sortInspections(records.filter((record) => (!filter.pointId || record.pointId === filter.pointId) && (!filter.start || record.inspectedOn >= filter.start) && (!filter.end || record.inspectedOn <= filter.end)))
}
// Match symptoms/causes, rather than the names of the diagnostic points themselves.
const keywords = ['마모', '손상', '진동', '윤활', '압력', '누유', '정렬', '편차', '과열', '과전류', '소음', '체결']
export function sharedCauseKeywords(record: InspectionRecord, other: InspectionRecord): string[] {
  return keywords.filter((word) => record.cause.includes(word) && other.cause.includes(word))
}
export function findSimilarRecords(record: InspectionRecord, records: readonly InspectionRecord[], limit = 3): InspectionRecord[] {
  return sortInspections(records.filter((item) => item.id !== record.id && item.pointId === record.pointId))
    .map((item) => ({ item, score: sharedCauseKeywords(record, item).length }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score).slice(0, limit).map(({ item }) => item)
}
export function buildActionGuide(pointId: PointId, records: readonly InspectionRecord[]) {
  const groups = new Map<string, { action: string; count: number; latest: InspectionRecord }>()
  for (const record of sortInspections(records)) {
    if (record.pointId !== pointId || record.outcome === 'monitoring') continue
    const key = record.action.trim().replace(/\s+/g, ' ')
    const group = groups.get(key)
    if (group) group.count++
    else groups.set(key, { action: record.action, count: 1, latest: record })
  }
  return [...groups.values()].slice(0, 3)
}
