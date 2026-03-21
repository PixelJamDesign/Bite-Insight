import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors } from '@/constants/theme';

type PlusBadgeProps = {
  /** 'default' = 16px text, 'small' = 12px text (for dropdowns/tags) */
  size?: 'default' | 'small';
};

export function PlusBadge({ size = 'default' }: PlusBadgeProps) {
  const isSmall = size === 'small';
  const iconSize = isSmall ? 6 : 8;

  return (
    <View style={[styles.badge, isSmall && styles.badgeSmall]}>
      <Text style={[styles.text, isSmall && styles.textSmall]}>plus</Text>
      <Svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 8 8"
        fill="none"
        style={isSmall ? styles.iconSmall : styles.icon}
      >
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
  badgeSmall: {
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderRadius: 4,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 18,
    letterSpacing: -0.32,
  },
  textSmall: {
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: -0.24,
  },
  icon: {
    marginTop: 1,
    marginLeft: 1,
  },
  iconSmall: {
    marginTop: 1,
    marginLeft: 1,
  },
});
