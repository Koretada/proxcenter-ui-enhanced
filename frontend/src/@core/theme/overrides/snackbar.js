const snackbar = skin => ({
  MuiSnackbarContent: {
    styleOverrides: {
      root: ({ theme }) => ({
        padding: theme.spacing(0, 4),
        backgroundColor: theme.palette.mode === 'light' ? '#323232' : undefined,
        color: theme.palette.mode === 'light' ? '#fff' : undefined,
        ...(skin !== 'bordered'
          ? {
              boxShadow: 'var(--mui-customShadows-xs)'
            }
          : {
              boxShadow: 'none'
            }),
        '& .MuiSnackbarContent-message': {
          paddingBlock: theme.spacing(3)
        }
      })
    }
  },
  MuiSnackbar: {
    styleOverrides: {
      root: ({ theme }) => ({
        '& .MuiAlert-root': {
          color: '#fff',
          '& .MuiAlert-icon': { color: '#fff' },
          '& .MuiAlert-action .MuiIconButton-root': { color: '#fff' },
        },
        '& .MuiAlert-standard, & .MuiAlert-filled': {
          backgroundImage: 'none',
          '&.MuiAlert-standardSuccess, &.MuiAlert-filledSuccess': {
            backgroundColor: theme.palette.mode === 'light' ? '#2e7d32' : 'var(--mui-palette-success-main)',
          },
          '&.MuiAlert-standardError, &.MuiAlert-filledError': {
            backgroundColor: theme.palette.mode === 'light' ? '#c62828' : 'var(--mui-palette-error-main)',
          },
          '&.MuiAlert-standardWarning, &.MuiAlert-filledWarning': {
            backgroundColor: theme.palette.mode === 'light' ? '#e65100' : 'var(--mui-palette-warning-main)',
          },
          '&.MuiAlert-standardInfo, &.MuiAlert-filledInfo': {
            backgroundColor: theme.palette.mode === 'light' ? '#1565c0' : 'var(--mui-palette-info-main)',
          }
        }
      })
    }
  }
})

export default snackbar
