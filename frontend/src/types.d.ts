// CSS module declarations
declare module '*.css' {
  const content: { [className: string]: string }
  export default content
}

declare module 'xterm/css/xterm.css'

// MUI Component Augmentations
import '@mui/material/Chip'

declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    tonal: true
  }
}
