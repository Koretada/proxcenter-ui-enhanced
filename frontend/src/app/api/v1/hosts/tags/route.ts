import { NextResponse } from "next/server"

import { getSessionPrisma } from "@/lib/tenant"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

/**
 * PATCH /api/v1/hosts/tags — update tags for a host by connectionId + node
 * Body: { connectionId, node, tags }
 */
export async function PATCH(req: Request) {
  try {
    const denied = await checkPermission(PERMISSIONS.ADMIN_SETTINGS)
    if (denied) return denied

    const prisma = await getSessionPrisma()
    const body = await req.json().catch(() => null)

    if (!body?.connectionId || !body?.node) {
      return NextResponse.json({ error: "Missing connectionId or node" }, { status: 400 })
    }

    const tags = body.tags ? String(body.tags) : null

    // Find or create the ManagedHost, then update tags
    let host = await prisma.managedHost.findUnique({
      where: { connectionId_node: { connectionId: body.connectionId, node: body.node } },
    })

    if (!host) {
      host = await prisma.managedHost.create({
        data: { connectionId: body.connectionId, node: body.node },
      })
    }

    // Update tags via raw SQL to avoid Prisma client cache issues
    await prisma.$executeRawUnsafe('UPDATE "ManagedHost" SET tags = ? WHERE id = ?', tags, host.id)

    return NextResponse.json({ data: { id: host.id, tags } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
