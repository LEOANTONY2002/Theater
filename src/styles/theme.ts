export const colors = {
  primary: '#AA4EFF',
  secondary: '#FF5E87',
  tertiary: '#4DCFFF',
  accent: '#FFFFFF',
  background: {
    primary: '#000016',
    secondary: '#15152B',
    tertiary: '#1D1D3A',
    card: '#15152B',
    tag: '#14142460',
  },
  gradient: {
    primary: ['rgba(0, 0, 14, 0)', 'rgba(0, 0, 18, 0.4)'],
    secondary: ['rgba(50, 37, 139, 0)', 'rgba(255, 255, 255, 0.82)'],
    tertiary: ['rgba(218, 218, 255, 0.48)', 'rgba(255, 255, 255, 0.81)'],
  },
  text: {
    primary: '#FFFFFF',
    secondary: '#BBBAE3',
    tertiary: 'rgba(255, 255, 255, 0.35)',
    accent: '#AA4EFF',
    muted: '#83839C',
  },
  card: {
    background: '#1d1d3a',
    border: 'rgba(170, 78, 255, 0.15)',
    highlight: 'rgba(170, 78, 255, 0.1)',
  },
  button: {
    primary: '#AA4EFF',
    secondary: '#FF5E87',
    tertiary: '#4DCFFF',
    disabled: '#2A2A3A',
    reset: '#141424',
    delete: 'rgb(212, 0, 0)',
  },
  status: {
    error: '#FF5E87',
    success: '#4FD8AF',
    warning: '#FFB547',
    info: '#4DCFFF',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  modal: {
    background: 'rgba(1, 19, 46, 0.1)',
    blur: 'rgba(255, 255, 255, 0.11)',
    header: 'rgba(1, 19, 46, 0.1)',
    content: 'rgba(1, 19, 46, 0.1)',
    border: 'rgba(170, 78, 255, 0.15)',
    active: 'rgba(197, 197, 197, 0.27)',
  },
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
    fontSize: 20,
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

export const tagGradientColors = [
  'rgba(37, 184, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(8, 149, 184, 0.12)',
  'rgba(131, 8, 184, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 78, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(8, 184, 140, 0.12)',
  'rgba(169, 184, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(131, 8, 184, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 78, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(8, 184, 140, 0.12)',
  'rgba(169, 184, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(131, 8, 184, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 78, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(8, 184, 140, 0.12)',
  'rgba(169, 184, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
  'rgba(184, 8, 8, 0.12)',
];
