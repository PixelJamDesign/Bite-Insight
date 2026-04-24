/**
 * ScanPickerSheet — minimal bottom sheet listing the user's recent scans
 * for selection as recipe ingredients. Placeholder UI; design will change.
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import type { Scan } from '@/lib/types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (scan: Scan) => void;
}

export function ScanPickerSheet({ visible, onClose, onPick }: Props) {
  const { session } = useAuth();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(false);
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

  useEffect(() => {
    if (!visible || !session?.user?.id) return;
    let mounted = true;
    (async () => {
      setLoading(true);
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
    return () => { mounted = false; };
  }, [visible, session?.user?.id]);

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Add from scan history</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.primary} />
            </TouchableOpacity>
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
              contentContainerStyle={{ paddingBottom: Spacing.l }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => onPick(item)}
                  activeOpacity={0.8}
                >
                  <View style={styles.thumb}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.thumbImage} />
                    ) : (
                      <Ionicons name="nutrition-outline" size={20} color={Colors.secondary} />
                    )}
                  </View>
                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>{item.product_name}</Text>
                    {item.brand && (
                      <Text style={styles.brand} numberOfLines={1}>{item.brand}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.secondary} />
                </TouchableOpacity>
              )}
            />
          )}
        </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    ...Shadows.level3,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cdd8d6',
    marginTop: 8,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.s,
    paddingBottom: Spacing.s,
  },
  title: {
    ...Typography.h4,
    color: Colors.primary,
  },
  closeBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingWrap: { padding: Spacing.l, alignItems: 'center' },
  emptyWrap: { padding: Spacing.m },
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
    paddingHorizontal: Spacing.s,
    paddingVertical: 10,
  },
  thumb: {
    width: 44, height: 44,
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
