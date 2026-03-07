import { NextResponse } from "next/server"

import { prisma } from "@/lib/db/prisma"
import { decryptSecret } from "@/lib/crypto/secret"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

type EsxiVm = {
  vmid: string
  name: string
  status: string  // 'running' | 'stopped' | 'suspended'
  cpu?: number
  memory_size_MiB?: number
  power_state?: string
  guest_OS?: string
}

async function esxiFetch(baseUrl: string, path: string, sessionId: string, insecureTLS: boolean): Promise<any> {
  const opts: any = {
    headers: {
      'vmware-api-session-id': sessionId,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(30000),
  }
  if (insecureTLS) {
    opts.dispatcher = new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } })
  }
  const res = await fetch(`${baseUrl}${path}`, opts)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`ESXi API error ${res.status}: ${text}`)
  }
  return res.json()
}

async function getEsxiSession(baseUrl: string, username: string, password: string, insecureTLS: boolean): Promise<string> {
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64')
  const fetchOpts: any = {
    method: 'POST',
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
  }
  if (insecureTLS) {
    fetchOpts.dispatcher = new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } })
  }

  // Try vSphere 7.0+ first
  const res = await fetch(`${baseUrl}/api/session`, fetchOpts).catch(() => null)
  if (res?.ok) {
    const text = await res.text()
    return text.replace(/"/g, '')
  }

  // Try vSphere 6.x
  const res2 = await fetch(`${baseUrl}/rest/com/vmware/cis/session`, fetchOpts).catch(() => null)
  if (res2?.ok) {
    const json = await res2.json()
    return json?.value || ''
  }

  throw new Error('Failed to authenticate with ESXi host')
}

/**
 * GET /api/v1/vmware/[id]/vms
 * List VMs on a VMware ESXi host via REST API
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const denied = await checkPermission(PERMISSIONS.CONNECTION_VIEW)
    if (denied) return denied

    const { id } = await params
    const conn = await prisma.connection.findUnique({
      where: { id },
      select: { id: true, name: true, baseUrl: true, apiTokenEnc: true, insecureTLS: true, type: true },
    })

    if (!conn || conn.type !== 'vmware') {
      return NextResponse.json({ error: "VMware connection not found" }, { status: 404 })
    }

    const creds = decryptSecret(conn.apiTokenEnc)
    const colonIdx = creds.indexOf(':')
    const username = colonIdx > 0 ? creds.substring(0, colonIdx) : 'root'
    const password = colonIdx > 0 ? creds.substring(colonIdx + 1) : creds
    const esxiUrl = conn.baseUrl.replace(/\/$/, '')

    // Get session
    const sessionId = await getEsxiSession(esxiUrl, username, password, conn.insecureTLS)

    try {
      // List VMs via REST API
      let vms: EsxiVm[] = []

      try {
        // vSphere 7.0+ API
        const data = await esxiFetch(esxiUrl, '/api/vcenter/vm', sessionId, conn.insecureTLS)
        vms = (Array.isArray(data) ? data : []).map((vm: any) => ({
          vmid: vm.vm || vm.id || '',
          name: vm.name || '',
          status: vm.power_state === 'POWERED_ON' ? 'running' : vm.power_state === 'SUSPENDED' ? 'suspended' : 'stopped',
          cpu: vm.cpu_count,
          memory_size_MiB: vm.memory_size_MiB,
          power_state: vm.power_state,
          guest_OS: vm.guest_OS,
        }))
      } catch {
        // Try vSphere 6.x API
        try {
          const data = await esxiFetch(esxiUrl, '/rest/vcenter/vm', sessionId, conn.insecureTLS)
          const items = data?.value || []
          vms = items.map((vm: any) => ({
            vmid: vm.vm || vm.id || '',
            name: vm.name || '',
            status: vm.power_state === 'POWERED_ON' ? 'running' : vm.power_state === 'SUSPENDED' ? 'suspended' : 'stopped',
            cpu: vm.cpu_count,
            memory_size_MiB: vm.memory_size_MiB,
            power_state: vm.power_state,
            guest_OS: vm.guest_OS,
          }))
        } catch (e2: any) {
          throw new Error(`Cannot list VMs: ${e2?.message || 'API not available'}. Standalone ESXi may not support the REST VM listing API.`)
        }
      }

      return NextResponse.json({ data: { vms, connectionName: conn.name } })
    } finally {
      // Clean up session
      const cleanupOpts: any = {
        method: 'DELETE',
        headers: { 'vmware-api-session-id': sessionId },
      }
      if (conn.insecureTLS) {
        cleanupOpts.dispatcher = new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } })
      }
      fetch(`${esxiUrl}/api/session`, cleanupOpts).catch(() => {})
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
