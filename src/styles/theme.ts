export const colors = {
  primary: '#AA4EFF',
  secondary: '#FF5E87',
  tertiary: '#4DCFFF',
  accent: '#FFFFFF',
  background: {
    primary: '#000007',
    secondary: 'rgba(255, 255, 255, 0.08)',
    tertiary: 'rgba(255, 255, 255, 0.03)',
    card: 'rgba(255, 255, 255, 0.05)',
    tag: 'rgba(125, 118, 154, 0.08)',
  },
  gradient: {
    primary: ['rgba(0, 0, 7, 0)', 'rgba(0, 0, 7, 0.74)'],
    secondary: ['rgba(50, 37, 139, 0)', 'rgba(255, 255, 255, 0.82)'],
    tertiary: ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.27)'],
    filter: ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.1)'],
  },
  text: {
    primary: '#FFFFFF',
    secondary: 'rgba(255, 255, 255, 0.6)',
    tertiary: 'rgba(255, 255, 255, 0.35)',
    accent: 'rgba(255, 255, 255, 0.18)',
    muted: 'rgba(255, 255, 255, 0.32)',
  },
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: 'rgba(3, 0, 21, 0.15)',
  },
  button: {
    primary: '#AA4EFF',
    secondary: '#FF5E87',
    tertiary: '#4DCFFF',
    disabled: '#2A2A3A',
    reset: 'rgb(21, 21, 21)',
    delete: 'rgb(0, 0, 0)',
  },
  status: {
    error: '#FF5E87',
    success: '#4FD8AF',
    warning: '#FFB547',
    info: '#4DCFFF',
  },
  divider: 'rgba(255, 255, 255, 0.08)',
  modal: {
    // background: 'rgba(1, 19, 46, 0.1)',
    // blur: 'rgba(255, 255, 255, 0.18)',
    // header: 'rgba(147, 146, 146, 0.24)',
    // content: 'rgba(0, 0, 0, 0.41)',
    // border: 'rgba(97, 97, 97, 0.18)',
    // active: 'rgba(205, 205, 205, 0.37)',
    // activeBorder: 'rgba(255, 255, 255, 0.46)',
    // activeText: 'rgba(255, 255, 255, 0.87)',

    background: 'rgba(1, 19, 46, 0.1)',
    blur: 'rgba(255, 255, 255, 0.1)',
    header: 'rgba(147, 146, 146, 0.24)',
    content: 'rgba(255, 255, 255, 0.1)',
    border: 'rgba(171, 170, 170, 0.29)',
    active: 'rgba(236, 236, 236, 0.45)',
    activeBorder: 'rgba(255, 255, 255, 0.62)',
    activeText: 'rgba(255, 255, 255, 0.87)',
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
    fontFamily: 'Inter',
  },
  h2: {
    fontSize: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
    fontFamily: 'Inter',
  },
  h3: {
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    fontFamily: 'Inter',
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
    fontFamily: 'Inter',
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    fontFamily: 'Inter',
  },
  button: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
    fontFamily: 'Inter',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    fontFamily: 'Inter',
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
  'rgba(184, 8, 8, 0.2)',
  'rgba(37, 184, 8, 0.2)',
  'rgba(8, 149, 184, 0.2)',
  'rgba(131, 8, 184, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 78, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(8, 184, 140, 0.2)',
  'rgba(169, 184, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(131, 8, 184, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 78, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(8, 184, 140, 0.2)',
  'rgba(169, 184, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(131, 8, 184, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 78, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(8, 184, 140, 0.2)',
  'rgba(169, 184, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
  'rgba(184, 8, 8, 0.2)',
];
