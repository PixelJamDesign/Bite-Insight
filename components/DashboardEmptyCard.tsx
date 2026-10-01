/**
 * DashboardEmptyCard — the dashboard's "nothing here yet" card for a
 * section (Figma 5921:11015 / 5921:11152): a tinted card with an
 * illustration on a soft shadow, an 18px title and a short nudge. The
 * whole card is the action.
 */
import { View, Text, Image, StyleSheet, TouchableOpacity, type ImageSourcePropType } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

const SHADOW = require('@/assets/images/dashboard/empty-shadow.png');

interface Props {
  image: ImageSourcePropType;
  /** Illustration size and offset inside its 62px box, from the Figma. */
  imageStyle: { width: number; height: number; top: number; left: number };
  title: string;
  subtitle: string;
  onPress: () => void;
}

export function DashboardEmptyCard({ image, imageStyle, title, subtitle, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
    >
      <View style={styles.art}>
        <Image source={SHADOW} style={styles.shadow} />
        <Image source={image} style={[styles.image, imageStyle]} resizeMode="contain" />
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 90,
    backgroundColor: 'rgba(0,119,111,0.08)',
    borderRadius: Radius.l,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  art: { width: 62, height: 62 },
  // The blurred ellipse, exported from the Figma with its blur margin.
  shadow: { position: 'absolute', left: -4.7, top: 33.3, width: 70.4, height: 40.4 },
  image: { position: 'absolute' },
  text: { flex: 1, minWidth: 0, gap: 2 },
  title: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
  },
});
