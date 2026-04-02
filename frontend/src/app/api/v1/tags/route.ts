import { NextResponse } from "next/server"

import { getSessionPrisma } from "@/lib/tenant"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

/**
 * GET /api/v1/tags — list all distinct ProxCenter tags from connections and hosts
 */
export async function GET() {
  try {
    const denied = await checkPermission(PERMISSIONS.CONNECTION_VIEW)
    if (denied) return denied

    const prisma = await getSessionPrisma()

    // Use raw SQL to avoid Prisma client cache issues with new columns
    const connRows = await prisma.$queryRawUnsafe<any[]>('SELECT tags FROM "Connection" WHERE tags IS NOT NULL')
    const hostRows = await prisma.$queryRawUnsafe<any[]>('SELECT tags FROM "ManagedHost" WHERE tags IS NOT NULL')

    const tagSet = new Set<string>()

    for (const row of [...connRows, ...hostRows]) {
      if (row.tags) {
        for (const t of String(row.tags).split(';')) {
          const trimmed = t.trim()
          if (trimmed) tagSet.add(trimmed)
        }
      }
    }

    return NextResponse.json({ data: Array.from(tagSet).sort((a, b) => a.localeCompare(b)) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
