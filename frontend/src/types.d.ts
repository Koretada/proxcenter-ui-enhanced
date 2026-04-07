// CSS module declarations
declare module '*.css'

declare module 'xterm/css/xterm.css'

// MUI Component Augmentations
import '@mui/material/Chip'

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    tonal: true
  }
}
