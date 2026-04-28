import { Platform } from 'react-native';

export const Colors = {
  background: '#e2f1ee',
  primary: '#023432',
  secondary: '#00776f',
  accent: '#3b9586',
  avocadoSkin: '#002923',
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
    halal: '#8bc9a3',
    lowFiber: '#ffe8c4',
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


// Shadow tokens — iOS only.
//
// React Native 0.76+ on Android (new architecture / Fabric) now
// renders the iOS-style shadow props (shadowColor/Offset/Opacity/
// Radius) AS WELL AS elevation. Both are rendered as a separate
// compositing layer outside the React tree, and that layer ignores
// the parent's animated opacity — so any fade transition (page
// load, step animator, in-screen Animated.View) leaked visible
// grey halos around every shadowed card. Elevation alone wasn't
// the culprit; the iOS shadow props now hit the same path on
// Android Fabric.
//
// Fix: emit zero shadow props on Android. Cards remain defined by
// their borders + surface colour. iOS keeps its drop shadows since
// CALayer shadows on iOS fade cleanly with parent opacity.
const isIOS = Platform.OS === 'ios';

export const Shadows = {
  level2: isIOS
    ? {
        shadowColor: 'rgba(68,71,112)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      }
    : {},
  level3: isIOS
    ? {
        shadowColor: 'rgba(68,71,112)',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      }
    : {},
  level4: isIOS
    ? {
        shadowColor: 'rgba(68,71,112)',
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.05,
        shadowRadius: 24,
      }
    : {},
};
