import { NextResponse } from "next/server"

import { prisma } from "@/lib/db/prisma"
import { decryptSecret } from "@/lib/crypto/secret"
import { checkPermission, PERMISSIONS } from "@/lib/rbac"

export const runtime = "nodejs"

/**
 * GET /api/v1/vmware/[id]/status
 * Test connectivity to a VMware ESXi host
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
      select: { id: true, baseUrl: true, apiTokenEnc: true, insecureTLS: true, type: true },
    })

    if (!conn || conn.type !== 'vmware') {
      return NextResponse.json({ error: "VMware connection not found" }, { status: 404 })
    }

    // Decrypt credentials (stored as "user:password")
    const creds = decryptSecret(conn.apiTokenEnc)
    const colonIdx = creds.indexOf(':')
    const username = colonIdx > 0 ? creds.substring(0, colonIdx) : 'root'
    const password = colonIdx > 0 ? creds.substring(colonIdx + 1) : creds

    const esxiUrl = conn.baseUrl.replace(/\/$/, '')

    // Try to get a session ticket from ESXi REST API
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      // Try vSphere 7.0+ REST API first
      const res = await fetch(`${esxiUrl}/api/session`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        // @ts-ignore — Node 18+ fetch TLS option
        ...(conn.insecureTLS ? { dispatcher: new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } }) } : {}),
      })

      clearTimeout(timeout)

      if (res.ok) {
        // Clean up session
        const sessionId = await res.text().catch(() => '')
        if (sessionId) {
          fetch(`${esxiUrl}/api/session`, {
            method: 'DELETE',
            headers: { 'vmware-api-session-id': sessionId.replace(/"/g, '') },
            // @ts-ignore
            ...(conn.insecureTLS ? { dispatcher: new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } }) } : {}),
          }).catch(() => {})
        }
        return NextResponse.json({ data: { status: 'online', host: esxiUrl } })
      }

      // Try older vSphere 6.x API
      const res2 = await fetch(`${esxiUrl}/rest/com/vmware/cis/session`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64'),
        },
        signal: AbortSignal.timeout(10000),
        // @ts-ignore
        ...(conn.insecureTLS ? { dispatcher: new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } }) } : {}),
      }).catch(() => null)

      if (res2?.ok) {
        return NextResponse.json({ data: { status: 'online', host: esxiUrl } })
      }

      // Fallback: just check if the host responds on HTTPS
      const res3 = await fetch(`${esxiUrl}/`, {
        signal: AbortSignal.timeout(10000),
        // @ts-ignore
        ...(conn.insecureTLS ? { dispatcher: new (await import('undici')).Agent({ connect: { rejectUnauthorized: false } }) } : {}),
      }).catch(() => null)

      if (res3) {
        // Host is reachable but auth may have failed
        return NextResponse.json({ data: { status: 'online', host: esxiUrl, warning: 'Host reachable, authentication not fully verified' } })
      }

      return NextResponse.json({ error: "ESXi host unreachable" }, { status: 502 })
    } catch (e: any) {
      clearTimeout(timeout)
      if (e.name === 'AbortError') {
        return NextResponse.json({ error: "Connection timeout" }, { status: 504 })
      }
      return NextResponse.json({ error: e?.message || String(e) }, { status: 502 })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
