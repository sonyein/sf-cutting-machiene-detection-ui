import { useCallback, useMemo, useSyncExternalStore } from 'react'

export const COMPACT_NAV_QUERY = '(max-width: 900px)'
export const COMPACT_OVERVIEW_QUERY = '(max-width: 760px)'
export const STACKED_HISTORY_QUERY = '(max-width: 1050px)'
export const MOBILE_TABLE_QUERY = '(max-width: 600px)'

export function useMediaQuery(query: string): boolean {
  const media = useMemo(() => typeof window.matchMedia === 'function' ? window.matchMedia(query) : null, [query])
  const subscribe = useCallback((notify: () => void) => {
    media?.addEventListener('change', notify)
    return () => media?.removeEventListener('change', notify)
  }, [media])
  const getSnapshot = useCallback(() => media?.matches ?? false, [media])
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
