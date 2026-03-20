'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from 'recharts'

import {
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from '@mui/material'

import { formatBytes } from '@/utils/format'

interface TopTalker {
  vmid: number
  vm_name: string
  node: string
  bytes_in: number
  bytes_out: number
  packets: number
}

interface TopPort {
  port: number
  protocol: string
  service: string
  bytes: number
  packets: number
  percent: number
}

interface SFlowStatus {
  enabled: boolean
  agents: Array<{ agent_ip: string; node: string; last_seen: string; flow_rate: number; sample_count: number; active: boolean }>
  total_flows: number
  flow_rate: number
  active_vms: number
  uptime_seconds: number
}

// Well-known port → service name
function portToService(port: number, protocol: string): string {
  const services: Record<number, string> = {
    22: 'SSH', 53: 'DNS', 80: 'HTTP', 443: 'HTTPS', 3306: 'MySQL',
    5432: 'PostgreSQL', 6379: 'Redis', 8006: 'PVE API', 8080: 'HTTP-Alt',
    25: 'SMTP', 110: 'POP3', 143: 'IMAP', 3389: 'RDP', 5900: 'VNC',
    6789: 'Ceph MON', 3300: 'Ceph MON', 2049: 'NFS', 445: 'SMB',
    9090: 'Prometheus', 9100: 'Node Exp', 5044: 'Logstash',
  }
  return services[port] || `${port}/${protocol}`
}

async function fetchSFlow(endpoint: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ endpoint, ...params })
  const res = await fetch(`/api/v1/orchestrator/sflow?${query}`)
  if (!res.ok) return null
  return res.json()
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

const NODE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']
const SERVICE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1']

export default function InfrastructureTab() {
  const t = useTranslations()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [talkers, setTalkers] = useState<TopTalker[]>([])
  const [ports, setPorts] = useState<TopPort[]>([])
  const [status, setStatus] = useState<SFlowStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchSFlow('top-talkers', { n: '50' }),
      fetchSFlow('top-ports', { n: '15' }),
      fetchSFlow('status'),
    ]).then(([talkersData, portsData, statusData]) => {
      setTalkers(Array.isArray(talkersData) ? talkersData : [])
      setPorts(Array.isArray(portsData) ? portsData : [])
      setStatus(statusData)
    }).finally(() => setLoading(false))

    const interval = setInterval(() => {
      Promise.all([
        fetchSFlow('top-talkers', { n: '50' }),
        fetchSFlow('top-ports', { n: '15' }),
        fetchSFlow('status'),
      ]).then(([talkersData, portsData, statusData]) => {
        setTalkers(Array.isArray(talkersData) ? talkersData : [])
        setPorts(Array.isArray(portsData) ? portsData : [])
        setStatus(statusData)
      })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Traffic per node
  const nodeTraffic = useMemo(() => {
    const nodeMap = new Map<string, { node: string; bytesIn: number; bytesOut: number; vmCount: number }>()
    for (const t of talkers) {
      const node = t.node || 'Unknown'
      const entry = nodeMap.get(node) || { node, bytesIn: 0, bytesOut: 0, vmCount: 0 }
      entry.bytesIn += t.bytes_in
      entry.bytesOut += t.bytes_out
      entry.vmCount++
      nodeMap.set(node, entry)
    }
    return Array.from(nodeMap.values()).sort((a, b) => (b.bytesIn + b.bytesOut) - (a.bytesIn + a.bytesOut))
  }, [talkers])

  // Service distribution (from ports)
  const serviceDist = useMemo(() => {
    return ports.slice(0, 8).map(p => ({
      name: portToService(p.port, p.protocol),
      bytes: p.bytes,
    }))
  }, [ports])

  // Top VMs per node
  const vmsByNode = useMemo(() => {
    const grouped = new Map<string, TopTalker[]>()
    for (const t of talkers) {
      const node = t.node || 'Unknown'
      if (!grouped.has(node)) grouped.set(node, [])
      grouped.get(node)!.push(t)
    }
    // Sort VMs within each node
    for (const vms of grouped.values()) {
      vms.sort((a, b) => (b.bytes_in + b.bytes_out) - (a.bytes_in + a.bytes_out))
    }
    return grouped
  }, [talkers])

  // Agents health
  const agents = status?.agents || []

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (talkers.length === 0 && agents.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, opacity: 0.5 }}>
        <Box sx={{ textAlign: 'center' }}>
          <i className="ri-server-line" style={{ fontSize: 48 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>{t('networkFlows.waitingForData')}</Typography>
        </Box>
      </Box>
    )
  }

  const totalTraffic = nodeTraffic.reduce((s, n) => s + n.bytesIn + n.bytesOut, 0)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* KPI Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-server-line" style={{ fontSize: 12, marginRight: 4 }} />
              Nodes
            </Typography>
            <Typography variant="h5" fontWeight={800} color="primary">{nodeTraffic.length}</Typography>
            <Typography variant="caption" color="text.secondary">with traffic</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-radar-line" style={{ fontSize: 12, marginRight: 4 }} />
              Agents
            </Typography>
            <Typography variant="h5" fontWeight={800} color="primary">{agents.filter(a => a.active).length}/{agents.length}</Typography>
            <Typography variant="caption" color="text.secondary">active</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-speed-line" style={{ fontSize: 12, marginRight: 4 }} />
              Flow Rate
            </Typography>
            <Typography variant="h5" fontWeight={800} color="primary">{(status?.flow_rate || 0).toFixed(1)}</Typography>
            <Typography variant="caption" color="text.secondary">flows/s</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-time-line" style={{ fontSize: 12, marginRight: 4 }} />
              Uptime
            </Typography>
            <Typography variant="h5" fontWeight={800} color="primary">{formatUptime(status?.uptime_seconds || 0)}</Typography>
            <Typography variant="caption" color="text.secondary">collector</Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Traffic per Node (bar chart) + Service Distribution (donut) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>

        {/* Traffic per Node */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <img src={theme.palette.mode === 'dark' ? '/images/proxmox-logo-dark.svg' : '/images/proxmox-logo.svg'} alt="" style={{ width: 16, height: 16, marginRight: 6, verticalAlign: 'middle' }} />
              Traffic per Node
            </Typography>
            {nodeTraffic.length > 0 ? (
              <Box sx={{ height: Math.max(200, nodeTraffic.length * 40 + 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={nodeTraffic} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => formatBytes(v)} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="node" tick={{ fontSize: 11 }} width={120} />
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [formatBytes(v), name === 'bytesIn' ? '↓ Inbound' : '↑ Outbound']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, color: theme.palette.text.primary }}
                    />
                    <Bar dataKey="bytesIn" name="bytesIn" stackId="a" fill={theme.palette.success.main} radius={[0, 0, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="bytesOut" name="bytesOut" stackId="a" fill={theme.palette.warning.main} radius={[0, 4, 4, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No node data available</Typography>
            )}
          </CardContent>
        </Card>

        {/* Service Distribution */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-apps-line" style={{ fontSize: 16, marginRight: 6 }} />
              Service Distribution
            </Typography>
            {serviceDist.length > 0 ? (
              <Box sx={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="bytes"
                      nameKey="name"
                      strokeWidth={2}
                      stroke={isDark ? '#0f172a' : '#ffffff'}
                    >
                      {serviceDist.map((_, idx) => (
                        <Cell key={idx} fill={SERVICE_COLORS[idx % SERVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [formatBytes(v), name]}
                      contentStyle={{ backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, color: theme.palette.text.primary, fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>No service data</Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Agent Health */}
      {agents.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-radar-line" style={{ fontSize: 16, marginRight: 6 }} />
              Agent Health
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Agent</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Node</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Flow Rate</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Samples</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Last Seen</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {agents.map((agent, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{agent.agent_ip}</TableCell>
                      <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>{agent.node || '—'}</TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Chip label={agent.active ? 'Active' : 'Inactive'} size="small" color={agent.active ? 'success' : 'default'} sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                        {agent.flow_rate.toFixed(1)} f/s
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>
                        {agent.sample_count.toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ py: 0.75, fontSize: '0.75rem', color: 'text.secondary' }}>
                        {agent.last_seen ? new Date(agent.last_seen).toLocaleTimeString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Top VMs per Node */}
      {nodeTraffic.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-computer-line" style={{ fontSize: 16, marginRight: 6 }} />
              Top VMs per Node
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `repeat(${Math.min(nodeTraffic.length, 3)}, 1fr)` }, gap: 2 }}>
              {Array.from(vmsByNode.entries()).map(([node, vms], nodeIdx) => {
                const nodeTotal = vms.reduce((s, v) => s + v.bytes_in + v.bytes_out, 0)
                return (
                  <Box key={node}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <img src={theme.palette.mode === 'dark' ? '/images/proxmox-logo-dark.svg' : '/images/proxmox-logo.svg'} alt="" style={{ width: 14, height: 14 }} />
                      <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase' }}>{node}</Typography>
                      <Chip label={`${vms.length} VMs`} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                    </Box>
                    {vms.slice(0, 5).map((vm, i) => {
                      const vmTotal = vm.bytes_in + vm.bytes_out
                      const pct = nodeTotal > 0 ? (vmTotal / nodeTotal) * 100 : 0
                      return (
                        <Box key={vm.vmid} sx={{ mb: 0.75 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                            <Typography variant="caption" fontSize="0.7rem" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <i className="ri-computer-line" style={{ fontSize: 10, opacity: 0.5 }} />
                              {vm.vm_name || `VM ${vm.vmid}`}
                            </Typography>
                            <Typography variant="caption" fontFamily="JetBrains Mono, monospace" fontSize="0.65rem" color="text.secondary">
                              {formatBytes(vmTotal)}
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 5,
                              borderRadius: 3,
                              bgcolor: 'action.hover',
                              '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: NODE_COLORS[nodeIdx % NODE_COLORS.length] },
                            }}
                          />
                        </Box>
                      )
                    })}
                    {vms.length > 5 && (
                      <Typography variant="caption" color="text.secondary">+{vms.length - 5} more VMs</Typography>
                    )}
                  </Box>
                )
              })}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Node Traffic Share */}
      {nodeTraffic.length > 1 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-pie-chart-2-line" style={{ fontSize: 16, marginRight: 6 }} />
              Node Traffic Share
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Node</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>VMs</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>↓ In</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>↑ Out</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Total</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5, width: 120 }}>Share</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {nodeTraffic.map((n, i) => {
                    const total = n.bytesIn + n.bytesOut
                    const pct = totalTraffic > 0 ? (total / totalTraffic) * 100 : 0
                    return (
                      <TableRow key={n.node}>
                        <TableCell sx={{ py: 0.75, fontSize: '0.8rem' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <img src={theme.palette.mode === 'dark' ? '/images/proxmox-logo-dark.svg' : '/images/proxmox-logo.svg'} alt="" style={{ width: 14, height: 14, opacity: 0.7 }} />
                            {n.node}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip label={n.vmCount} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'success.main' }}>{formatBytes(n.bytesIn)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'warning.main' }}>{formatBytes(n.bytesOut)}</TableCell>
                        <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', fontWeight: 600 }}>{formatBytes(total)}</TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: NODE_COLORS[i % NODE_COLORS.length] } }}
                            />
                            <Typography variant="caption" fontSize="0.7rem" sx={{ minWidth: 30 }}>{pct.toFixed(0)}%</Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
