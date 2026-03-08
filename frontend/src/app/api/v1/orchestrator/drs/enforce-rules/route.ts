import { NextResponse } from "next/server"

import { getOrchestratorClient } from "@/lib/orchestrator/client"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

// POST /api/v1/orchestrator/drs/enforce-rules
export async function POST() {
  try {
    const denied = await checkPermission(PERMISSIONS.AUTOMATION_EXECUTE, "global", "*")

    if (denied) return denied

    const client = getOrchestratorClient()
    const response = await client.enforceRules()

    return NextResponse.json(response.data)
  } catch (e: any) {
    if ((e as any)?.code !== 'ORCHESTRATOR_UNAVAILABLE') {
      console.error("Error enforcing DRS rules:", e)
    }

    return NextResponse.json(
      { error: e?.message || "Failed to enforce DRS rules" },
      { status: 500 }
    )
  }
}
