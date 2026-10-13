import test from 'node:test'
import assert from 'node:assert/strict'
import { classifyHealth, countHealthStates, overallHealth } from '../src/domain/health.ts'

test('HI 0/1 방향과 0.4/0.6/0.8 경계값', () => {
  for (const [hi, expected] of [[0, 'normal'], [0.39999, 'normal'], [0.4, 'watch'], [0.59999, 'watch'], [0.6, 'warning'], [0.79999, 'warning'], [0.8, 'danger'], [1, 'danger']] as const) assert.equal(classifyHealth(hi), expected)
})
test('측정 불가/범위 밖 HI는 정상으로 처리하지 않음', () => {
  for (const hi of [NaN, Infinity, -0.01, 1.01]) assert.throws(() => classifyHealth(hi), RangeError)
})
test('전체 상태는 최댓값이고 지점 수의 합은 전체 지점 수', () => {
  assert.equal(overallHealth([0.78, 0.46, 0.23, 0.32]), 0.78)
  assert.deepEqual(countHealthStates([0.78, 0.46, 0.23, 0.32]), { normal: 2, watch: 1, warning: 1, danger: 0 })
  assert.equal(overallHealth([0.1, 0.9]), 0.9)
  assert.throws(() => overallHealth([]), RangeError)
})
