'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Box, Chip, Typography, useTheme } from '@mui/material'

function ClustersListWidget({ data, loading }) {
  const t = useTranslations()
  const router = useRouter()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const clusters = (data?.clusters || []).filter(c => c.isCluster)

  if (clusters.length === 0) {
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
          justifyContent: 'center',
        }}
      >
        <Typography variant='caption' sx={{ opacity: 0.65 }}>{t('common.noData')}</Typography>
      </Box>
    )
  }

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
        flexDirection: 'column',
        gap: 0.5,
        overflow: 'auto',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': {
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.15)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        },
      }}
    >
      {clusters.map((cluster, idx) => (
        <Box
          key={idx}
          onClick={() => cluster.id && router.push(`/infrastructure/inventory?selectType=cluster&selectId=${cluster.id}`)}
          sx={{
            p: 1.5, borderRadius: 1.5,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
            cursor: cluster.id ? 'pointer' : 'default',
            '&:hover': cluster.id ? { bgcolor: 'rgba(255,255,255,0.05)' } : {},
          }}
        >
          <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, flexShrink: 0 }}>
            <i className='ri-server-fill' style={{ fontSize: 18, opacity: 0.8 }} />
            <Box sx={{ position: 'absolute', bottom: -1, right: -1, width: 7, height: 7, borderRadius: '50%', bgcolor: cluster.onlineNodes > 0 ? '#4caf50' : '#f44336', border: '1.5px solid', borderColor: isDark ? 'rgba(255,255,255,0.03)' : '#1e1e2d' }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant='body2' sx={{ fontWeight: 700, fontSize: 13 }}>{cluster.name}</Typography>
            <Typography variant='caption' sx={{ opacity: 0.65, fontSize: 10 }}>
              {cluster.nodes} {t('inventory.nodes').toLowerCase()} &bull; {cluster.onlineNodes} {t('common.online').toLowerCase()}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
            {cluster.quorum && (
              <Chip
                size='small'
                label='Quorum'
                color={cluster.quorum.quorate ? 'success' : 'error'}
                sx={{ fontSize: 9, height: 18 }}
              />
            )}
            {cluster.cephHealth && (
              <Chip
                size='small'
                label={cluster.cephHealth.replaceAll('HEALTH_', '')}
                color={cluster.cephHealth === 'HEALTH_OK' ? 'success' : cluster.cephHealth === 'HEALTH_WARN' ? 'warning' : 'error'}
                sx={{ fontSize: 9, height: 18 }}
              />
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default React.memo(ClustersListWidget)
