import type { InspectionRecord, PointId, InspectionOutcome } from '../domain/types'

const rows: [PointId, string, string, string, string, number, number | null, InspectionOutcome][] = [
  ['blade', '2026-10-07', '커팅날 마모와 진동 증가', '커팅날 교체', '교체 후 진동 감소. 예시 HI 0.21.', 0.76, 0.21, 'resolved'],
  ['feed', '2026-10-02', '이송 위치 편차 증가', '이송 가이드 정렬', '정렬 후 위치 편차가 예시 허용 범위 이내.', 0.55, 0.22, 'resolved'],
  ['hydraulic', '2026-09-28', '유압 압력 변동', '유압 오일 보충', '압력 변동 감소. 추후 누유 여부 재확인.', 0.52, 0.25, 'improved'],
  ['motor', '2026-09-21', '베어링 윤활 부족', '베어링 윤활', '진동 감소. 예시 HI 0.18.', 0.48, 0.18, 'resolved'],
  ['blade', '2026-09-14', '커팅날 마모와 날끝 손상', '커팅날 교체', '절삭 진동이 예시 정상 범위로 복귀.', 0.79, 0.24, 'resolved'],
  ['hydraulic', '2026-09-08', '유압 오일 누유', '유압 씰 교체', '누유 흔적이 더 이상 관찰되지 않음.', 0.68, 0.28, 'resolved'],
  ['feed', '2026-08-30', '이송 가이드 정렬 편차', '이송 가이드 정렬', '위치 편차 감소.', 0.51, 0.23, 'resolved'],
  ['blade', '2026-08-22', '커팅날 진동 증가', '체결 상태 확인 및 재조정', '진동 일부 감소. 다음 점검에서 마모 확인.', 0.62, 0.44, 'monitoring'],
  ['motor', '2026-08-12', '베어링 마모', '베어링 교체', '교체 후 전류와 진동이 예시 정상 범위.', 0.72, 0.20, 'resolved'],
  ['hydraulic', '2026-07-05', '유압 압력 저하', '유압 필터 교체', '압력 회복. 변동 폭 감소.', 0.65, 0.31, 'improved'],
  ['feed', '2026-06-18', '이송 위치 편차', '위치 센서 점검 및 보정', '보정 후 예시 기준 범위에 진입.', 0.58, 0.26, 'resolved'],
  ['blade', '2026-03-10', '커팅날 마모', '커팅날 교체', '교체 후 절삭면과 진동 개선.', 0.71, 0.22, 'resolved'],
]
export const mockInspections: InspectionRecord[] = rows.map(([pointId, inspectedOn, cause, action, result, hiBefore, hiAfter, outcome], index) => ({
  id: `example-${index + 1}`, pointId, inspectedOn, cause, action, result, hiBefore, hiAfter, outcome,
  notes: '시연용으로 작성한 예시 점검 기록입니다.', createdAt: `${inspectedOn}T08:00:00+09:00`, source: 'mock',
}))
