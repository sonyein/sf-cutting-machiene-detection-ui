import test from 'node:test'
import assert from 'node:assert/strict'
import { downsample } from '../src/domain/downsample.ts'

test('다운샘플링은 양 끝, 급격한 이상값, 시간 순서와 표시 예산을 유지함', () => {
  const readings = Array.from({ length: 10000 }, (_, i) => ({ timestamp: i, value: i === 4321 ? 1 : i === 6789 ? -1 : Math.sin(i * 0.01) * 0.1 }))
  const sampled = downsample(readings, 160)
  assert.ok(sampled.length <= 160)
  assert.deepEqual(sampled[0], readings[0])
  assert.deepEqual(sampled.at(-1), readings.at(-1))
  assert.ok(sampled.some((reading) => reading.timestamp === 4321))
  assert.ok(sampled.some((reading) => reading.timestamp === 6789))
  assert.ok(sampled.every((reading, i) => i === 0 || reading.timestamp > sampled[i - 1].timestamp))
  assert.equal(readings.length, 10000)
})
test('짧거나 비어 있는 시계열 처리와 잘못된 예산 검증', () => {
  assert.deepEqual(downsample([]), [])
  const readings = [{ timestamp: 1, value: 0.2 }]
  assert.deepEqual(downsample(readings), readings)
  assert.notEqual(downsample(readings), readings)
  assert.throws(() => downsample(readings, 3), RangeError)
})
