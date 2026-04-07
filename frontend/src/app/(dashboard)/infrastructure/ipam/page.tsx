'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Box, Card, CardContent, Typography, Grid, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Chip, Accordion, AccordionSummary, AccordionDetails,
  Tooltip, IconButton
} from '@mui/material'
import { useTranslations } from 'next-intl'
import { usePageTitle } from '@/contexts/PageTitleContext'

// Types
type IPInfo = {
  ip: string
  cidr: number
  proto: 'ipv4' | 'ipv6'
  vmId: string | number
  vmName: string
  vmType: 'qemu' | 'lxc'
  node: string
  connectionId: string
  connectionName: string
  interface: string
  isDhcp: boolean
}

type SubnetGroup = {
  network: string
  ips: IPInfo[]
}

type IpamData = {
  subnets: SubnetGroup[]
  duplicates: IPInfo[]
  stats: {
    totalIps: number
    totalSubnets: number
    totalDuplicates: number
  }
}

export default function IpamPage() {
  const t = useTranslations()
  const { setPageInfo } = usePageTitle() as any
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<IpamData | null>(null)
  const [search, setSearch] = useState('')

  // Set page title
  useEffect(() => {
    if (setPageInfo) {
      setPageInfo(t('ipam.title'), t('ipam.subtitle'), 'ri-hashtag')
    }
    return () => {
      if (setPageInfo) setPageInfo('', '', '')
    }
  }, [setPageInfo, t])

  // Fetch data
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/ipam')
      if (!res.ok) throw new Error('Failed to fetch IPAM data')
      const json = await res.json()
      setData(json.data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter data based on search
  const filteredSubnets = useMemo(() => {
    if (!data) return []
    if (!search.trim()) return data.subnets

    const s = search.toLowerCase()
    return data.subnets.map(subnet => {
      // Check if network matches
      if (subnet.network.toLowerCase().includes(s)) return subnet

      // Check if any IP or VM matches
      const filteredIps = subnet.ips.filter(ip =>
        ip.ip.toLowerCase().includes(s) ||
        ip.vmName.toLowerCase().includes(s) ||
        String(ip.vmId).includes(s) ||
        ip.node.toLowerCase().includes(s)
      )

      if (filteredIps.length > 0) {
        return { ...subnet, ips: filteredIps }
      }
      return null
    }).filter(Boolean) as SubnetGroup[]
  }, [data, search])

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Stats row */}
      <Grid container spacing={6}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, var(--mui-palette-primary-main) 0%, var(--mui-palette-primary-dark) 100%)',
            color: 'white',
            boxShadow: '0 8px 32px 0 rgba(var(--mui-palette-primary-mainChannel), 0.3)',
            borderRadius: '16px',
            border: 'none'
          }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: '24px !important' }}>
              <Box sx={{ p: 3, borderRadius: '12px', bgcolor: 'rgba(255, 255, 255, 0.2)', mr: 4, display: 'flex' }}>
                <i className="ri-hashtag" style={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: 'white' }}>{data?.stats.totalIps}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>{t('ipam.stats.totalIps')}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            bgcolor: 'background.paper',
            borderRadius: '16px',
            border: '1px solid var(--mui-palette-divider)',
            boxShadow: 'none'
          }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: '24px !important' }}>
              <Box sx={{ p: 3, borderRadius: '12px', bgcolor: 'rgba(var(--mui-palette-info-mainChannel), 0.1)', mr: 4, color: 'info.main', display: 'flex' }}>
                <i className="ri-mind-map" style={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>{data?.stats.totalSubnets}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{t('ipam.stats.subnets')}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{
            bgcolor: data?.stats.totalDuplicates ? 'rgba(var(--mui-palette-error-mainChannel), 0.05)' : 'background.paper',
            border: `1px solid ${data?.stats.totalDuplicates ? 'rgba(var(--mui-palette-error-mainChannel), 0.5)' : 'var(--mui-palette-divider)'}`,
            borderRadius: '16px',
            boxShadow: 'none',
            ...(data?.stats.totalDuplicates && { animation: 'pulse-error 2s infinite' })
          }}>
            <style>
              {`
                @keyframes pulse-error {
                  0% { box-shadow: 0 0 0 0 rgba(var(--mui-palette-error-mainChannel), 0.2); }
                  70% { box-shadow: 0 0 0 10px rgba(var(--mui-palette-error-mainChannel), 0); }
                  100% { box-shadow: 0 0 0 0 rgba(var(--mui-palette-error-mainChannel), 0); }
                }
              `}
            </style>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: '24px !important' }}>
              <Box sx={{ p: 3, borderRadius: '12px', bgcolor: data?.stats.totalDuplicates ? 'error.main' : 'rgba(var(--mui-palette-error-mainChannel), 0.1)', mr: 4, color: data?.stats.totalDuplicates ? 'white' : 'error.main', display: 'flex' }}>
                <i className="ri-error-warning-line" style={{ fontSize: 24 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }} color={data?.stats.totalDuplicates ? 'error.main' : 'inherit'}>
                  {data?.stats.totalDuplicates}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{t('ipam.stats.duplicatesCount')}</Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Bar */}
      <Box sx={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <TextField
          fullWidth
          variant="outlined"
          size="medium"
          placeholder={t('ipam.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: 'background.paper',
              '& fieldset': { borderColor: 'var(--mui-palette-divider)' }
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <i className="ri-search-line" style={{ fontSize: 20, opacity: 0.5 }} />
              </InputAdornment>
            ),
          }}
        />
        <Tooltip title={t('common.refresh')}>
          <IconButton
            onClick={fetchData}
            sx={{
              p: 3,
              borderRadius: '12px',
              border: '1px solid var(--mui-palette-divider)',
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'action.hover' }
            }}
          >
            <i className="ri-refresh-line" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Subnets List */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {filteredSubnets.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 20, bgcolor: 'action.hover', borderRadius: '16px', border: '2px dashed var(--mui-palette-divider)' }}>
            <i className="ri-find-replace-line" style={{ fontSize: 48, opacity: 0.2, marginBottom: 16, display: 'block' }} />
            <Typography color="text.secondary" variant="h6">{t('ipam.noIps')}</Typography>
          </Box>
        ) : (
          filteredSubnets.map((subnet, idx) => {
            const hasDuplicateInSubnet = subnet.ips.some(ip =>
              !ip.isDhcp && data?.duplicates.some(d => d.ip === ip.ip && d.cidr === ip.cidr && (d.vmId !== ip.vmId || d.connectionId !== ip.connectionId))
            )

            return (
              <Accordion
                key={subnet.network}
                defaultExpanded={filteredSubnets.length < 5 || idx === 0 || hasDuplicateInSubnet}
                sx={{
                  borderRadius: '16px !important',
                  '&:before': { display: 'none' },
                  boxShadow: 'none',
                  border: '1px solid var(--mui-palette-divider)',
                  bgcolor: 'background.paper',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease',
                  '&:hover': { borderColor: 'var(--mui-palette-primary-main)' },
                  ...(hasDuplicateInSubnet && { borderLeft: '4px solid var(--mui-palette-error-main)' })
                }}
              >
                <AccordionSummary expandIcon={<i className="ri-arrow-down-s-line" />} sx={{ px: 6, py: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <i className="ri-node-tree" style={{ color: 'var(--mui-palette-primary-main)', fontSize: 20 }} />
                      <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: '-0.5px' }}>{subnet.network}</Typography>
                    </Box>
                    <Chip
                      size="small"
                      label={`${subnet.ips.length} IPs`}
                      sx={{ fontWeight: 700, bgcolor: 'action.hover', border: '1px solid var(--mui-palette-divider)' }}
                    />
                    {hasDuplicateInSubnet && (
                      <Chip
                        size="small"
                        label={t('ipam.table.duplicate')}
                        color="error"
                        variant="tonal"
                        icon={<i className="ri-error-warning-fill" />}
                        sx={{ fontWeight: 700 }}
                      />
                    )}
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, borderTop: '1px solid var(--mui-palette-divider)' }}>
                  <TableContainer>
                    <Table size="medium">
                      <TableHead sx={{ bgcolor: 'rgba(var(--mui-palette-action-hoverChannel), 0.5)' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, pl: 6 }}>{t('ipam.table.ip')}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{t('ipam.table.vm')}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{t('ipam.table.interface')}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{t('ipam.table.node')}</TableCell>
                          <TableCell sx={{ fontWeight: 700, pr: 6 }}>{t('ipam.table.cluster')}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {subnet.ips.map((ip, i) => {
                          const isDuplicate = !ip.isDhcp && data?.duplicates.some(d =>
                            d.ip === ip.ip && d.cidr === ip.cidr && (d.vmId !== ip.vmId || d.connectionId !== ip.connectionId)
                          )

                          return (
                            <TableRow
                              key={`${ip.connectionId}:${ip.vmId}:${ip.interface}:${i}`}
                              hover
                              sx={{
                                '&:last-child td': { borderBottom: 0 },
                                bgcolor: isDuplicate ? 'rgba(var(--mui-palette-error-mainChannel), 0.02)' : 'transparent'
                              }}
                            >
                              <TableCell sx={{ pl: 6 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <Typography sx={{
                                    fontWeight: 700,
                                    fontSize: '0.95rem',
                                    color: isDuplicate ? 'error.main' : 'text.primary',
                                    fontFamily: 'var(--font-mono, monospace)'
                                  }}>
                                    {ip.ip}{!ip.isDhcp && ip.cidr !== 0 && `/${ip.cidr}`}
                                  </Typography>
                                  {ip.isDhcp && <Chip label="DHCP" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }} />}
                                  {isDuplicate && (
                                    <Tooltip title={t('ipam.duplicateAlert')}>
                                      <i className="ri-error-warning-fill" style={{ color: 'var(--mui-palette-error-main)', fontSize: 20 }} />
                                    </Tooltip>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{ip.vmName}</Typography>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <i className={ip.vmType === 'qemu' ? 'ri-computer-line' : 'ri-box-3-line'} style={{ fontSize: 12 }} />
                                    ID {ip.vmId}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ opacity: 0.7, fontFamily: 'var(--font-mono, monospace)' }}>{ip.interface}</Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{ip.node}</Typography>
                              </TableCell>
                              <TableCell sx={{ pr: 6 }}>
                                <Chip
                                  label={ip.connectionName}
                                  size="small"
                                  variant="tonal"
                                  color="primary"
                                  sx={{ fontWeight: 600, borderRadius: '6px' }}
                                />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            )
          })
        )}
      </Box>
    </Box>
  )
}
