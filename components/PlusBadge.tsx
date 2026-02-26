import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/theme';

export function PlusBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>plus</Text>
      <Svg width={8} height={8} viewBox="0 0 8 8" fill="none" style={styles.icon}>
        <Defs>
          <LinearGradient id="plusGrad" x1="1.374" y1="0" x2="6.852" y2="6.777" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="#00C8B3" />
            <Stop offset="1" stopColor="#00C3D0" />
          </LinearGradient>
        </Defs>
        <Path
          d="M5.21647 2.78956H8V5.21044H5.21647V8H2.74847V5.21044H0V2.78956H2.74847V0H5.21647V2.78956Z"
          fill="url(#plusGrad)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface.contrast,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 18,
    letterSpacing: -0.32,
  },
  icon: {
    marginTop: 1,
    marginLeft: 1,
  },
});
