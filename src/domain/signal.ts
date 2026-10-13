import type { Reading } from './types.ts'

export function extractSignalFeatures(readings: readonly Reading[]) {
  if (readings.length < 2) return null
  const values = readings.map((reading) => reading.value)
  const count = values.length
  let sum = 0, squares = 0, min = Infinity, max = -Infinity
  for (const value of values) { sum += value; squares += value * value; min = Math.min(min, value); max = Math.max(max, value) }
  const mean = sum / count
  let varianceSum = 0, fourthSum = 0, risingEdges = 0
  for (let i = 0; i < count; i++) {
    const diff = values[i] - mean
    varianceSum += diff ** 2; fourthSum += diff ** 4
    if (i > 0 && values[i - 1] < 0.5 && values[i] >= 0.5) risingEdges++
  }
  const variance = varianceSum / count
  return { mean, rms: Math.sqrt(squares / count), std: Math.sqrt(variance), min, max, peak: Math.max(Math.abs(min), Math.abs(max)), range: max - min, kurtosis: variance > 1e-12 ? fourthSum / count / variance ** 2 : null, duty: mean * 100, risingEdges }
}
export function signalWindow(readings: readonly Reading[], cursor: number, windowSeconds: number, sampleRate: number): Reading[] {
  const start = Math.max(0, cursor - windowSeconds)
  return readings.slice(Math.ceil(start * sampleRate), Math.floor(cursor * sampleRate) + 1)
}
export function advancePlayback(mediaStart: number, wallStartMs: number, wallNowMs: number, speed: number, duration: number): number {
  return Math.min(duration, Math.max(0, mediaStart + Math.max(0, wallNowMs - wallStartMs) / 1000 * speed))
}
export function formatElapsed(seconds: number): string {
  const whole = Math.floor(seconds)
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`
}
