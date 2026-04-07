'use client'

import { createContext, useContext, useMemo, ReactNode } from 'react'

// Features list (kept for type compatibility)
export const Features = {
  DRS: 'drs',
  FIREWALL: 'firewall',
  MICROSEGMENTATION: 'microsegmentation',
  ROLLING_UPDATES: 'rolling_updates',
  AI_INSIGHTS: 'ai_insights',
  PREDICTIVE_ALERTS: 'predictive_alerts',
  ALERTS: 'alerts',
  GREEN_METRICS: 'green_metrics',
  CROSS_CLUSTER_MIGRATION: 'cross_cluster_migration',
  VMWARE_MIGRATION: 'vmware_migration',
  CEPH_REPLICATION: 'ceph_replication',
  LDAP: 'ldap',
  REPORTS: 'reports',
  RBAC: 'rbac',
  TASK_CENTER: 'task_center',
  NOTIFICATIONS: 'notifications',
  CVE_SCANNER: 'cve_scanner',
  COMPLIANCE: 'compliance',
  OIDC: 'oidc',
  CHANGE_TRACKING: 'change_tracking',
  WHITE_LABEL: 'white_label',
  MULTI_TENANCY: 'multi_tenancy',
  SFLOW_MONITORING: 'sflow_monitoring',
} as const

type FeatureId = typeof Features[keyof typeof Features]

interface LicenseStatus {
  licensed: boolean
  expired: boolean
  edition: string
  features: string[]
  [key: string]: any
}

interface Feature {
  id: string
  enabled: boolean
  [key: string]: any
}

interface LicenseContextValue {
  status: LicenseStatus | null
  loading: boolean
  error: string | null
  isLicensed: boolean
  isEnterprise: boolean
  features: Feature[]
  hasFeature: (featureId: FeatureId | string) => boolean
  refresh: () => Promise<void>
}

const COMMUNITY_STATUS: LicenseStatus = {
  licensed: true,
  expired: false,
  edition: 'community',
  features: [],
}

const LicenseContext = createContext<LicenseContextValue>({
  status: COMMUNITY_STATUS,
  loading: false,
  error: null,
  isLicensed: true,
  isEnterprise: false,
  features: [],
  hasFeature: () => true,
  refresh: async () => {},
})

export function LicenseProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => ({
    status: COMMUNITY_STATUS,
    loading: false,
    error: null,
    isLicensed: true,
    isEnterprise: false,
    features: [],
    hasFeature: () => true,
    refresh: async () => {},
  }), [])

  return (
    <LicenseContext.Provider value={value}>
      {children}
    </LicenseContext.Provider>
  )
}

export function useLicense() {
  const context = useContext(LicenseContext)
  if (!context) {
    throw new Error('useLicense must be used within a LicenseProvider')
  }
  return context
}

export default LicenseContext
