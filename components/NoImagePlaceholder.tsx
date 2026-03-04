import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Radius } from '@/constants/theme';

const ICON_COLOR = '#aad4cd';

/**
 * "No image" placeholder matching Figma node 4242-5268.
 * Fills its parent container — wrap in a sized View.
 */
export function NoImagePlaceholder() {
  return (
    <View style={styles.container}>
      <Svg width={16} height={16} viewBox="0 0 17.5 17.5" fill="none">
        <Path
          d="M10.8012 10.7964C10.6125 11.1072 10.3556 11.3711 10.0499 11.568C9.74428 11.765 9.39787 11.89 9.03686 11.9335C8.67585 11.977 8.30968 11.9378 7.966 11.8191C7.62231 11.7003 7.31011 11.505 7.05296 11.248C6.79581 10.9909 6.60044 10.6787 6.4816 10.3351C6.36276 9.9914 6.32356 9.62523 6.36697 9.26421C6.41037 8.90319 6.53524 8.55675 6.73215 8.25106C6.92905 7.94537 7.19284 7.68841 7.5036 7.4996M0.75 0.75L16.75 16.75M15.15 15.15H2.35C1.92565 15.15 1.51869 14.9814 1.21863 14.6814C0.918571 14.3813 0.75 13.9743 0.75 13.55V6.35C0.75 5.92565 0.918571 5.51869 1.21863 5.21863C1.51869 4.91857 1.92565 4.75 2.35 4.75H3.9476C4.17343 4.7501 4.39673 4.70238 4.6028 4.61M6.906 2.3692C6.98778 2.35642 7.07043 2.35 7.1532 2.35H10.3476C10.6362 2.35 10.9195 2.42807 11.1674 2.57595C11.4152 2.72383 11.6185 2.93601 11.7556 3.19L12.1444 3.91C12.2815 4.16399 12.4848 4.37617 12.7326 4.52405C12.9805 4.67193 13.2638 4.75 13.5524 4.75H15.15C15.5743 4.75 15.9813 4.91857 16.2814 5.21863C16.5814 5.51869 16.75 5.92565 16.75 6.35V12.2252"
          stroke={ICON_COLOR}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      <Text style={styles.label}>No image</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: Radius.m,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: ICON_COLOR,
    textAlign: 'center',
    letterSpacing: -0.18,
  },
});
