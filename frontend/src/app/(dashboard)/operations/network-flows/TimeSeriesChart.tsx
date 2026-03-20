'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

import {
  Alert,
  Autocomplete,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material'

import { formatBytes } from '@/utils/format'

interface TopTalker {
  vmid: number
  vm_name: string
  bytes_in: number
  bytes_out: number
}

interface TimeSeriesPoint {
  time: number
  bytes_in: number
  bytes_out: number
  packets: number
}

async function fetchSFlow(endpoint: string, params?: Record<string, string>) {
  const query = new URLSearchParams({ endpoint, ...params })
  const res = await fetch(`/api/v1/orchestrator/sflow?${query}`)
  if (!res.ok) return null
  return res.json()
}

const timeRanges = [
  { label: '5m', value: 5 },
  { label: '15m', value: 15 },
  { label: '1h', value: 60 },
  { label: '6h', value: 360 },
  { label: '24h', value: 1440 },
  { label: '7d', value: 10080 },
]

export default function TimeSeriesChart() {
  const t = useTranslations()
  const theme = useTheme()
  const primaryColor = theme.palette.primary.main
  const isDark = theme.palette.mode === 'dark'

  const [vms, setVMs] = useState<TopTalker[]>([])
  const [selectedVM, setSelectedVM] = useState<TopTalker | null>(null)
  const [timeRange, setTimeRange] = useState(60) // minutes
  const [data, setData] = useState<TimeSeriesPoint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available VMs
  useEffect(() => {
    fetchSFlow('top-talkers', { n: '50' }).then(d => {
      if (Array.isArray(d)) setVMs(d)
    })
  }, [])

  // Load time series data
  const loadTimeSeries = useCallback(async () => {
    if (!selectedVM) return

    setLoading(true)
    setError(null)

    try {
      const now = new Date()
      const from = new Date(now.getTime() - timeRange * 60 * 1000)

      const params: Record<string, string> = {
        endpoint: 'timeseries/vm',
        vmid: String(selectedVM.vmid),
        from: from.toISOString(),
        to: now.toISOString(),
      }

      const query = new URLSearchParams(params)
      const res = await fetch(`/api/v1/orchestrator/sflow?${query}`)

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        if (res.status === 503) {
          setError(t('networkFlows.influxNotConfigured'))
        } else {
          setError(errData.error || 'Failed to load time series')
        }
        setData([])
        return
      }

      const points = await res.json()
      setData(Array.isArray(points) ? points : [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedVM, timeRange, t])

  useEffect(() => {
    loadTimeSeries()
    if (selectedVM) {
      const interval = setInterval(loadTimeSeries, 30000)
      return () => clearInterval(interval)
    }
  }, [loadTimeSeries, selectedVM])

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000)
    if (timeRange <= 60) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (timeRange <= 1440) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>

      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Autocomplete
          size="small"
          sx={{ minWidth: 300 }}
          options={vms}
          getOptionLabel={(vm) => `${vm.vm_name || `VM ${vm.vmid}`} (${vm.vmid})`}
          value={selectedVM}
          onChange={(_, v) => setSelectedVM(v)}
          renderInput={(params) => (
            <TextField {...params} label={t('networkFlows.selectVm')} placeholder={t('common.search')} />
          )}
          renderOption={(props, vm) => (
            <Box component="li" {...props} sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <i className="ri-computer-line" style={{ fontSize: 14, opacity: 0.5 }} />
                {vm.vm_name || `VM ${vm.vmid}`}
                <Typography variant="caption" color="text.secondary">({vm.vmid})</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                {formatBytes(vm.bytes_in + vm.bytes_out)}
              </Typography>
            </Box>
          )}
        />

        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, v) => v && setTimeRange(v)}
          size="small"
        >
          {timeRanges.map(r => (
            <ToggleButton key={r.value} value={r.value} sx={{ px: 1.5, fontSize: '0.75rem' }}>
              {r.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="warning" icon={<i className="ri-information-line" />}>
          {error}
        </Alert>
      )}

      {/* No VM selected */}
      {!selectedVM && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Box sx={{ textAlign: 'center', opacity: 0.4 }}>
            <i className="ri-line-chart-line" style={{ fontSize: 48 }} />
            <Typography variant="body2" sx={{ mt: 1 }}>{t('networkFlows.selectVmToView')}</Typography>
          </Box>
        </Box>
      )}

      {/* Loading */}
      {selectedVM && loading && data.length === 0 && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Chart */}
      {selectedVM && data.length > 0 && (
        <Card variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                <i className="ri-line-chart-line" style={{ fontSize: 16, marginRight: 6 }} />
                {selectedVM.vm_name || `VM ${selectedVM.vmid}`} — Bandwidth
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`↓ In`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${theme.palette.success.main}20`, color: theme.palette.success.main }}
                />
                <Chip
                  label={`↑ Out`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.65rem', bgcolor: `${theme.palette.warning.main}20`, color: theme.palette.warning.main }}
                />
              </Box>
            </Box>

            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                  <XAxis
                    dataKey="time"
                    tickFormatter={formatTime}
                    tick={{ fontSize: 10 }}
                    stroke={theme.palette.text.secondary}
                  />
                  <YAxis
                    tickFormatter={(v) => formatBytes(v)}
                    tick={{ fontSize: 10 }}
                    width={70}
                    stroke={theme.palette.text.secondary}
                  />
                  <RechartsTooltip
                    labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
                    formatter={(v: number, name: string) => [
                      formatBytes(v),
                      name === 'bytes_in' ? '↓ Inbound' : '↑ Outbound'
                    ]}
                    contentStyle={{
                      backgroundColor: theme.palette.background.paper,
                      borderColor: theme.palette.divider,
                      color: theme.palette.text.primary,
                      fontSize: 12,
                      borderRadius: 8,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bytes_in"
                    stroke={theme.palette.success.main}
                    fill={theme.palette.success.main}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="bytes_out"
                    stroke={theme.palette.warning.main}
                    fill={theme.palette.warning.main}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {selectedVM && !loading && data.length === 0 && !error && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <Box sx={{ textAlign: 'center', opacity: 0.4 }}>
            <i className="ri-database-2-line" style={{ fontSize: 48 }} />
            <Typography variant="body2" sx={{ mt: 1 }}>{t('networkFlows.noTimeSeriesData')}</Typography>
          </Box>
        </Box>
      )}
    </Box>
  )
}
