'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Button, Typography } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Component Imports
import Navigation from './Navigation'
import NavbarContent from './NavbarContent'
import BurgerMenu from './BurgerMenu'
import Navbar from '@layouts/components/horizontal/Navbar'
import LayoutHeader from '@layouts/components/horizontal/Header'
import { LogoIcon } from '@components/layout/shared/Logo'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

const Header = () => {
  const { isBreakpointReached } = useHorizontalNav()
  const router = useRouter()
  const theme = useTheme()

  // Burger menu state
  const [burgerAnchor, setBurgerAnchor] = useState(null)

  const accentColor = theme.palette.primary.main

  return (
    <>
      <LayoutHeader>
        <Navbar>
          {/* Logo + burger on the left */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, pl: 2 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                cursor: 'pointer',
                color: 'text.primary'
              }}
              onClick={() => router.push('/home')}
            >
              <LogoIcon size={26} accentColor={accentColor} />
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                ProxCenter
              </Typography>
            </Box>
            <Button
              size='small'
              onClick={(e) => setBurgerAnchor(e.currentTarget)}
              sx={{
                minWidth: 'auto',
                p: 0.75,
                borderRadius: 1,
                color: 'text.secondary',
                '&:hover': {
                  bgcolor: 'action.hover',
                  color: 'text.primary'
                }
              }}
            >
              <i className='ri-menu-line' style={{ fontSize: 20 }} />
            </Button>
          </Box>

          {/* NavbarContent (search, icons, profile, etc.) */}
          <NavbarContent />
        </Navbar>
      </LayoutHeader>
      {isBreakpointReached && <Navigation />}

      {/* Burger Menu Popover */}
      <BurgerMenu
        anchorEl={burgerAnchor}
        open={Boolean(burgerAnchor)}
        onClose={() => setBurgerAnchor(null)}
      />
    </>
  )
}

export default Header
