import { NextResponse } from "next/server"

import { pveFetch } from "@/lib/proxmox/client"
import { getConnectionById } from "@/lib/connections/getConnection"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"
import { getSessionPrisma } from "@/lib/tenant"

export const runtime = "nodejs"

/**
 * IPAM Data structures
 */
type IPInfo = {
  ip: string
  cidr: number
  proto: "ipv4" | "ipv6"
  vmId: string | number
  vmName: string
  vmType: "qemu" | "lxc"
  node: string
  connectionId: string
  connectionName: string
  interface: string
  isDhcp: boolean
}

type SubnetGroup = {
  network: string
  ips: IPInfo[]
}

/**
 * Utility to calculate network address for grouping
 */
function getNetworkAddress(ip: string, cidr: number, proto: "ipv4" | "ipv6"): string {
  if (proto === "ipv6") {
    // Basic IPv6 prefix grouping (first 4 segments for /64 often)
    // For simplicity, we just use the first 'cidr' bits.
    // In many enterprise setups /64 is the standard.
    const parts = ip.split(":")
    if (cidr <= 64) {
      return parts.slice(0, 4).join(":") + "::/" + cidr
    }
    return ip + "/" + cidr // Fallback
  }

  try {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4) return ip + "/" + cidr

    // Use unsigned right shift for correct 32-bit handling
    const ipInt = ((parts[0] << 24) >>> 0) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
    const mask = cidr === 0 ? 0 : (~( (1 << (32 - cidr)) - 1 )) >>> 0
    const netInt = (ipInt & mask) >>> 0

    return [
      (netInt >>> 24) & 0xff,
      (netInt >>> 16) & 0xff,
      (netInt >>> 8) & 0xff,
      netInt & 0xff
    ].join('.') + '/' + cidr
  } catch {
    return ip + "/" + cidr
  }
}

/**
 * Parse IP strings from PVE config
 * qemu: ip=10.0.0.1/24,gw=10.0.0.254
 * lxc:  ip=10.0.0.1/24,bridge=vmbr0
 */
function parseIpValue(val: string): { ip: string, cidr: number, proto: "ipv4" | "ipv6", isDhcp: boolean } | null {
  if (!val) return null

  const match = val.match(/ip=([^,]+)/)
  if (!match) return null

  const rawIp = match[1]
  if (rawIp === "dhcp") {
    return { ip: "DHCP", cidr: 0, proto: "ipv4", isDhcp: true }
  }

  const [ip, cidrStr] = rawIp.split("/")
  const cidr = parseInt(cidrStr || "32", 10)
  const proto = ip.includes(":") ? "ipv6" : "ipv4"

  return { ip, cidr, proto, isDhcp: false }
}

export async function GET() {
  try {
    const denied = await checkPermission(PERMISSIONS.VM_VIEW)
    if (denied) return denied

    // 1. Fetch all PVE connections
    const prisma = await getSessionPrisma()
    const connections = await prisma.connection.findMany({
      where: { type: "pve" }
    })

    const allIps: IPInfo[] = []

    // 2. Process each connection
    await Promise.all(connections.map(async (conn) => {
      try {
        const connData = await getConnectionById(conn.id)

        // Fetch all VMs in this cluster
        const resources = await pveFetch<any[]>(connData, "/cluster/resources?type=vm")
        if (!Array.isArray(resources)) return

        // Fetch configs in parallel (with some batching if needed, but let's try direct first)
        // We use Promise.allSettled to not fail the whole request if one VM config is missing
        await Promise.allSettled(resources.map(async (res) => {
          try {
            const { vmid, node, type, name } = res
            const config = await pveFetch<any>(connData, `/nodes/${node}/${type}/${vmid}/config`)

            // Extract IP configs
            // QEMU: ipconfig0, ipconfig1, ...
            // LXC: net0, net1, ...
            const keys = Object.keys(config)
            for (const key of keys) {
              if (key.startsWith("ipconfig") || (type === "lxc" && key.startsWith("net"))) {
                const parsed = parseIpValue(config[key])
                if (parsed) {
                  allIps.push({
                    ip: parsed.ip,
                    cidr: parsed.cidr,
                    proto: parsed.proto,
                    isDhcp: parsed.isDhcp,
                    vmId: vmid,
                    vmName: name || `VM ${vmid}`,
                    vmType: type as "qemu" | "lxc",
                    node,
                    connectionId: conn.id,
                    connectionName: conn.name,
                    interface: key,
                  })
                }
              }
            }
          } catch (e) {
            // Log individual VM fetch failure but continue
            console.error(`[IPAM] Failed to fetch config for VM ${res.vmid} on ${conn.name}:`, e)
          }
        }))
      } catch (e) {
        console.error(`[IPAM] Connection error for ${conn.name}:`, e)
      }
    }))

    // 3. Group by Subnet and Detect Duplicates
    const subnetMap = new Map<string, IPInfo[]>()
    const ipCounts = new Map<string, number>()

    allIps.forEach(info => {
      // Duplicates tracking (skip DHCP labels)
      if (!info.isDhcp) {
        const fullKey = `${info.ip}/${info.cidr}`
        ipCounts.set(fullKey, (ipCounts.get(fullKey) || 0) + 1)
      }

      // Grouping
      const network = info.isDhcp ? "DHCP / Dynamic" : getNetworkAddress(info.ip, info.cidr, info.proto)
      if (!subnetMap.has(network)) {
        subnetMap.set(network, [])
      }
      subnetMap.get(network)!.push(info)
    })

    // 4. Format response
    const subnets: SubnetGroup[] = Array.from(subnetMap.entries()).map(([network, ips]) => ({
      network,
      ips: ips.sort((a, b) => {
        // Sort by IP numerically/alphabetically (simple version)
        if (a.isDhcp) return 1
        if (b.isDhcp) return -1
        return a.ip.localeCompare(b.ip, undefined, { numeric: true })
      })
    })).sort((a, b) => a.network.localeCompare(b.network, undefined, { numeric: true }))

    const duplicates = allIps.filter(info => !info.isDhcp && (ipCounts.get(`${info.ip}/${info.cidr}`) || 0) > 1)

    return NextResponse.json({
      data: {
        subnets,
        duplicates,
        stats: {
          totalIps: allIps.length,
          totalSubnets: subnets.length,
          totalDuplicates: new Set(duplicates.map(d => `${d.ip}/${d.cidr}`)).size
        }
      }
    })

  } catch (e: any) {
    console.error("[IPAM] Global Error:", e)
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
