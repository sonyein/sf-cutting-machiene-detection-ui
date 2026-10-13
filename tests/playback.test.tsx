// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { usePlayback } from '../src/hooks/usePlayback'

it('재생·배속 변경·일시정지·탐색·끝 위치·언마운트의 시간 흐름', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
  let now = 0, id = 0
  const frames = new Map<number, FrameRequestCallback>()
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++id, cb); return id })
  vi.stubGlobal('cancelAnimationFrame', (key: number) => { frames.delete(key) })
  function Harness() {
    const p = usePlayback(120)
    return <><output>{p.position.toFixed(1)}:{String(p.playing)}</output><button onClick={p.play}>play</button><button onClick={p.pause}>pause</button><button onClick={() => p.setSpeed(2)}>speed</button><button onClick={() => p.seek(45)}>seek</button></>
  }
  const node = document.createElement('div'); document.body.append(node); const root = createRoot(node)
  const click = (text: string) => [...node.querySelectorAll('button')].find((b) => b.textContent === text)!.click()
  const frame = (time: number) => { now = time; const pending = [...frames]; frames.clear(); pending.forEach(([, cb]) => cb(time)) }
  try {
    await act(async () => { root.render(<Harness />) }); expect(node.querySelector('output')?.textContent).toBe('120.0:false')
    await act(async () => { click('play') }); await act(async () => { frame(1000) }); expect(node.querySelector('output')?.textContent).toBe('1.0:true')
    await act(async () => { click('speed') }); await act(async () => { frame(2000) }); expect(node.querySelector('output')?.textContent).toBe('3.0:true')
    await act(async () => { click('pause') }); await act(async () => { frame(3000) }); expect(node.querySelector('output')?.textContent).toBe('3.0:false')
    await act(async () => { click('seek') }); expect(node.querySelector('output')?.textContent).toBe('45.0:false')
    await act(async () => { click('play') }); await act(async () => { frame(200000) }); expect(node.querySelector('output')?.textContent).toBe('120.0:false')
    await act(async () => { click('play') }); expect(frames.size).toBe(1)
  } finally { await act(async () => { root.unmount() }); node.remove(); expect(frames.size).toBe(0); vi.unstubAllGlobals(); vi.restoreAllMocks() }
})
