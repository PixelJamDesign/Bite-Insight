export const Colors = {
  background: '#e2f1ee',
  primary: '#023432',
  secondary: '#00776f',
  accent: '#3b9586',
  surface: {
    secondary: '#ffffff',
    tertiary: '#f1f8f7',
    contrast: '#023432',
  },
  status: {
    negative: '#ff3f42',
    positive: '#3b9586',
  },
  dietary: {
    diabetic: '#b8d828',
    keto: '#ffa569',
    glutenFree: '#ff7779',
    vegan: '#a8d5a2',
    vegetarian: '#c8e6c9',
    lactose: '#fff9c4',
    pescatarian: '#b3e5fc',
    kosher: '#d4b8e0',
  },
  stroke: {
    primary: '#ffffff',
  },
  coconut: '#ffffff',
};

export const Typography = {
  h1: { fontSize: 36, lineHeight: 44, fontWeight: '700' as const, letterSpacing: -0.72 },
  h2: { fontSize: 30, lineHeight: 36, fontWeight: '700' as const, letterSpacing: -0.6 },
  h3: { fontSize: 24, lineHeight: 30, fontWeight: '700' as const, letterSpacing: -0.48 },
  h4: { fontSize: 18, lineHeight: 24, fontWeight: '700' as const, letterSpacing: -0.36 },
  h5: { fontSize: 16, lineHeight: 20, fontWeight: '700' as const, letterSpacing: 0 },
  h6: { fontSize: 14, lineHeight: 17, fontWeight: '700' as const, letterSpacing: -0.28 },
  bodyLarge: { fontSize: 18, lineHeight: 30, fontWeight: '300' as const, letterSpacing: -0.5 },
  bodyRegular: { fontSize: 16, lineHeight: 24, fontWeight: '300' as const, letterSpacing: 0 },
  bodySmall: { fontSize: 14, lineHeight: 21, fontWeight: '300' as const, letterSpacing: -0.14 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: '700' as const, letterSpacing: -0.26 },
};

export const Spacing = {
  xxs: 4,
  xs: 8,
  s: 16,
  m: 24,
  l: 32,
  xl: 48,
};

export const Radius = {
  s: 4,
  m: 8,
  l: 16,
  full: 999,
};

export const Shadows = {
  level2: {
    shadowColor: 'rgba(68,71,112)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  level3: {
    shadowColor: 'rgba(68,71,112)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  level4: {
    shadowColor: 'rgba(68,71,112)',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
};
