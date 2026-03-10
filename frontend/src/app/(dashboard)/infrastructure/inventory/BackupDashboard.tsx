'use client'

import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Stack,
  Chip,
  alpha,
  useTheme,
} from '@mui/material'
import { formatBytes } from '@/utils/format'

type PbsServer = {
  connId: string
  name: string
  status: string
  datastores: Array<{
    name: string
    path?: string
    comment?: string
    total: number
    used: number
    available: number
    usagePercent: number
    backupCount: number
  }>
  stats: { backupCount: number; totalSize?: number }
}

type Props = {
  pbsServers: PbsServer[]
  onPbsClick?: (sel: { type: 'pbs'; id: string }) => void
  onDatastoreClick?: (sel: { type: 'pbs-datastore' | 'datastore'; id: string }) => void
}

function KpiCard({ label, value }: { label: string; value: string | number }) {
  const theme = useTheme()
  return (
    <Card
      variant="outlined"
      sx={{ flex: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.04) }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function getUsageColor(pct: number, mode: 'light' | 'dark'): string {
  if (pct >= 90) return '#f44336'
  if (pct >= 70) return '#ff9800'
  return '#4caf50'
}

export default function BackupDashboard({ pbsServers, onPbsClick, onDatastoreClick }: Props) {
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  if (pbsServers.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1.5,
          py: 8,
          color: 'text.secondary',
        }}
      >
        <i className="ri-information-line" style={{ fontSize: 40 }} />
        <Typography variant="body1">No backup servers configured</Typography>
      </Box>
    )
  }

  // Compute KPI values
  const totalServers = pbsServers.length
  const totalBackups = pbsServers.reduce((sum, s) => sum + s.stats.backupCount, 0)
  const totalSize = pbsServers.reduce((sum, s) => sum + (s.stats.totalSize ?? 0), 0)
  const allDatastores = pbsServers.flatMap((s) => s.datastores)
  const avgUsage =
    allDatastores.length > 0
      ? Math.round(
          allDatastores.reduce((sum, d) => sum + d.usagePercent, 0) / allDatastores.length
        )
      : 0

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: 'primary.main',
          }}
        >
          <i className="ri-hard-drive-2-fill" style={{ fontSize: 20 }} />
        </Box>
        <Typography variant="h6" fontWeight={700}>
          Backup Overview
        </Typography>
      </Stack>

      {/* KPI Row */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
        <KpiCard label="PBS Servers" value={totalServers} />
        <KpiCard label="Total Backups" value={totalBackups} />
        <KpiCard label="Total Size" value={totalSize > 0 ? formatBytes(totalSize) : '—'} />
        <KpiCard label="Avg Usage" value={`${avgUsage}%`} />
      </Stack>

      {/* Datastore Usage Bars */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, opacity: 0.7 }}>
          Datastore Usage
        </Typography>
        <Stack spacing={2.5}>
          {pbsServers.map((server) => (
            <Box key={server.connId}>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <i className="ri-server-2-line" style={{ fontSize: 14 }} />
                {server.name}
              </Typography>
              {server.datastores.length === 0 ? (
                <Typography variant="caption" sx={{ opacity: 0.5, pl: 1 }}>
                  No datastores
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {server.datastores.map((ds) => {
                    const pct = Math.min(Math.max(ds.usagePercent, 0), 100)
                    const color = getUsageColor(pct, theme.palette.mode)
                    const dsId = `${server.connId}:${ds.name}`
                    return (
                      <Box
                        key={ds.name}
                        onClick={() =>
                          onDatastoreClick?.({ type: 'pbs-datastore', id: dsId })
                        }
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: onDatastoreClick ? 'pointer' : 'default',
                          transition: 'background 0.15s',
                          '&:hover': onDatastoreClick
                            ? { bgcolor: alpha(theme.palette.primary.main, 0.06) }
                            : {},
                        }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          sx={{ mb: 0.5 }}
                        >
                          <Typography variant="body2" fontWeight={500}>
                            {ds.name}
                          </Typography>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="caption" sx={{ opacity: 0.6 }}>
                              {formatBytes(ds.used)} / {formatBytes(ds.total)}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              sx={{ color, minWidth: 36, textAlign: 'right' }}
                            >
                              {pct.toFixed(1)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: alpha(color, 0.15),
                            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
                          }}
                        />
                      </Box>
                    )
                  })}
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* PBS Server Cards */}
      <Box>
        <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, opacity: 0.7 }}>
          PBS Servers
        </Typography>
        <Stack spacing={1.5}>
          {pbsServers.map((server) => {
            const isOnline = server.status === 'online'
            return (
              <Card
                key={server.connId}
                variant="outlined"
                onClick={() => onPbsClick?.({ type: 'pbs', id: server.connId })}
                sx={{
                  borderRadius: 2,
                  cursor: onPbsClick ? 'pointer' : 'default',
                  transition: 'background 0.15s, border-color 0.15s',
                  '&:hover': onPbsClick
                    ? {
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                        borderColor: 'primary.main',
                      }
                    : {},
                }}
              >
                <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" spacing={1.5}>
                    {/* Status dot */}
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: isOnline ? '#4caf50' : 'text.disabled',
                        flexShrink: 0,
                        boxShadow: isOnline ? `0 0 6px #4caf5099` : 'none',
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {server.name}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.55 }}>
                        {server.datastores.length} datastore
                        {server.datastores.length !== 1 ? 's' : ''}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={isOnline ? 'Online' : server.status}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: 11,
                          bgcolor: isOnline
                            ? alpha('#4caf50', 0.12)
                            : alpha(theme.palette.text.secondary, 0.1),
                          color: isOnline ? '#4caf50' : 'text.secondary',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="body2" fontWeight={700}>
                        {server.stats.backupCount}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.5 }}>
                        backups
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            )
          })}
        </Stack>
      </Box>
    </Box>
  )
}
