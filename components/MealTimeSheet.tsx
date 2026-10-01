/**
 * MealTimeSheet — picks the time a meal is planned for.
 *
 * Two scrolling wheels (hours, minutes) under one highlight bar, in the
 * same style as MinutesPickerSheet. Pure JS rather than the community
 * datetimepicker, which has no web build. Minutes move in 5-minute steps.
 *
 * MealTimeBody is the picker without the sheet around it, so it can also
 * be shown as a step inside MealBuilderSheet.
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  ScrollView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';
import { useSheetAnimation } from '@/lib/useSheetAnimation';
import { normaliseTime } from '@/lib/mealPlan';

interface Props {
  visible: boolean;
  /** 'HH:MM' */
  value: string;
  onClose: () => void;
  onSave: (time: string) => void;
}

const MINUTE_STEP = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
const pad = (n: number) => String(n).padStart(2, '0');

const ITEM_HEIGHT = 44;     // each row in the wheel
const VISIBLE_ROWS = 5;     // odd → centred row is the selection
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS;
const PADDING = (WHEEL_HEIGHT - ITEM_HEIGHT) / 2;
/** How long scrolling must pause before the wheel settles on a row. */
const SETTLE_MS = 120;

// ── Wheel ────────────────────────────────────────────────────────────────────

function Wheel({
  values,
  value,
  onChange,
  label,
}: {
  values: number[];
  value: number;
  onChange: (next: number) => void;
  label: string;
}) {
  const ref = useRef<ScrollView>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The value this wheel last reported, so a parent re-render with the
  // same value doesn't fight an in-progress scroll.
  const reported = useRef(value);

  const indexOf = (v: number) => Math.max(0, values.indexOf(v));

  // Position on mount, and whenever the value is changed from outside.
  useEffect(() => {
    if (reported.current === value && ref.current) return;
    reported.current = value;
    const y = indexOf(value) * ITEM_HEIGHT;
    // Defer a frame so the ScrollView has laid out, or the offset is dropped.
    const id = requestAnimationFrame(() => ref.current?.scrollTo({ y, animated: false }));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.min(values.length - 1, Math.max(0, Math.round(y / ITEM_HEIGHT)));
    const next = values[index];
    if (next !== reported.current) {
      reported.current = next;
      onChange(next);
    }
    // snapToInterval isn't honoured everywhere (web), so once scrolling
    // pauses, nudge the wheel exactly onto the row.
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (Math.abs(y - index * ITEM_HEIGHT) > 0.5) {
        ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
      }
    }, SETTLE_MS);
  }

  return (
    <ScrollView
      ref={ref}
      style={styles.wheel}
      contentContainerStyle={{ paddingVertical: PADDING }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      scrollEventThrottle={16}
      onScroll={handleScroll}
      onLayout={() =>
        ref.current?.scrollTo({ y: indexOf(reported.current) * ITEM_HEIGHT, animated: false })
      }
      nestedScrollEnabled
      accessibilityLabel={label}
    >
      {values.map((v) => {
        const selected = v === value;
        return (
          <TouchableOpacity
            key={v}
            style={styles.row}
            onPress={() => ref.current?.scrollTo({ y: indexOf(v) * ITEM_HEIGHT, animated: true })}
            activeOpacity={0.6}
            accessibilityLabel={`${label} ${pad(v)}`}
          >
            <Text
              style={[styles.rowText, selected ? styles.rowTextSelected : styles.rowTextUnselected]}
            >
              {pad(v)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ── Body ─────────────────────────────────────────────────────────────────────

/**
 * The picker's contents without the sheet around it, so it can also be
 * shown as a step inside another sheet (MealBuilderSheet).
 */
export function MealTimeBody({ visible, value, onSave }: Omit<Props, 'onClose'>) {
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (!visible) return;
    const [h, m] = normaliseTime(value).split(':').map(Number);
    setHour(h ?? 12);
    // Snap an off-grid minute (e.g. a migrated 08:07) to the nearest step.
    setMinute(Math.min(60 - MINUTE_STEP, Math.round((m ?? 0) / MINUTE_STEP) * MINUTE_STEP));
  }, [visible, value]);

  return (
    <View style={styles.body}>
      <Text style={styles.title}>Meal time</Text>

      <View style={styles.wheelWrap}>
        {/* Centre highlight bar — purely visual, sits behind the rows. */}
        <View pointerEvents="none" style={styles.highlight} />
        <View style={styles.wheels}>
          <Wheel values={HOURS} value={hour} onChange={setHour} label="Hour" />
          <Text style={styles.colon}>:</Text>
          <Wheel values={MINUTES} value={minute} onChange={setMinute} label="Minutes" />
        </View>
      </View>

      <TouchableOpacity
        style={styles.saveBtn}
        onPress={() => onSave(`${pad(hour)}:${pad(minute)}`)}
        activeOpacity={0.85}
      >
        <Text style={styles.saveBtnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Sheet ────────────────────────────────────────────────────────────────────

export function MealTimeSheet(props: Props) {
  const { visible, onClose } = props;
  const { rendered, backdropOpacity, sheetTranslateY } = useSheetAnimation(visible);

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
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={12} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <MealTimeBody {...props} />
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTint: {
    ...StyleSheet.absoluteFill,
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
  closeRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  closeBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  body: { gap: 24 },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
  },

  // Wheels
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
  wheels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: WHEEL_HEIGHT,
  },
  wheel: {
    width: 72,
    height: WHEEL_HEIGHT,
    flexGrow: 0,
  },
  colon: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
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
    fontVariant: ['tabular-nums'],
  },
  rowTextSelected: { color: Colors.primary },
  rowTextUnselected: { color: 'rgba(2, 52, 50, 0.35)' },

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
