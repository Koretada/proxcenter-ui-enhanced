import { NextResponse } from "next/server"

import { pveFetch } from "@/lib/proxmox/client"
import { getConnectionById } from "@/lib/connections/getConnection"
import { checkPermission, buildNodeResourceId, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

type Ctx = { params: Promise<{ id: string; node: string; iface: string }> }

// GET /api/v1/connections/{id}/nodes/{node}/network/{iface}
export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id, node, iface } = await ctx.params
    const resourceId = buildNodeResourceId(id, node)
    const denied = await checkPermission(PERMISSIONS.NODE_NETWORK, "node", resourceId)
    if (denied) return denied

    const conn = await getConnectionById(id)
    const data = await pveFetch<any>(conn, `/nodes/${encodeURIComponent(node)}/network/${encodeURIComponent(iface)}`)

    return NextResponse.json({ data })
  } catch (e: any) {
    console.error('Error fetching network interface:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// PUT /api/v1/connections/{id}/nodes/{node}/network/{iface}
export async function PUT(req: Request, ctx: Ctx) {
  try {
    const { id, node, iface } = await ctx.params
    const resourceId = buildNodeResourceId(id, node)
    const denied = await checkPermission(PERMISSIONS.NODE_NETWORK, "node", resourceId)
    if (denied) return denied

    const conn = await getConnectionById(id)
    const body = await req.json()

    const params = new URLSearchParams()
    // Required field
    params.append('type', body.type)

    // Optional fields
    const fields = [
      'address', 'netmask', 'gateway', 'address6', 'netmask6', 'gateway6',
      'cidr', 'cidr6', 'autostart', 'mtu', 'comments',
      'bridge_ports', 'bridge_stp', 'bridge_fd', 'bridge_vlan_aware',
      'bond_mode', 'bond_primary', 'bond-xmit-hash-policy', 'slaves',
      'vlan-id', 'vlan-raw-device',
      'ovs_bridge', 'ovs_options', 'ovs_tag', 'ovs_bonds', 'ovs_ports',
    ]
    for (const f of fields) {
      if (body[f] !== undefined && body[f] !== '') {
        params.append(f, String(body[f]))
      }
    }

    await pveFetch(conn, `/nodes/${encodeURIComponent(node)}/network/${encodeURIComponent(iface)}`, {
      method: 'PUT',
      body: params,
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error updating network interface:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}

// DELETE /api/v1/connections/{id}/nodes/{node}/network/{iface}
export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { id, node, iface } = await ctx.params
    const resourceId = buildNodeResourceId(id, node)
    const denied = await checkPermission(PERMISSIONS.NODE_NETWORK, "node", resourceId)
    if (denied) return denied

    const conn = await getConnectionById(id)

    await pveFetch(conn, `/nodes/${encodeURIComponent(node)}/network/${encodeURIComponent(iface)}`, {
      method: 'DELETE',
    })

    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('Error deleting network interface:', e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
