import type { PointId } from '../domain/types'
export const checkItems: Record<PointId, string[]> = {
  blade: ['커팅날 마모·날끝 손상', '절삭부 체결·유격', '절삭 조건과 부하 변화'],
  hydraulic: ['압력 변동과 누유 흔적', '유압 오일·필터 상태', '프레스 변위와 사이클 시간'],
  motor: ['베어링 윤활·마모', '회전체 체결과 정렬', '모터 전류·진동 추이'],
  feed: ['이송 가이드 정렬', '위치 센서 상태·보정', '이송 기구의 간섭·유격'],
}
