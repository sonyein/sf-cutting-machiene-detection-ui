import test from 'node:test'
import assert from 'node:assert/strict'
import { advancePlayback, extractSignalFeatures, signalWindow, formatElapsed } from '../src/domain/signal.ts'

test('RMS·평균·표준편차·첨도를 알려진 신호로 검증', () => {
  const features = extractSignalFeatures([1, -1, 1, -1].map((value, timestamp) => ({ timestamp, value })))!
  assert.equal(features.mean, 0); assert.equal(features.rms, 1); assert.equal(features.std, 1)
  assert.equal(features.kurtosis, 1); assert.equal(features.range, 2)
})
test('상수 신호와 부족한 표본이 NaN을 만들지 않음', () => {
  assert.equal(extractSignalFeatures([]), null)
  assert.equal(extractSignalFeatures([{ timestamp: 0, value: 2 }]), null)
  const features = extractSignalFeatures([0, 1, 2].map((timestamp) => ({ timestamp, value: 2 })))!
  assert.equal(features.std, 0); assert.equal(features.kurtosis, null); assert.equal(features.rms, 2)
})
test('재생 위치까지의 구간만 특징값과 그래프에 전달', () => {
  const signal = Array.from({ length: 11 }, (_, i) => ({ timestamp: i / 2, value: i }))
  assert.deepEqual(signalWindow(signal, 3, 1, 2).map((r) => r.timestamp), [2, 2.5, 3])
  assert.deepEqual(signalWindow(signal, 0, 30, 2).map((r) => r.timestamp), [0])
})
test('소수 재생 위치의 구간 양 끝 표본을 부동소수점 오차로 빠뜨리지 않음', () => {
  const signal = Array.from({ length: 10001 }, (_, index) => ({ timestamp: index / 200, value: index }))
  const readings = signalWindow(signal, 45.2, 10, 200)
  assert.equal(readings[0].timestamp, 35.2)
  assert.equal(readings.at(-1)!.timestamp, 45.2)
  assert.equal(readings.length, 2001)
})
test('재생 시간은 실제 경과 시간과 배속을 사용하고 종료 지점을 넘지 않음', () => {
  assert.equal(advancePlayback(12, 1000, 2500, 2, 120), 15)
  assert.equal(advancePlayback(119, 1000, 3000, 2, 120), 120)
  assert.equal(advancePlayback(0, 1000, 0, 1, 120), 0)
})
test('초 단위 및 0.1초 단위 시간 표시는 분 경계에서 일관됨', () => {
  assert.equal(formatElapsed(45.2), '00:45')
  assert.equal(formatElapsed(45.2, 1), '00:45.2')
  assert.equal(formatElapsed(59.98, 1), '01:00.0')
  assert.equal(formatElapsed(120, 1), '02:00.0')
})
