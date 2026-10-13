import { useCallback, useEffect, useRef, useState } from 'react'
import { advancePlayback } from '../domain/signal'

export function usePlayback(duration: number) {
  const [state, setState] = useState({ position: duration, playing: false, speed: 1 })
  const position = useRef(duration)
  const clock = useRef({ media: duration, wall: 0 })
  useEffect(() => {
    if (!state.playing) return
    clock.current = { media: position.current, wall: performance.now() }
    let raf = 0, lastEmit = 0
    const tick = (now: number) => {
      const next = advancePlayback(clock.current.media, clock.current.wall, now, state.speed, duration)
      if (now - lastEmit >= 100 || next >= duration) {
        position.current = next; lastEmit = now
        setState((prev) => ({ ...prev, position: next, playing: next < duration }))
      }
      if (next < duration) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [state.playing, state.speed, duration])
  const precisePosition = useCallback(() => state.playing ? advancePlayback(clock.current.media, clock.current.wall, performance.now(), state.speed, duration) : position.current, [state.playing, state.speed, duration])
  const pause = useCallback(() => { const next = precisePosition(); position.current = next; setState((prev) => ({ ...prev, position: next, playing: false })) }, [precisePosition])
  const play = useCallback(() => { if (position.current >= duration) position.current = 0; setState((prev) => ({ ...prev, position: position.current, playing: true })) }, [duration])
  const seek = useCallback((seconds: number) => { position.current = Math.min(duration, Math.max(0, seconds)); setState((prev) => ({ ...prev, position: position.current, playing: false })) }, [duration])
  const setSpeed = useCallback((speed: number) => { const next = precisePosition(); position.current = next; setState((prev) => ({ ...prev, speed, position: next })) }, [precisePosition])
  useEffect(() => { const onHidden = () => { if (document.hidden) pause() }; document.addEventListener('visibilitychange', onHidden); return () => document.removeEventListener('visibilitychange', onHidden) }, [pause])
  return { ...state, play, pause, seek, setSpeed }
}
