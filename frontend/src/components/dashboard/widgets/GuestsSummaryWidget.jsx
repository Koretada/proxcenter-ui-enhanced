'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Box, Typography } from '@mui/material'

function GuestsSummaryWidget({ data, loading }) {
  const t = useTranslations()
  const guests = data?.guests || {}

  return (
    <Box sx={{ height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, p: 1 }}>
      <Box>
        <Typography variant='caption' sx={{ opacity: 0.6, fontWeight: 600, fontSize: 10 }}>{t('dashboard.widgets.vms').toUpperCase()}</Typography>
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <i className='ri-play-fill' style={{ fontSize: 14, color: '#4caf50' }} />
            <Typography variant='body2' sx={{ fontSize: 12 }}>{t('inventory.running')}: <strong>{guests?.vms?.running || 0}</strong></Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <i className='ri-stop-fill' style={{ fontSize: 14, color: '#9e9e9e' }} />
            <Typography variant='body2' sx={{ fontSize: 12 }}>{t('inventory.stopped')}: <strong>{guests?.vms?.stopped || 0}</strong></Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <i className='ri-file-copy-fill' style={{ fontSize: 14, color: '#2196f3' }} />
            <Typography variant='body2' sx={{ fontSize: 12 }}>{t('inventory.templates')}: <strong>{guests?.vms?.templates || 0}</strong></Typography>
          </Box>
        </Box>
      </Box>
      <Box>
        <Typography variant='caption' sx={{ opacity: 0.6, fontWeight: 600, fontSize: 10 }}>{t('inventory.containers').toUpperCase()}</Typography>
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
            <i className='ri-play-fill' style={{ fontSize: 14, color: '#4caf50' }} />
            <Typography variant='body2' sx={{ fontSize: 12 }}>{t('inventory.running')}: <strong>{guests?.lxc?.running || 0}</strong></Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <i className='ri-stop-fill' style={{ fontSize: 14, color: '#9e9e9e' }} />
            <Typography variant='body2' sx={{ fontSize: 12 }}>{t('inventory.stopped')}: <strong>{guests?.lxc?.stopped || 0}</strong></Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default React.memo(GuestsSummaryWidget)
