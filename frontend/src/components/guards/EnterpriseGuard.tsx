'use client'

import { ReactNode } from 'react'

interface EnterpriseGuardProps {
  children: ReactNode
  requiredFeature: string
  featureName?: string
}

/**
 * EnterpriseGuard - Community Edition
 * This component now renders children directly as enterprise guards are removed.
 */
export default function EnterpriseGuard({
  children,
}: EnterpriseGuardProps) {
  return <>{children}</>
}
