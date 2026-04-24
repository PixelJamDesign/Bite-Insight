/**
 * Pick Scan — full-screen scan-history picker for adding an ingredient
 * to the draft recipe.
 *
 * Replaces the previous ScanPickerSheet modal. Using a screen instead
 * of a modal avoids iOS's double-modal freeze when opened from the
 * AddIngredientSheet (which is itself a Modal).
 *
 * On tap: builds a ProductSnapshot via snapshotFromScanAsync(), adds
 * the ingredient to the shared draft recipe context, then router.back()s
 * to the recipe builder.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useDraftRecipe } from '@/lib/draftRecipeContext';
import { snapshotFromScanAsync } from '@/lib/recipes';
import { Colors, Spacing, Radius, Typography } from '@/constants/theme';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import { safeBack } from '@/lib/safeBack';
import type { Scan } from '@/lib/types';

export default function PickScanScreen() {
  const { session } = useAuth();
  const draft = useDraftRecipe();
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyScanId, setBusyScanId] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('scanned_at', { ascending: false })
        .limit(50);
      if (mounted) {
        setScans((data ?? []) as Scan[]);
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  async function handlePick(scan: Scan) {
    if (busyScanId) return; // guard against double-taps
    setBusyScanId(scan.id);
    try {
      const snapshot = await snapshotFromScanAsync(scan);
      draft.addIngredient({
        barcode: scan.barcode,
        scan_id: scan.id,
        quantity_value: 100,
        quantity_unit: 'g',
        quantity_display: null,
        product_snapshot: snapshot,
      });
      safeBack();
    } catch (e) {
      console.warn('[pick-scan] failed to add ingredient:', e);
      setBusyScanId(null);
    }
  }

  return (
    <View style={[styles.safe, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeBack()}
          style={styles.backBtn}
          activeOpacity={0.85}
          hitSlop={8}
        >
          <MenuArrowLeftIcon color={Colors.primary} size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Add from scan history</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.secondary} />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No scans yet. Scan a product first to add it to a recipe.
          </Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(s) => s.id}
          contentContainerStyle={{
            paddingHorizontal: Spacing.s,
            paddingBottom: insets.bottom + Spacing.l,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item }) => {
            const isBusy = busyScanId === item.id;
            return (
              <TouchableOpacity
                style={[styles.row, isBusy && styles.rowBusy]}
                onPress={() => handlePick(item)}
                activeOpacity={0.85}
                disabled={Boolean(busyScanId)}
              >
                <View style={styles.thumb}>
                  {item.image_url ? (
                    <Image source={{ uri: item.image_url }} style={styles.thumbImage} />
                  ) : (
                    <Ionicons name="nutrition-outline" size={20} color={Colors.secondary} />
                  )}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  {item.brand && (
                    <Text style={styles.brand} numberOfLines={1}>
                      {item.brand}
                    </Text>
                  )}
                </View>
                {isBusy ? (
                  <ActivityIndicator color={Colors.secondary} />
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.xs,
    gap: Spacing.s,
  },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.h4,
    color: Colors.primary,
    flex: 1,
    textAlign: 'center',
  },
  loadingWrap: {
    padding: Spacing.l,
    alignItems: 'center',
  },
  emptyWrap: {
    padding: Spacing.m,
  },
  emptyText: {
    ...Typography.bodyRegular,
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface.secondary,
    borderWidth: 1,
    borderColor: '#aad4cd',
    borderRadius: Radius.l,
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
  },
  rowBusy: { opacity: 0.6 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.m,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: { width: '100%', height: '100%' },
  info: { flex: 1, gap: 2 },
  name: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  brand: {
    fontSize: 12,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
});
