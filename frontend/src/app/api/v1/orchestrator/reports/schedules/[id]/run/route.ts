// src/app/api/v1/orchestrator/reports/schedules/[id]/run/route.ts
import { NextRequest, NextResponse } from 'next/server'

import { orchestratorFetch } from '@/lib/orchestrator'
import { getTenantConnectionIds } from '@/lib/tenant'
import { checkPermission, PERMISSIONS } from '@/lib/rbac'

export const runtime = 'nodejs'

// POST /api/v1/orchestrator/reports/schedules/[id]/run - Run schedule now (tenant-scoped)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await checkPermission(PERMISSIONS.REPORTS_VIEW)
    if (denied) return denied

    const { id } = await params

    // Verify schedule belongs to tenant
    const schedule = await orchestratorFetch(`/reports/schedules/${id}`) as any
    if (schedule?.connection_id) {
      const tenantConnectionIds = await getTenantConnectionIds()
      if (!tenantConnectionIds.has(schedule.connection_id)) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      }
    }

    const data = await orchestratorFetch(`/reports/schedules/${id}/run`, {
      method: 'POST'
    })

    return NextResponse.json(data, { status: 202 })
  } catch (error: any) {
    if ((error as any)?.code !== 'ORCHESTRATOR_UNAVAILABLE') {
      console.error('Failed to run schedule:', error)
    }
    return NextResponse.json(
      { error: error.message || 'Failed to run schedule' },
      { status: 500 }
    )
  }
}
