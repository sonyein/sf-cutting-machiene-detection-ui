import type { EquipmentSnapshot } from '../domain/types'

export const mockEquipment: EquipmentSnapshot = {
  id: 'CUT-01',
  name: '커팅기 01',
  location: '제1공장 · 절단 공정',
  capturedAt: '2026-10-13T09:30:00+09:00',
  source: 'mock',
  points: [
    {
      id: 'blade', number: 1, name: '커팅날 / 절삭부', shortName: '절삭부', hi: 0.78,
      summary: '진동 특징값 상승 · 커팅날 점검 필요',
      evidence: ['진동 RMS와 첨도가 예시 정상 기준보다 높습니다.', '전류는 예시 정상 범위로, 절삭부를 우선 확인합니다.'],
      sensors: ['진동', '전류'], anchor: { x: 46.2, y: 47.0 },
      metrics: [
        { label: '진동 RMS', value: '3.84', unit: 'mm/s', note: '예시 기준 2.50 이하' },
        { label: '첨도', value: '5.62', unit: '', note: '예시 기준 3.50 이하' },
        { label: '전류', value: '8.20', unit: 'A', note: '예시 범위 6.00~9.00' },
      ],
      lastInspection: { date: '2026.10.07', action: '커팅날 교체', hiAfter: 0.21 },
    },
    {
      id: 'hydraulic', number: 2, name: '유압 / 프레스', shortName: '프레스', hi: 0.46,
      summary: '압력 변동 증가 · 추이 확인',
      evidence: ['압력 변동 폭이 예시 정상 기준보다 소폭 높습니다.', '사이클 시간은 예시 정상 범위입니다.'],
      sensors: ['압력', '변위', '진동'], anchor: { x: 46.2, y: 21.5 },
      metrics: [
        { label: '유압', value: '12.6', unit: 'MPa', note: '예시 범위 12.0~13.0' },
        { label: '압력 변동', value: '0.68', unit: 'MPa', note: '예시 기준 0.50 이하' },
        { label: '사이클 시간', value: '4.82', unit: 's', note: '예시 범위 4.50~5.00' },
      ],
      lastInspection: { date: '2026.09.28', action: '유압 오일 보충', hiAfter: 0.25 },
    },
    {
      id: 'motor', number: 3, name: '모터 / 회전체', shortName: '회전체', hi: 0.23,
      summary: '전류·진동 정상 범위 · 정기 점검 유지',
      evidence: ['진동 RMS와 모터 전류가 예시 정상 범위입니다.', '예시 데이터에서 뚜렷한 상승 추이가 없습니다.'],
      sensors: ['전류', '진동'], anchor: { x: 38.2, y: 75.0 },
      metrics: [
        { label: '진동 RMS', value: '1.12', unit: 'mm/s', note: '예시 기준 2.00 이하' },
        { label: '모터 전류', value: '6.40', unit: 'A', note: '예시 범위 5.00~8.00' },
        { label: '첨도', value: '2.86', unit: '', note: '예시 기준 3.50 이하' },
      ],
      lastInspection: { date: '2026.09.21', action: '베어링 윤활', hiAfter: 0.18 },
    },
    {
      id: 'feed', number: 4, name: '이송 / 정렬부', shortName: '정렬부', hi: 0.32,
      summary: '위치 편차 정상 범위 · 정기 점검 유지',
      evidence: ['위치 편차가 예시 허용 범위 안에 있습니다.', '이송 사이클 패턴이 예시 기준과 유사합니다.'],
      sensors: ['위치', '변위', 'PLC'], anchor: { x: 69.8, y: 62.0 },
      metrics: [
        { label: '위치 편차', value: '0.18', unit: 'mm', note: '예시 기준 0.30 이하' },
        { label: '이송 시간', value: '1.24', unit: 's', note: '예시 범위 1.10~1.40' },
        { label: '패턴 차이', value: '0.08', unit: '', note: '가상 정규화 값' },
      ],
      lastInspection: { date: '2026.10.02', action: '이송 가이드 정렬', hiAfter: 0.22 },
    },
  ],
}
