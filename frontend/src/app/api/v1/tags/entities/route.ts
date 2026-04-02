import { NextResponse } from "next/server"

import { getSessionPrisma } from "@/lib/tenant"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

/**
 * GET /api/v1/tags/entities — list all clusters and nodes that have tags
 * Uses raw SQL to avoid Prisma client cache issues with new columns
 */
export async function GET() {
  try {
    const denied = await checkPermission(PERMISSIONS.CONNECTION_VIEW)
    if (denied) return denied

    const prisma = await getSessionPrisma()

    const connections = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, name, tags FROM "Connection" WHERE tags IS NOT NULL AND tags != \'\''
    )

    const hosts = await prisma.$queryRawUnsafe<any[]>(
      'SELECT id, "connectionId", node, tags FROM "ManagedHost" WHERE tags IS NOT NULL AND tags != \'\''
    )

    const data = [
      ...connections.map(c => ({ entityType: 'cluster', id: c.id, name: c.name, tags: c.tags })),
      ...hosts.map(h => ({ entityType: 'node', id: h.id, connectionId: h.connectionId, node: h.node, tags: h.tags })),
    ]

    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
