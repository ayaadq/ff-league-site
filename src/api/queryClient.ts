import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { del, get, set } from 'idb-keyval'
import { STALE_TIME } from './staleTime'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME.live,
      gcTime: STALE_TIME.immutable,
    },
  },
})

/** IndexedDB-backed persister — see SPEC.md §6.3. Completed weeks/seasons
 * are cached indefinitely here so repeat visits don't refetch them. */
export const queryPersister = createAsyncStoragePersister({
  key: 'trophy-room-query-cache',
  storage: {
    getItem: (key) => get(key),
    setItem: (key, value) => set(key, value),
    removeItem: (key) => del(key),
  },
})
