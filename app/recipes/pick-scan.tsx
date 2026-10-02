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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ScanCard } from '@/components/ScanCard';
import { IconButton } from '@/components/IconButton';
import AddIcon from '@/assets/icons/meal-plan/add.svg';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useDraftRecipe } from '@/lib/draftRecipeContext';
import { snapshotFromScanAsync } from '@/lib/recipes';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import { LottieLoader } from '@/components/LottieLoader';
import { HeaderEdge, HEADER_EDGE_AT_TOP, useScrollEdge } from '@/components/HeaderEdge';
import { safeBack } from '@/lib/safeBack';
import type { Scan } from '@/lib/types';

export default function PickScanScreen() {
  const { session } = useAuth();
  const draft = useDraftRecipe();
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyScanId, setBusyScanId] = useState<string | null>(null);
  const edge = useScrollEdge();

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
          <LottieLoader type="loading" fullScreen={false} />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            No scans yet. Scan a product first to add it to a recipe.
          </Text>
        </View>
      ) : (
        <View style={styles.listWrap}>
          <FlatList
            {...edge.scrollProps}
            data={scans}
            keyExtractor={(s) => s.id}
            contentContainerStyle={{
              paddingHorizontal: Spacing.s,
              paddingBottom: insets.bottom + Spacing.l,
            }}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              // The Scan History card, with a + like the meal planner's
              // Add from scan history.
              <ScanCard
                scan={item}
                onPress={() => handlePick(item)}
                disabled={Boolean(busyScanId)}
                dimmed={busyScanId === item.id}
                trailing={
                  <IconButton
                    size="small"
                    variant="onWhite"
                    icon={
                      busyScanId === item.id ? (
                        <ActivityIndicator size="small" color={Colors.secondary} />
                      ) : (
                        <AddIcon width={20} height={20} />
                      )
                    }
                    onPress={() => handlePick(item)}
                    disabled={Boolean(busyScanId)}
                    accessibilityLabel={`Add ${item.product_name}`}
                  />
                }
              />
            )}
          />
          <HeaderEdge scrollY={edge.scrollY} style={HEADER_EDGE_AT_TOP} />
        </View>
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
  listWrap: {
    flex: 1,
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
});
