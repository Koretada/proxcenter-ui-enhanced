'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Box, CircularProgress, Typography, useTheme } from '@mui/material'
import { useLicense } from '@/contexts/LicenseContext'
import { useDRSStatus, useDRSMetrics } from '@/hooks/useDRS'
import { computeDrsHealthScore } from '@/lib/utils/drs-health'

// ─── Score Ring (animated) ───────────────────────────────────────────────────
function ScoreRing({ score, size = 80, strokeWidth = 6, theme }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const [mounted, setMounted] = useState(false)
  const offset = mounted ? circumference - (score / 100) * circumference : circumference
  const trackColor = 'rgba(255,255,255,0.08)'
  const color = score >= 80 ? '#4caf50' : score >= 50 ? '#ff9800' : '#f44336'

  useEffect(() => { const t = setTimeout(() => setMounted(true), 50); return () => clearTimeout(t) }, [])

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }} />
      </svg>
      <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, fontFamily: '"JetBrains Mono", monospace', color, lineHeight: 1 }}>
          {score}
        </Typography>
        <Typography sx={{ fontSize: 7, opacity: 0.755, fontWeight: 700, textTransform: 'uppercase' }}>
          health
        </Typography>
      </Box>
    </Box>
  )
}

function getScoreColor(score) {
  if (score >= 80) return '#4caf50'
  if (score >= 50) return '#ff9800'
  return '#f44336'
}

function getGaugeColor(value) {
  if (value >= 90) return '#f44336'
  if (value >= 75) return '#ff9800'
  return '#4caf50'
}

// ─── DRS Cluster Card ────────────────────────────────────────────────────────
function DrsClusterCard({ clusterId, clusterMetrics, clusterInfo, drsStatus, theme, t }) {
  const isDark = theme.palette.mode === 'dark'
  const summary = clusterMetrics?.summary || {}
  const nodes = clusterMetrics?.nodes || []
  const onlineNodes = nodes.filter(n => !n.status || n.status === 'online')

  const breakdown = computeDrsHealthScore(summary, nodes)
  const score = breakdown.score
  const scoreColor = getScoreColor(score)

  const enabled = drsStatus?.enabled ?? false
  const mode = drsStatus?.mode || 'manual'
  const activeMigrations = drsStatus?.active_migrations || 0
  const recommendations = drsStatus?.recommendations || 0

  // Use cluster name from dashboard data, fallback to connection ID
  const clusterName = clusterInfo?.name || clusterId

  return (
    <Box
      {...(!isDark && { 'data-dark': '' })}
      sx={{
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#1e1e2d',
        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        borderRadius: 2.5, p: 1.5, display: 'flex', flexDirection: 'column', gap: 1,
        transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
        '&:hover': { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.15)', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' },
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <i className='ri-swap-line' style={{ fontSize: 14, opacity: 0.7 }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {clusterName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%',
            bgcolor: enabled ? (mode === 'automatic' ? '#4caf50' : '#ff9800') : '#9e9e9e'
          }} />
          <Typography sx={{ fontSize: 9, opacity: 0.7, fontFamily: '"JetBrains Mono", monospace' }}>
            {enabled ? mode : 'off'}
          </Typography>
        </Box>
      </Box>

      {/* Score ring centered */}
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5 }}>
        <ScoreRing score={score} theme={theme} />
      </Box>

      {/* Per-node mini bars */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {onlineNodes.map((node, idx) => {
          const nodeCpu = Math.round(node.cpu_usage || 0)
          const nodeRam = Math.round(node.memory_usage || 0)
          return (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Typography sx={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', width: 60, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.75 }}>
                {node.name || `node-${idx}`}
              </Typography>
              <Box sx={{ flex: 1, display: 'flex', gap: 0.5 }}>
                <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <Box sx={{ width: `${nodeCpu}%`, height: '100%', borderRadius: 3, bgcolor: getGaugeColor(nodeCpu), transition: 'width 0.6s ease' }} />
                </Box>
                <Box sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <Box sx={{ width: `${nodeRam}%`, height: '100%', borderRadius: 3, bgcolor: getGaugeColor(nodeRam), transition: 'width 0.6s ease' }} />
                </Box>
              </Box>
              <Typography sx={{ fontSize: 8, fontFamily: '"JetBrains Mono", monospace', opacity: 0.755, width: 50, textAlign: 'right' }}>
                {nodeCpu}% {nodeRam}%
              </Typography>
            </Box>
          )
        })}
      </Box>

      {/* Footer: migrations + recs */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7 }}>
        <Typography sx={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace' }}>
          {onlineNodes.length} node{onlineNodes.length !== 1 ? 's' : ''}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
          {activeMigrations > 0 && (
            <span title={`${activeMigrations} active migration(s)`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <i className='ri-swap-line' style={{ fontSize: 10, color: theme.palette.primary.main }} />
              <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: theme.palette.primary.main, fontWeight: 700 }}>{activeMigrations}</span>
            </span>
          )}
          {recommendations > 0 && (
            <span title={`${recommendations} recommendation(s)`} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <i className='ri-lightbulb-line' style={{ fontSize: 10, color: theme.palette.warning.main }} />
              <span style={{ fontSize: 9, fontFamily: '"JetBrains Mono", monospace', color: theme.palette.warning.main, fontWeight: 700 }}>{recommendations}</span>
            </span>
          )}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Main Widget ─────────────────────────────────────────────────────────────
function DrsStatusWidget({ data, loading, config }) {
  const t = useTranslations()
  const theme = useTheme()
  const { isEnterprise } = useLicense()
  const { data: status, isLoading: statusLoading } = useDRSStatus(isEnterprise)
  const { data: metricsData, isLoading: metricsLoading } = useDRSMetrics(isEnterprise)

  // Map connection IDs to cluster names from dashboard data
  const clusterMap = useMemo(() => {
    const map = {}
    for (const c of (data?.clusters || [])) {
      map[c.id] = c
    }
    return map
  }, [data?.clusters])

  if (!isEnterprise) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 2, textAlign: 'center' }}>
        <i className='ri-vip-crown-fill' style={{ fontSize: 32, color: 'var(--mui-palette-warning-main)', marginBottom: 8 }} />
        <Typography variant='caption' sx={{ opacity: 0.75 }}>Enterprise</Typography>
      </Box>
    )
  }

  if (statusLoading || metricsLoading) {
    return (
      <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  // Only show actual clusters (not standalone nodes)
  const clusterIds = metricsData
    ? Object.keys(metricsData).filter(id => {
        const info = clusterMap[id]
        return !info || info.isCluster || info.nodes > 1
      })
    : []

  if (clusterIds.length === 0) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.755 }}>
        <i className='ri-swap-line' style={{ fontSize: 28, marginBottom: 4 }} />
        <Typography variant='caption'>{t('common.noData')}</Typography>
      </Box>
    )
  }

  return (
    <Box sx={{
      height: '100%', overflow: 'auto',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
      gap: 1, p: 0.5, alignContent: 'start',
    }}>
      {clusterIds.map((clusterId) => (
        <DrsClusterCard
          key={clusterId}
          clusterId={clusterId}
          clusterMetrics={metricsData[clusterId]}
          clusterInfo={clusterMap[clusterId]}
          drsStatus={status}
          theme={theme}
          t={t}
        />
      ))}
    </Box>
  )
}

export default React.memo(DrsStatusWidget)
