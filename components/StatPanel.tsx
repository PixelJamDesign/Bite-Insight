import { View, Text, Image, StyleSheet, ImageSourcePropType, TouchableOpacity } from 'react-native';
import { Colors, Shadows } from '@/constants/theme';
import { PlusBadge } from './PlusBadge';

interface StatPanelProps {
  count: number;
  label: string;
  isPlusFeature?: boolean;
  imageSource?: ImageSourcePropType;
  onPress?: () => void;
}

export function StatPanel({ count, label, isPlusFeature = false, imageSource, onPress }: StatPanelProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={onPress ? 0.75 : 1} disabled={!onPress}>
      {isPlusFeature && (
        <View style={styles.plusBadgeWrap}>
          <PlusBadge />
        </View>
      )}
      {imageSource && (
        <View style={styles.imageWrapper}>
          <Image source={imageSource} style={styles.image} resizeMode="contain" />
        </View>
      )}
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    paddingHorizontal: 16,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 4,
    ...Shadows.level3,
  },
  plusBadgeWrap: {
    position: 'absolute',
    top: 7,
    right: 7,
  },
  imageWrapper: {
    height: 60,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  image: {
    width: '100%',
    height: 60,
  },
  count: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
    lineHeight: 17,
    textAlign: 'center',
  },
});
