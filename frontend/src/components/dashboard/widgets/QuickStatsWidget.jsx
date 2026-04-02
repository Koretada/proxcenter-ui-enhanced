'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Box, Typography, useTheme } from '@mui/material'

function QuickStatsWidget({ data, loading }) {
  const t = useTranslations()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const summary = data?.summary || {}
  const pbs = data?.pbs || {}
  const alertsSummary = data?.alertsSummary || {}

  const stats = [
    {
      label: t('dashboard.widgets.nodes'),
      value: `${summary.nodesOnline || 0}/${summary.nodes || 0}`,
      icon: 'ri-server-line',
      color: summary.nodesOffline > 0 ? '#f44336' : '#4caf50'
    },
    {
      label: t('dashboard.widgets.vms'),
      value: `${summary.vmsRunning || 0}/${summary.vmsTotal || 0}`,
      icon: 'ri-computer-line',
      color: '#2196f3'
    },
    {
      label: 'LXC',
      value: `${summary.lxcRunning || 0}/${summary.lxcTotal || 0}`,
      icon: 'ri-instance-line',
      color: '#9c27b0'
    },
    {
      label: t('monitoring.cpu'),
      value: `${summary.cpuPct || 0}%`,
      icon: 'ri-cpu-line',
      color: (summary.cpuPct || 0) > 80 ? '#f44336' : '#4caf50'
    },
    {
      label: t('monitoring.memory'),
      value: `${summary.ramPct || 0}%`,
      icon: 'ri-ram-line',
      color: (summary.ramPct || 0) > 80 ? '#f44336' : '#4caf50'
    },
    {
      label: t('dashboard.widgets.alerts'),
      value: (alertsSummary.crit || 0) + (alertsSummary.warn || 0),
      icon: 'ri-alarm-warning-line',
      color: alertsSummary.crit > 0 ? '#f44336' : alertsSummary.warn > 0 ? '#ff9800' : '#4caf50'
    },
  ]

  return (
    <Box
      {...(!isDark && { 'data-dark': '' })}
      sx={{
        height: '100%',
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#1e1e2d',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        borderRadius: 2.5,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
        gap: 1,
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
      }}
    >
      {stats.map((stat, idx) => (
        <Box key={idx} sx={{ textAlign: 'center', minWidth: 60 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
            <i className={stat.icon} style={{ fontSize: 14, color: stat.color }} />
            <Typography variant='body1' sx={{ fontWeight: 800, color: stat.color, fontFamily: '"JetBrains Mono", monospace' }}>
              {stat.value}
            </Typography>
          </Box>
          <Typography variant='caption' sx={{ opacity: 0.65, fontSize: 9 }}>
            {stat.label}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

export default React.memo(QuickStatsWidget)
