/**
 * ScanCard — a scanned product, per the Figma "Scanned Food Row"
 * (dashboard 5916:16031): 60px image, brand over an 18px name, the
 * Nutri-score grade in a pill, and a chevron.
 *
 * Used by the scan history list (wrapped in a swipe-to-delete row), the
 * dashboard's Scanned items and the meal planner's "Add from scan history"
 * (with a + in place of the chevron). Open a scan with openScanResult
 * (lib/openScan).
 */
import type { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Colors, Radius } from '@/constants/theme';
import { sentenceCase } from '@/lib/text';
import { NoImagePlaceholder } from '@/components/NoImagePlaceholder';
import { MenuChevronRightIcon } from '@/components/MenuIcons';
import type { Scan } from '@/lib/types';

const NUTRISCORE_COLORS: Record<string, string> = {
  a: '#009a1f',
  b: '#b8d828',
  c: '#ffc72d',
  d: '#ff8736',
  e: '#ff3f42',
};

export function ScanCard({
  scan,
  onPress,
  trailing,
  disabled = false,
  dimmed = false,
}: {
  scan: Scan;
  onPress: () => void;
  /** Replaces the chevron, e.g. a + to add it somewhere. */
  trailing?: ReactNode;
  disabled?: boolean;
  /** Fades the card, e.g. while it's being added. */
  dimmed?: boolean;
}) {
  const grade = scan.nutriscore_grade?.toLowerCase();
  const gradeColor = grade ? NUTRISCORE_COLORS[grade] : null;

  return (
    <TouchableOpacity
      style={[styles.card, dimmed && styles.dimmed]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={[scan.brand, scan.product_name, grade ? `Nutri-score ${grade.toUpperCase()}` : null]
        .filter(Boolean)
        .join(', ')}
    >
      {scan.image_url ? (
        <Image source={{ uri: scan.image_url }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <NoImagePlaceholder />
        </View>
      )}
      <View style={styles.text}>
        {scan.brand ? (
          <Text style={styles.brand} numberOfLines={1}>
            {sentenceCase(scan.brand)}
          </Text>
        ) : null}
        <Text style={styles.name} numberOfLines={2}>
          {sentenceCase(scan.product_name)}
        </Text>
      </View>
      {gradeColor ? (
        <View style={[styles.grade, { backgroundColor: gradeColor }]}>
          <Text style={styles.gradeText}>{grade!.toUpperCase()}</Text>
        </View>
      ) : null}
      {trailing ?? (
        <View style={styles.chevron}>
          <MenuChevronRightIcon color={Colors.primary} size={14} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: Radius.l,
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
  },
  dimmed: { opacity: 0.6 },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, justifyContent: 'center' },
  brand: {
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
  },
  // Heading 5 — 18px since the Figma update
  name: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  // 20px icon slot, as in the Figma
  chevron: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  // Figma "Nutritional Value/Simplified": 24×36 pill, 2px white ring
  grade: {
    width: 24,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: {
    color: '#fff',
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.29)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
