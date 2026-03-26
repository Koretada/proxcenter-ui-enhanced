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
      root: {
        '& .MuiAlert-root:not(.MuiAlert-filled):not(.MuiAlert-outlined)': {
          variant: 'filled'
        },
        '& .MuiAlert-standard': {
          backgroundImage: 'none',
          '&.MuiAlert-standardSuccess': {
            backgroundColor: 'var(--mui-palette-success-main)',
            color: 'var(--mui-palette-success-contrastText)',
            '& .MuiAlert-icon': { color: 'inherit' }
          },
          '&.MuiAlert-standardError': {
            backgroundColor: 'var(--mui-palette-error-main)',
            color: 'var(--mui-palette-error-contrastText)',
            '& .MuiAlert-icon': { color: 'inherit' }
          },
          '&.MuiAlert-standardWarning': {
            backgroundColor: 'var(--mui-palette-warning-main)',
            color: 'var(--mui-palette-warning-contrastText)',
            '& .MuiAlert-icon': { color: 'inherit' }
          },
          '&.MuiAlert-standardInfo': {
            backgroundColor: 'var(--mui-palette-info-main)',
            color: 'var(--mui-palette-info-contrastText)',
            '& .MuiAlert-icon': { color: 'inherit' }
          }
        }
      }
    }
  }
})

export default snackbar
