/**
 * MinutesPickerSheet — bottom-sheet wheel picker for prep / cook
 * time (or any 0-N minute value). Pure JS — uses FlatList with
 * snapToInterval to give the user a familiar iOS-wheel feel
 * without pulling in a native picker dep.
 *
 * Usage:
 *   <MinutesPickerSheet
 *     visible={open}
 *     value={prepTimeMin}      // current value (null = nothing set)
 *     title="Prep time"        // sheet heading
 *     onClose={() => setOpen(false)}
 *     onSave={(mins) => draft.setPrepTimeMin(mins)}
 *   />
 *
 * The wheel snaps in 5-minute steps from 0 to MAX_MIN. Saving with
 * a value of 0 sets null on the parent (treated as "not set").
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  FlatList,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';

const STEP = 5;             // minutes per wheel notch
const MAX_MIN = 240;        // 0–4h covers ~all recipes
const ITEM_HEIGHT = 44;     // each row in the wheel
const VISIBLE_ROWS = 5;     // odd → centred row is the selection
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;

interface Props {
  visible: boolean;
  value: number | null;
  title: string;
  onClose: () => void;
  onSave: (minutes: number | null) => void;
}

export function MinutesPickerSheet({ visible, value, title, onClose, onSave }: Props) {
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);
  const listRef = useRef<FlatList<number>>(null);

  // Build the list of selectable values once. With STEP=5 and MAX=240
  // that's 49 entries — small enough to render in full without
  // virtualisation worries.
  const data = useRef<number[]>(
    Array.from({ length: Math.floor(MAX_MIN / STEP) + 1 }, (_, i) => i * STEP),
  ).current;

  // The currently-centred value. Tracked separately from the
  // committed `value` prop so the wheel feels live as the user
  // scrolls, but we only persist on Save.
  const [pending, setPending] = useState<number>(value ?? 0);

  useEffect(() => {
    if (visible) {
      const initial = clampToStep(value ?? 0);
      setPending(initial);
      // Defer to the next tick so the FlatList has laid out before
      // we ask it to scroll — otherwise the offset is dropped.
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({
          offset: (initial / STEP) * ITEM_HEIGHT,
          animated: false,
        });
      });
    }
  }, [visible, value]);

  function handleSave() {
    onSave(pending === 0 ? null : pending);
  }

  // Track the index that's centred under the highlight bar — used
  // both to drive the bold-row style and to keep `pending` in sync
  // while the user spins the wheel.
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Pick the item whose midpoint is closest to the wheel centre.
      // viewableItems are indexed; the middle of viewableItems is
      // typically the selection but we can't always trust ordering,
      // so compute distance.
      if (viewableItems.length === 0) return;
      const middle = viewableItems[Math.floor(viewableItems.length / 2)];
      if (typeof middle.index === 'number') {
        const minutes = middle.index * STEP;
        setPending((prev) => (prev === minutes ? prev : minutes));
      }
    },
  ).current;

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View style={[styles.backdropTint, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>
        <Animated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.handle} />

            <View style={styles.closeRow}>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                hitSlop={12}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.body}>
              <Text style={styles.title}>{title}</Text>

              {/* Wheel — FlatList with snap-to-interval. The middle
                  row is the selection; rows above/below dim with
                  distance. */}
              <View style={styles.wheelWrap}>
                {/* Centre highlight bar — purely visual, sits behind
                    the FlatList rows so a tap still reaches them. */}
                <View pointerEvents="none" style={styles.highlight} />
                <FlatList
                  ref={listRef}
                  data={data}
                  keyExtractor={(n) => String(n)}
                  showsVerticalScrollIndicator={false}
                  snapToInterval={ITEM_HEIGHT}
                  decelerationRate="fast"
                  contentContainerStyle={{ paddingVertical: PADDING }}
                  // Offset MUST include the contentContainer padding —
                  // otherwise FlatList's viewable-items calculation
                  // lands PADDING / ITEM_HEIGHT rows below where the
                  // wheel actually shows the centred row, and
                  // onViewableItemsChanged sets pending to the wrong
                  // value (visible as the bold styling landing on a
                  // row outside the highlight bar).
                  getItemLayout={(_, index) => ({
                    length: ITEM_HEIGHT,
                    offset: PADDING + ITEM_HEIGHT * index,
                    index,
                  })}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
                  renderItem={({ item }) => {
                    const selected = item === pending;
                    return (
                      <View style={styles.row}>
                        <Text
                          style={[
                            styles.rowText,
                            selected ? styles.rowTextSelected : styles.rowTextUnselected,
                          ]}
                        >
                          {item}
                        </Text>
                      </View>
                    );
                  }}
                />
                <Text pointerEvents="none" style={styles.unitLabel}>
                  mins
                </Text>
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                activeOpacity={0.85}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function clampToStep(n: number): number {
  if (n <= 0) return 0;
  if (n >= MAX_MIN) return MAX_MIN;
  return Math.round(n / STEP) * STEP;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 41, 35, 0.55)',
  },
  sheet: {
    backgroundColor: Colors.surface.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 7,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 110,
    height: 6,
    borderRadius: 93,
    backgroundColor: '#d9d9d9',
  },
  closeRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    gap: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    width: '100%',
  },

  // Wheel
  wheelWrap: {
    height: WHEEL_HEIGHT,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: PADDING,
    height: ITEM_HEIGHT,
    backgroundColor: '#e4f1ef',
    borderRadius: Radius.m,
    borderWidth: 1,
    borderColor: '#aad4cd',
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    letterSpacing: -0.48,
    textAlign: 'center',
  },
  rowTextSelected: { color: Colors.primary },
  rowTextUnselected: { color: 'rgba(2, 52, 50, 0.35)' },
  // 'mins' label sits to the right of the centred row.
  unitLabel: {
    position: 'absolute',
    right: 24,
    top: PADDING,
    height: ITEM_HEIGHT,
    lineHeight: ITEM_HEIGHT,
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },

  saveBtn: {
    width: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: Radius.m,
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },
});
