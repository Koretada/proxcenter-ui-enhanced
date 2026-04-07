import useSWR from 'swr'
import { useSWRFetch } from './useSWRFetch'

export function useActiveAlerts(isEnterprise?: boolean) {
  return { data: [], error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSRecommendations(isEnterprise?: boolean, hasDRS?: boolean) {
  return { data: [], error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useVersionCheck(refreshInterval = 3600000) {
  return useSWRFetch('/api/v1/version/check', { refreshInterval })
}

export function useOrchestratorHealth(isEnterprise?: boolean) {
  return { data: { status: 'disabled' }, error: null, isLoading: false, mutate: () => Promise.resolve() }
}
