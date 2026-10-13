import { describe, expect, it } from 'vitest'
import { buildActionGuide, filterInspections, findSimilarRecords, todayKst, validateInspection } from '../src/domain/inspections'
import { createInspectionRepository, INSPECTION_STORAGE_KEY } from '../src/services/inspectionRepository'
import { mockInspections } from '../src/data/mockInspections'
import type { InspectionDraft } from '../src/domain/types'

const draft: InspectionDraft = { pointId: 'blade', cause: '커팅날 마모', action: '커팅날 교체', result: '진동 감소', outcome: 'resolved', inspectedOn: '2026-01-01', notes: '다음 점검 확인', hiAfter: 0.22 }
function memoryStorage() { const data = new Map<string, string>(); return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) } } }

describe('점검 기록 검증과 조회', () => {
  it('필수값·HI 범위·미래 및 잘못된 날짜를 검증한다', () => {
    expect(validateInspection(draft, '2026-10-13')).toEqual({})
    expect(validateInspection({ ...draft, cause: ' ', action: ' ', result: '', hiAfter: NaN, inspectedOn: '2026-02-30' }, '2026-10-13')).toHaveProperty('inspectedOn')
    expect(validateInspection({ ...draft, hiAfter: 1.01, inspectedOn: '2026-10-14' }, '2026-10-13')).toHaveProperty('hiAfter')
    expect(validateInspection({ ...draft, inspectedOn: '2026-10-14' }, '2026-10-13')).toHaveProperty('inspectedOn')
    expect(validateInspection({ ...draft, notes: 'a'.repeat(2001) }, '2026-10-13')).toHaveProperty('notes')
  })
  it('점검 날짜는 KST 자정 경계로 계산한다', () => { expect(todayKst(new Date('2026-10-12T15:00:00Z'))).toBe('2026-10-13') })
  it('날짜 양 끝을 포함해 지점과 함께 필터링한다', () => {
    expect(filterInspections(mockInspections, { pointId: 'blade', start: '2026-09-14', end: '2026-10-07' }).map((r) => r.inspectedOn)).toEqual(['2026-10-07', '2026-09-14'])
    expect(filterInspections(mockInspections, { pointId: 'blade', start: '2026-10-08', end: '2026-10-13' })).toEqual([])
  })
  it('유사 사례는 자신의 기록과 다른 지점을 제외한다', () => {
    const similar = findSimilarRecords(mockInspections[0], mockInspections)
    expect(similar).toHaveLength(3); expect(similar.every((r) => r.pointId === 'blade' && r.id !== mockInspections[0].id)).toBe(true)
    expect(similar[0].id).toBe('example-5')
  })
  it('완료·개선 사례만 조치 가이드에 활용한다', () => {
    const guide = buildActionGuide('blade', mockInspections)
    expect(guide).toHaveLength(1); expect(guide[0].count).toBe(3); expect(guide[0].action).toBe('커팅날 교체')
  })
})
describe('localStorage 교체 가능한 점검 저장소', () => {
  it('저장 후 새 저장소를 만들어도 입력값과 예시 이력이 유지된다', async () => {
    const storage = memoryStorage(), repo = createInspectionRepository(() => storage)
    const record = await repo.save(draft, 0.78)
    const reloaded = createInspectionRepository(() => storage)
    expect(reloaded.getSnapshot().records).toHaveLength(13)
    expect(reloaded.getSnapshot().records.find((r) => r.id === record.id)).toMatchObject({ cause: draft.cause, hiBefore: 0.78, hiAfter: 0.22, source: 'user' })
  })
  it('손상된 데이터와 알 수 없는 스키마는 덮어쓰지 않는다', async () => {
    for (const raw of ['not json', JSON.stringify({ version: 2, records: [] }), JSON.stringify({ version: 1, records: [{ hiBefore: -1 }] })]) {
      const storage = memoryStorage(); storage.setItem(INSPECTION_STORAGE_KEY, raw)
      const repo = createInspectionRepository(() => storage)
      expect(repo.getSnapshot().canSave).toBe(false); await expect(repo.save(draft, 0.78)).rejects.toThrow()
      expect(storage.getItem(INSPECTION_STORAGE_KEY)).toBe(raw)
    }
  })
  it('저장 공간 부족 시 기존 이력을 유지하며 오류를 반환한다', async () => {
    const repo = createInspectionRepository(() => ({ getItem: () => null, setItem: () => { throw new Error('quota') } }))
    const before = repo.getSnapshot()
    await expect(repo.save(draft, 0.78)).rejects.toThrow('저장하지 못했습니다')
    expect(repo.getSnapshot()).toBe(before)
  })
  it('다른 인스턴스가 저장한 기록을 다음 저장에서 보존한다', async () => {
    const storage = memoryStorage(), a = createInspectionRepository(() => storage), b = createInspectionRepository(() => storage)
    await a.save(draft, 0.78); await b.save(draft, 0.78); await a.save(draft, 0.78)
    expect(a.getSnapshot().records).toHaveLength(15)
  })
})
