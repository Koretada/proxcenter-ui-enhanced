import useSWR from 'swr'

export function useDRSStatus(isEnterprise?: boolean) {
  return { data: null, error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSRecommendations(isEnterprise?: boolean) {
  return { data: [], error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSMigrations(isEnterprise?: boolean) {
  return { data: [], error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSAllMigrations(isEnterprise?: boolean) {
  return { data: [], error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSMetrics(isEnterprise?: boolean) {
  return { data: null, error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSSettings(isEnterprise?: boolean) {
    return { data: null, error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useDRSRules(isEnterprise?: boolean) {
    return { data: [], error: null, isLoading: false, mutate: () => Promise.resolve() }
}

export function useMigrationProgress(migrationId: string | null, isActive: boolean) {
    return { data: null, error: null, isLoading: false, mutate: () => Promise.resolve() }
}
