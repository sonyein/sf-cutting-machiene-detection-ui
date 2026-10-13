import type { PointId } from '../domain/types'

// Mock inspection suggestions for the overview; these do not control the equipment.
export const overviewGuidance: Record<PointId, { evidence: [string, string]; action: string }> = {
  blade: {
    evidence: ['진동 RMS·첨도가 예시 기준보다 높음', '전류는 예시 정상 범위'],
    action: '커팅날의 마모와 날끝 손상을 확인하세요.',
  },
  hydraulic: {
    evidence: ['압력 변동 폭이 예시 기준보다 높음', '사이클 시간은 예시 정상 범위'],
    action: '압력 변동 추이를 확인하고 유압 계통을 점검하세요.',
  },
  motor: {
    evidence: ['진동 RMS·모터 전류는 예시 정상 범위', '예시 데이터에서 상승 추이 없음'],
    action: '정기 점검 시 베어링 윤활 상태를 확인하세요.',
  },
  feed: {
    evidence: ['위치 편차가 예시 허용 범위 이내', '이송 사이클이 예시 기준과 유사'],
    action: '정기 점검 시 이송 가이드의 정렬 상태를 확인하세요.',
  },
}
