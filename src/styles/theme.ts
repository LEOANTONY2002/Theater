export const colors = {
  primary: '#AA4EFF',
  secondary: '#FF5E87',
  tertiary: '#4DCFFF',
  accent: '#FFD54F',
  background: {
    primary: '#0A0A1A',
    secondary: '#12122A',
    tertiary: '#1D1D3A',
    gradient: ['#0A0A1A', '#1D1D3A'],
    card: 'rgba(29, 29, 58, 0.7)',
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#BBBAE3',
    accent: '#AA4EFF',
    muted: '#83839C',
  },
  card: {
    background: 'rgba(29, 29, 58, 0.8)',
    border: 'rgba(170, 78, 255, 0.15)',
    highlight: 'rgba(170, 78, 255, 0.1)',
  },
  button: {
    primary: '#AA4EFF',
    secondary: '#FF5E87',
    tertiary: '#4DCFFF',
    disabled: '#2A2A3A',
  },
  status: {
    error: '#FF5E87',
    success: '#4FD8AF',
    warning: '#FFB547',
    info: '#4DCFFF',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  xs: 2,
  sm: 6,
  md: 12,
  lg: 20,
  xl: 28,
  round: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  h3: {
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
  },
};

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4.65,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  glow: {
    shadowColor: '#AA4EFF',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
};
