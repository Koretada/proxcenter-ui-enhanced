import { NextResponse } from "next/server"

import { pveFetch } from "@/lib/proxmox/client"
import { getConnectionById } from "@/lib/connections/getConnection"
import { checkPermission, buildNodeResourceId, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

// POST /api/v1/connections/{id}/nodes/{node}/restore
// Restore a VM or CT from a backup (vzdump/PBS)
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; node: string }> }
) {
  try {
    const { id, node } = await ctx.params

    const resourceId = buildNodeResourceId(id, node)
    const denied = await checkPermission(PERMISSIONS.VM_BACKUP, "node", resourceId)
    if (denied) return denied

    const body = await req.json()
    const {
      vmid,
      archive,
      storage,
      type = 'qemu',
      bwlimit,
      unique,
      start,
      live,
      name,
      memory,
      cores,
      sockets,
    } = body

    if (!vmid) {
      return NextResponse.json({ error: "VMID is required" }, { status: 400 })
    }
    if (!archive) {
      return NextResponse.json({ error: "Archive volume ID is required" }, { status: 400 })
    }

    const conn = await getConnectionById(id)

    const isLxc = type === 'lxc'
    const endpoint = isLxc ? 'vzrestore' : 'qmrestore'

    const params: Record<string, string> = {
      vmid: String(vmid),
      archive: archive,
    }

    if (storage) params.storage = storage
    if (bwlimit) params.bwlimit = String(bwlimit)
    if (unique) params.unique = '1'
    if (start) params.start = '1'
    if (live && !isLxc) params['live-restore'] = '1'

    // Override settings
    if (name) params.name = name
    if (memory) params.memory = String(memory)
    if (cores) params.cores = String(cores)
    if (sockets) params.sockets = String(sockets)

    const result = await pveFetch<string>(
      conn,
      `/nodes/${encodeURIComponent(node)}/${endpoint}`,
      {
        method: 'POST',
        body: new URLSearchParams(params).toString(),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    const { audit } = await import("@/lib/audit")
    await audit({
      action: "restore",
      category: "backups",
      resourceType: "vm",
      resourceId: String(vmid),
      details: { node, connectionId: id, archive, storage, type },
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Restore of ${isLxc ? 'CT' : 'VM'} ${vmid} started`,
    })
  } catch (e: any) {
    console.error('Error restoring backup:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
