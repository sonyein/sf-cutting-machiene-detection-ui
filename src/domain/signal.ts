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
  // Avoid excluding an exact boundary sample due to binary floating point (e.g. 35.2 * 200).
  const tolerance = 1e-9
  return readings.slice(Math.ceil(start * sampleRate - tolerance), Math.floor(cursor * sampleRate + tolerance) + 1)
}
// The initial viewport remains the chosen width; only the samples up to the cursor are replayed.
export function signalViewport(cursor: number, windowSeconds: number, duration: number) {
  const position = Math.min(duration, Math.max(0, cursor))
  return { start: Math.max(0, position - windowSeconds), end: Math.min(duration, Math.max(position, windowSeconds)) }
}
export function advancePlayback(mediaStart: number, wallStartMs: number, wallNowMs: number, speed: number, duration: number): number {
  return Math.min(duration, Math.max(0, mediaStart + Math.max(0, wallNowMs - wallStartMs) / 1000 * speed))
}
export function formatElapsed(seconds: number, precision: 0 | 1 = 0): string {
  const scale = 10 ** precision
  const ticks = precision ? Math.round(seconds * scale) : Math.floor(seconds)
  const minutes = Math.floor(ticks / (60 * scale))
  const remainder = (ticks % (60 * scale)) / scale
  return `${minutes.toString().padStart(2, '0')}:${remainder.toFixed(precision).padStart(precision ? 4 : 2, '0')}`
}
