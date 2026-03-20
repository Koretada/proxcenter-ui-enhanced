'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'

import {
  Alert,
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

interface IPPair {
  src_ip: string
  dst_ip: string
  bytes: number
  packets: number
  protocol: string
  dst_port: number
}

interface TopPort {
  port: number
  protocol: string
  service: string
  bytes: number
  packets: number
  percent: number
}

// Known suspicious/dangerous ports
const SUSPICIOUS_PORTS = new Set([
  4444, 5555, 6666, 6667, 1337, 31337, 12345, 54321,
  1434, // SQL Slammer
  3127, // MyDoom
  445,  // SMB (WannaCry vector)
  135, 137, 139, // NetBIOS
  23,   // Telnet (unencrypted)
  21,   // FTP (unencrypted)
  161, 162, // SNMP
])

// RFC1918 private ranges
function isPrivateIP(ip: string): boolean {
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true
  if (ip.startsWith('172.')) {
    const second = parseInt(ip.split('.')[1])
    return second >= 16 && second <= 31
  }
  if (ip.startsWith('127.')) return true
  if (ip.startsWith('169.254.')) return true
  return false
}

async function fetchSFlow(endpoint: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ endpoint, ...params })
  const res = await fetch(`/api/v1/orchestrator/sflow?${query}`)
  if (!res.ok) return []
  return res.json()
}

export default function SecurityTab() {
  const t = useTranslations()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [pairs, setPairs] = useState<IPPair[]>([])
  const [ports, setPorts] = useState<TopPort[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchSFlow('ip-pairs', { n: '200' }),
      fetchSFlow('top-ports', { n: '20' }),
    ]).then(([pairsData, portsData]) => {
      setPairs(Array.isArray(pairsData) ? pairsData : [])
      setPorts(Array.isArray(portsData) ? portsData : [])
    }).finally(() => setLoading(false))

    const interval = setInterval(() => {
      Promise.all([
        fetchSFlow('ip-pairs', { n: '200' }),
        fetchSFlow('top-ports', { n: '20' }),
      ]).then(([pairsData, portsData]) => {
        setPairs(Array.isArray(pairsData) ? pairsData : [])
        setPorts(Array.isArray(portsData) ? portsData : [])
      })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Suspicious ports analysis
  const suspiciousPorts = useMemo(() => {
    return pairs
      .filter(p => SUSPICIOUS_PORTS.has(p.dst_port))
      .sort((a, b) => b.bytes - a.bytes)
  }, [pairs])

  // Port scan detection: IPs contacting many different ports on same destination
  const portScanners = useMemo(() => {
    const scanMap = new Map<string, Set<number>>()
    for (const p of pairs) {
      const key = `${p.src_ip}→${p.dst_ip}`
      if (!scanMap.has(key)) scanMap.set(key, new Set())
      scanMap.get(key)!.add(p.dst_port)
    }
    return Array.from(scanMap.entries())
      .filter(([, ports]) => ports.size >= 5)
      .map(([key, ports]) => {
        const [src, dst] = key.split('→')
        const totalBytes = pairs.filter(p => p.src_ip === src && p.dst_ip === dst).reduce((s, p) => s + p.bytes, 0)
        return { src, dst, portCount: ports.size, ports: Array.from(ports).sort((a, b) => a - b), bytes: totalBytes }
      })
      .sort((a, b) => b.portCount - a.portCount)
  }, [pairs])

  // External vs internal traffic
  const trafficBreakdown = useMemo(() => {
    let internalBytes = 0, externalBytes = 0, internalCount = 0, externalCount = 0
    for (const p of pairs) {
      const bothPrivate = isPrivateIP(p.src_ip) && isPrivateIP(p.dst_ip)
      if (bothPrivate) {
        internalBytes += p.bytes
        internalCount++
      } else {
        externalBytes += p.bytes
        externalCount++
      }
    }
    return { internalBytes, externalBytes, internalCount, externalCount }
  }, [pairs])

  // Protocol distribution
  const protocolDist = useMemo(() => {
    const protoMap = new Map<string, number>()
    for (const p of pairs) {
      const proto = p.protocol.toUpperCase()
      protoMap.set(proto, (protoMap.get(proto) || 0) + p.bytes)
    }
    return Array.from(protoMap.entries())
      .map(([name, bytes]) => ({ name, bytes }))
      .sort((a, b) => b.bytes - a.bytes)
  }, [pairs])

  // Volume anomalies: find IPs with traffic > mean + 2*stddev
  const anomalies = useMemo(() => {
    const ipBytes = new Map<string, number>()
    for (const p of pairs) {
      ipBytes.set(p.src_ip, (ipBytes.get(p.src_ip) || 0) + p.bytes)
    }
    const values = Array.from(ipBytes.values())
    if (values.length < 3) return []
    const mean = values.reduce((s, v) => s + v, 0) / values.length
    const stddev = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length)
    const threshold = mean + 2 * stddev

    return Array.from(ipBytes.entries())
      .filter(([, bytes]) => bytes > threshold)
      .map(([ip, bytes]) => ({ ip, bytes, ratio: bytes / mean }))
      .sort((a, b) => b.bytes - a.bytes)
  }, [pairs])

  const COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} />
      </Box>
    )
  }

  if (pairs.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, opacity: 0.5 }}>
        <Box sx={{ textAlign: 'center' }}>
          <i className="ri-shield-cross-line" style={{ fontSize: 48 }} />
          <Typography variant="body2" sx={{ mt: 1 }}>{t('networkFlows.waitingForData')}</Typography>
        </Box>
      </Box>
    )
  }

  // Security score (simple heuristic)
  const issues = suspiciousPorts.length + portScanners.length + anomalies.length
  const score = Math.max(0, 100 - issues * 10 - (trafficBreakdown.externalBytes > trafficBreakdown.internalBytes ? 15 : 0))
  const scoreColor = score >= 80 ? 'success' : score >= 50 ? 'warning' : 'error'

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

      {/* Security Score + Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 2 }}>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>Security Score</Typography>
            <Typography variant="h4" fontWeight={800} color={`${scoreColor}.main`}>{score}</Typography>
            <Typography variant="caption" color="text.secondary">/100</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-alert-line" style={{ fontSize: 12, marginRight: 4 }} />
              Suspicious Ports
            </Typography>
            <Typography variant="h5" fontWeight={800} color={suspiciousPorts.length > 0 ? 'error.main' : 'success.main'}>
              {suspiciousPorts.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">flows detected</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-scan-line" style={{ fontSize: 12, marginRight: 4 }} />
              Port Scans
            </Typography>
            <Typography variant="h5" fontWeight={800} color={portScanners.length > 0 ? 'warning.main' : 'success.main'}>
              {portScanners.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">sources detected</Typography>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 }, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              <i className="ri-bar-chart-box-line" style={{ fontSize: 12, marginRight: 4 }} />
              Volume Anomalies
            </Typography>
            <Typography variant="h5" fontWeight={800} color={anomalies.length > 0 ? 'warning.main' : 'success.main'}>
              {anomalies.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">IPs above threshold</Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>

        {/* External vs Internal Traffic */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-global-line" style={{ fontSize: 16, marginRight: 6 }} />
              External vs Internal Traffic
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} color="success.main">Internal</Typography>
                  <Typography variant="caption" fontFamily="JetBrains Mono, monospace">{formatBytes(trafficBreakdown.internalBytes)}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={trafficBreakdown.internalBytes + trafficBreakdown.externalBytes > 0 ? (trafficBreakdown.internalBytes / (trafficBreakdown.internalBytes + trafficBreakdown.externalBytes)) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'success.main' } }}
                />
                <Typography variant="caption" color="text.secondary">{trafficBreakdown.internalCount} flows</Typography>
              </Box>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" fontWeight={600} color="warning.main">External</Typography>
                  <Typography variant="caption" fontFamily="JetBrains Mono, monospace">{formatBytes(trafficBreakdown.externalBytes)}</Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={trafficBreakdown.internalBytes + trafficBreakdown.externalBytes > 0 ? (trafficBreakdown.externalBytes / (trafficBreakdown.internalBytes + trafficBreakdown.externalBytes)) * 100 : 0}
                  sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 4, bgcolor: 'warning.main' } }}
                />
                <Typography variant="caption" color="text.secondary">{trafficBreakdown.externalCount} flows</Typography>
              </Box>
            </Box>
            {trafficBreakdown.externalBytes > trafficBreakdown.internalBytes && (
              <Alert severity="warning" sx={{ fontSize: '0.75rem' }} icon={<i className="ri-alert-line" style={{ fontSize: 16 }} />}>
                External traffic exceeds internal — verify this is expected
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Protocol Distribution */}
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-pie-chart-line" style={{ fontSize: 16, marginRight: 6 }} />
              Protocol Distribution
            </Typography>
            {protocolDist.length > 0 && (
              <Box sx={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={protocolDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="bytes"
                      nameKey="name"
                      strokeWidth={2}
                      stroke={isDark ? '#0f172a' : '#ffffff'}
                    >
                      {protocolDist.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(v: number, name: string) => [formatBytes(v), name]}
                      contentStyle={{ backgroundColor: theme.palette.background.paper, borderColor: theme.palette.divider, color: theme.palette.text.primary, fontSize: 12, borderRadius: 8 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Suspicious Ports */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            <i className="ri-alarm-warning-line" style={{ fontSize: 16, marginRight: 6, color: theme.palette.error.main }} />
            Suspicious Port Activity
          </Typography>
          {suspiciousPorts.length === 0 ? (
            <Alert severity="success" icon={<i className="ri-shield-check-line" style={{ fontSize: 16 }} />} sx={{ fontSize: '0.8rem' }}>
              No traffic detected on known suspicious ports
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Destination</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Port</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Bytes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {suspiciousPorts.slice(0, 10).map((p, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{p.src_ip}</TableCell>
                      <TableCell sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{p.dst_ip}</TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Chip label={`${p.dst_port}/${p.protocol}`} size="small" color="error" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{formatBytes(p.bytes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Port Scan Detection */}
      <Card variant="outlined" sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            <i className="ri-scan-line" style={{ fontSize: 16, marginRight: 6, color: theme.palette.warning.main }} />
            Port Scan Detection
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              (IPs contacting 5+ different ports on same destination)
            </Typography>
          </Typography>
          {portScanners.length === 0 ? (
            <Alert severity="success" icon={<i className="ri-shield-check-line" style={{ fontSize: 16 }} />} sx={{ fontSize: '0.8rem' }}>
              No port scanning activity detected
            </Alert>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Source</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Target</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Ports</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Bytes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {portScanners.slice(0, 10).map((s, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{s.src}</TableCell>
                      <TableCell sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{s.dst}</TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip label={`${s.portCount} ports`} size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                          {s.ports.slice(0, 5).map(port => (
                            <Chip key={port} label={port} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem' }} />
                          ))}
                          {s.ports.length > 5 && <Typography variant="caption" color="text.secondary">+{s.ports.length - 5}</Typography>}
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{formatBytes(s.bytes)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Volume Anomalies */}
      {anomalies.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              <i className="ri-flashlight-line" style={{ fontSize: 16, marginRight: 6, color: theme.palette.warning.main }} />
              Volume Anomalies
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                (IPs exceeding 2x standard deviation)
              </Typography>
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>IP</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>Volume</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5 }}>vs Average</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', py: 0.5, width: 120 }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {anomalies.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{a.ip}</TableCell>
                      <TableCell align="right" sx={{ py: 0.75, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }}>{formatBytes(a.bytes)}</TableCell>
                      <TableCell align="right" sx={{ py: 0.75 }}>
                        <Chip label={`×${a.ratio.toFixed(1)}`} size="small" color="warning" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ py: 0.75 }}>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (a.ratio / Math.max(...anomalies.map(x => x.ratio))) * 100)}
                          sx={{ height: 6, borderRadius: 3, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { borderRadius: 3, bgcolor: 'warning.main' } }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  )
}
