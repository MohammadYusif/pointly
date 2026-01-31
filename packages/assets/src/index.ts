// React SVG Components
export {
  PointlyLogo,
  WhiteLogo,
  BlackLogo,
  DotLogo,
  MonochromeLogo,
} from './components';

// PNG paths (for use with next/image or img tags)
export const logos = {
  pointly: '/logos/pointlylogo.png',
  black: '/logos/black_logo.png',
  white: '/logos/white_logo.png',
  dot: '/logos/dot_logo.png',
  monochrome: '/logos/monochrome_logo.png',
} as const;

// Logo colors for theming
export const brandColors = {
  primary: '#08B0A2', // Teal/Green
  secondary: '#263452', // Dark Blue
  accent: '#05A1A5', // Cyan
  light: '#FDFDFD',
  dark: '#21242D',
} as const;
