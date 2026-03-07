/**
 * Shared inventory poller — polls PVE /cluster/resources periodically,
 * detects changes (VM status, CPU, RAM, node status) and notifies
 * all connected SSE clients via a subscriber model.
 *
 * Only ONE poller runs per PVE connection, shared across all SSE clients.
 * Automatically starts on first subscriber and stops when no subscribers remain.
 */

import { prisma } from "@/lib/db/prisma"
import { getConnectionById } from "@/lib/connections/getConnection"
import { pveFetch } from "@/lib/proxmox/client"

// ---------- Types ----------

export type InventoryEvent =
  | { event: 'vm:update'; connId: string; vmid: string | number; node: string; type: string; status: string; cpu?: number; mem?: number; maxmem?: number; disk?: number; maxdisk?: number; uptime?: number; name?: string }
  | { event: 'node:update'; connId: string; node: string; status: string; cpu?: number; mem?: number; maxmem?: number }
  | { event: 'vm:added'; connId: string; vmid: string | number; node: string; type: string; status: string; name?: string; cpu?: number; mem?: number; maxmem?: number }
  | { event: 'vm:removed'; connId: string; vmid: string | number; node: string; type: string }

export type Subscriber = (events: InventoryEvent[]) => void

// ---------- State ----------

type ResourceSnapshot = {
  id: string // "qemu/100" or "node/pve1"
  status: string
  cpu?: number
  mem?: number
  maxmem?: number
  disk?: number
  maxdisk?: number
  uptime?: number
  name?: string
  node?: string
  type?: string
  vmid?: string | number
}

type ConnectionPoller = {
  interval: ReturnType<typeof setInterval>
  prevState: Map<string, ResourceSnapshot>
}

const pollers = new Map<string, ConnectionPoller>()
const subscribers = new Set<Subscriber>()
let masterInterval: ReturnType<typeof setInterval> | null = null

const POLL_INTERVAL_MS = 10_000 // 10 seconds

// ---------- Diff logic ----------

function hasChanged(prev: ResourceSnapshot, curr: ResourceSnapshot): boolean {
  return (
    prev.status !== curr.status ||
    prev.cpu !== curr.cpu ||
    prev.mem !== curr.mem ||
    prev.maxmem !== curr.maxmem ||
    prev.name !== curr.name ||
    prev.node !== curr.node
  )
}

// ---------- Poll one connection ----------

async function pollConnection(connId: string, connConfig: any): Promise<InventoryEvent[]> {
  const events: InventoryEvent[] = []

  try {
    const resources = await pveFetch<any[]>(connConfig, '/cluster/resources', {
      signal: AbortSignal.timeout(8000),
    })

    if (!resources || !Array.isArray(resources)) return events

    let poller = pollers.get(connId)
    if (!poller) {
      poller = { interval: null as any, prevState: new Map() }
      pollers.set(connId, poller)
    }

    const currentIds = new Set<string>()

    for (const r of resources) {
      if (!r?.type) continue

      if (r.type === 'qemu' || r.type === 'lxc') {
        const id = `${r.type}/${r.vmid}`
        currentIds.add(id)

        const curr: ResourceSnapshot = {
          id,
          status: r.status || 'unknown',
          cpu: r.cpu,
          mem: r.mem,
          maxmem: r.maxmem,
          disk: r.disk,
          maxdisk: r.maxdisk,
          uptime: r.uptime,
          name: r.name,
          node: r.node,
          type: r.type,
          vmid: r.vmid,
        }

        const prev = poller.prevState.get(id)
        if (!prev) {
          // New VM detected (only push if we already had a previous snapshot = not first poll)
          if (poller.prevState.size > 0) {
            events.push({
              event: 'vm:added',
              connId,
              vmid: r.vmid,
              node: r.node,
              type: r.type,
              status: r.status || 'unknown',
              name: r.name,
              cpu: r.cpu,
              mem: r.mem,
              maxmem: r.maxmem,
            })
          }
        } else if (hasChanged(prev, curr)) {
          events.push({
            event: 'vm:update',
            connId,
            vmid: r.vmid,
            node: r.node,
            type: r.type,
            status: r.status || 'unknown',
            cpu: r.cpu,
            mem: r.mem,
            maxmem: r.maxmem,
            disk: r.disk,
            maxdisk: r.maxdisk,
            uptime: r.uptime,
            name: r.name,
          })
        }

        poller.prevState.set(id, curr)
      } else if (r.type === 'node') {
        const id = `node/${r.node}`
        currentIds.add(id)

        const curr: ResourceSnapshot = {
          id,
          status: r.status || 'unknown',
          cpu: r.cpu,
          mem: r.mem,
          maxmem: r.maxmem,
          node: r.node,
          type: 'node',
        }

        const prev = poller.prevState.get(id)
        if (prev && hasChanged(prev, curr)) {
          events.push({
            event: 'node:update',
            connId,
            node: r.node,
            status: r.status || 'unknown',
            cpu: r.cpu,
            mem: r.mem,
            maxmem: r.maxmem,
          })
        }

        poller.prevState.set(id, curr)
      }
    }

    // Detect removed VMs
    if (poller.prevState.size > 0) {
      for (const [id, snap] of poller.prevState) {
        if (!currentIds.has(id) && (snap.type === 'qemu' || snap.type === 'lxc')) {
          events.push({
            event: 'vm:removed',
            connId,
            vmid: snap.vmid!,
            node: snap.node!,
            type: snap.type,
          })
          poller.prevState.delete(id)
        }
      }
    }
  } catch (e: any) {
    // Connection error — don't crash, just skip this poll cycle
    console.error(`[inventory-poller] Error polling ${connId}:`, e?.message)
  }

  return events
}

// ---------- Master poll cycle ----------

async function pollAll() {
  if (subscribers.size === 0) return

  try {
    const connections = await prisma.connection.findMany({
      where: { type: 'pve' },
      select: { id: true, name: true },
    })

    const allEvents: InventoryEvent[] = []

    // Poll all connections in parallel
    const results = await Promise.allSettled(
      connections.map(async (conn) => {
        const connConfig = await getConnectionById(conn.id)
        return pollConnection(conn.id, connConfig)
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allEvents.push(...result.value)
      }
    }

    // Notify all subscribers
    if (allEvents.length > 0) {
      for (const sub of subscribers) {
        try {
          sub(allEvents)
        } catch {
          // Subscriber error — will be cleaned up on unsubscribe
        }
      }
    }
  } catch (e: any) {
    console.error('[inventory-poller] Master poll error:', e?.message)
  }
}

// ---------- Public API ----------

export function subscribe(fn: Subscriber): () => void {
  subscribers.add(fn)

  // Start master poller if this is the first subscriber
  if (!masterInterval && subscribers.size === 1) {
    console.log('[inventory-poller] Starting (first subscriber)')
    // Poll immediately on first subscribe, then every POLL_INTERVAL_MS
    pollAll()
    masterInterval = setInterval(pollAll, POLL_INTERVAL_MS)
  }

  // Return unsubscribe function
  return () => {
    subscribers.delete(fn)

    // Stop master poller if no subscribers remain
    if (subscribers.size === 0 && masterInterval) {
      console.log('[inventory-poller] Stopping (no subscribers)')
      clearInterval(masterInterval)
      masterInterval = null
      // Keep poller state for quick restart
    }
  }
}

/** Force an immediate poll cycle (e.g., after a user action) */
export function triggerPoll() {
  pollAll()
}
