/**
 * Meal planner — hidden tab (like ingredient-preferences), reached from the
 * menu, the dashboard, the Recipes tab and recipe actions. Built on the
 * same template as Scan History, laid out to the Figma "Meal Planner"
 * frame (node 5856-31098):
 *
 *   ScreenLayout ("Meal Planner" + subtitle in the header)
 *   headerExtension: week row (‹ 28th September - 4th October ›),
 *                    day strip (MON 28 … SUN 4),
 *                    "4 meals planned today" card that expands to the
 *                    day's nutrition totals
 *   Timeline: a 24-hour day, meals placed at their time
 *   Floating + button: plan a meal
 *
 * Tapping an empty hour or the + button opens MealBuilderSheet.
 * Tapping a meal opens MealActionsSheet.
 *
 * Free accounts can plan today only — any other day opens the Plus upsell.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Colors, Shadows } from '@/constants/theme';
import { ScreenLayout } from '@/components/ScreenLayout';
import { LottieLoader } from '@/components/LottieLoader';
import { MealActionsSheet } from '@/components/MealActionsSheet';
import { MealBuilderSheet } from '@/components/MealBuilderSheet';
import { MealTotalsList } from '@/components/MealTotalsList';
import { MealBlock } from '@/components/MealBlock';
import { IconButton } from '@/components/IconButton';
import { ProgressiveBlur } from '@/components/ProgressiveBlur';
import { useFadeIn } from '@/lib/useFadeIn';
import { useFocusFadeIn } from '@/lib/useFocusFadeIn';
import { useSubscription } from '@/lib/subscriptionContext';
import { useUpsellSheet } from '@/lib/upsellSheetContext';
import { useDraftMeal } from '@/lib/draftMealContext';
import { useMealPlanWeek, useMealPlanImpact } from '@/lib/useMealPlan';
import {
  WEEKDAY_LONG,
  addDays,
  fromDateKey,
  minutesToTime,
  nowRoundedTime,
  startOfWeek,
  sumNutrition,
  timeToMinutes,
  toDateKey,
  weekDateKeys,
} from '@/lib/mealPlan';
import type { Meal } from '@/lib/types';
import ChevronLeftIcon from '@/assets/icons/meal-plan/chevron-left.svg';
import ChevronRightIcon from '@/assets/icons/meal-plan/chevron-right.svg';
import ChevronDownIcon from '@/assets/icons/meal-plan/chevron-down.svg';
import AddIcon from '@/assets/icons/meal-plan/add.svg';

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Timeline geometry ────────────────────────────────────────────────────────
const HOUR_HEIGHT = 70;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
/** Width of the hour-label gutter on the left. */
const GUTTER = 52;
/** Each hour line sits this far below the top of its row (level with the label). */
const LINE_OFFSET = 8;
/** A meal has no duration, so every block is drawn one hour tall. */
const BLOCK_MINUTES = 60;
const BLOCK_HEIGHT = HOUR_HEIGHT;
/** Gap between meals sharing a row. */
const LANE_GAP = 5;
/** Where the day opens when nothing is planned and it isn't today. */
const DEFAULT_SCROLL_HOUR = 7;
/** "Now" marker colour from the design (not a theme token yet). */
const NOW_COLOUR = '#00c8b3';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
/** Day-strip labels, Sunday first to match Date.getDay(). */
const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THUR', 'FRI', 'SAT'];
/**
 * Where the timeline's first hour sits below the top of the scroll area —
 * the design's 16 gap under the count card plus 20 — and the height of the
 * blur/fade band the day scrolls into at the top.
 */
const TIMELINE_TOP = 36;

function ordinalSuffix(n: number): string {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

const y = (minutes: number) => LINE_OFFSET + (minutes / 60) * HOUR_HEIGHT;

interface PlacedMeal {
  meal: Meal;
  top: number;
  /** Column index within its group of overlapping meals. */
  lane: number;
  /** How many columns that group needs. */
  lanes: number;
}

/**
 * Places meals on the timeline. Meals less than an hour apart would
 * overlap, so they're split into side-by-side columns, the way a
 * calendar day view handles clashing events.
 */
function placeMeals(meals: Meal[]): PlacedMeal[] {
  const sorted = [...meals].sort(
    (a, b) => timeToMinutes(a.meal_time) - timeToMinutes(b.meal_time),
  );
  const placed: PlacedMeal[] = [];
  let group: PlacedMeal[] = [];
  let laneEnds: number[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    for (const p of group) p.lanes = laneEnds.length;
    group = [];
    laneEnds = [];
  };

  for (const meal of sorted) {
    const start = timeToMinutes(meal.meal_time);
    if (start >= groupEnd) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(0);
    }
    laneEnds[lane] = start + BLOCK_MINUTES;
    groupEnd = Math.max(groupEnd, start + BLOCK_MINUTES);
    const p: PlacedMeal = { meal, top: y(start), lane, lanes: 1 };
    group.push(p);
    placed.push(p);
  }
  closeGroup();
  return placed;
}

/**
 * "28th September" with the ordinal set small and raised, as in the
 * design. Built from a row of Texts because nested Text can't be offset.
 */
function OrdinalDate({
  date,
  textStyle,
  suffixStyle,
}: {
  date: Date;
  textStyle: object;
  suffixStyle: object;
}) {
  const day = date.getDate();
  return (
    <View style={styles.ordinalRow}>
      <Text style={textStyle}>{day}</Text>
      <Text style={suffixStyle}>{ordinalSuffix(day)}</Text>
      <Text style={textStyle}>{` ${MONTH_NAMES[date.getMonth()]}`}</Text>
    </View>
  );
}

export default function MealPlanScreen() {
  const params = useLocalSearchParams<{ date?: string; add?: string }>();
  const { isPlus } = useSubscription();
  const { showUpsell } = useUpsellSheet();
  const draftMeal = useDraftMeal();

  const todayKey = toDateKey(new Date());
  const yesterdayKey = toDateKey(addDays(new Date(), -1));
  const tomorrowKey = toDateKey(addDays(new Date(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [totalsOpen, setTotalsOpen] = useState(false);
  /** Closed height of the count card, held while it floats open. */
  const [countCardHeight, setCountCardHeight] = useState<number | null>(null);
  const timelineRef = useRef<ScrollView>(null);

  /** Free accounts plan today only; anything else is the Plus upsell. */
  const selectDay = useCallback(
    (key: string) => {
      if (!isPlus && key !== todayKey) {
        showUpsell();
        return;
      }
      setSelectedKey(key);
    },
    [isPlus, todayKey, showUpsell],
  );

  // Tab screens stay mounted, so a ?date= from a toast "View" action or
  // the builder's return has to be applied as it arrives.
  useEffect(() => {
    if (typeof params.date === 'string' && DATE_KEY_RE.test(params.date)) {
      if (isPlus || params.date === todayKey) setSelectedKey(params.date);
    }
  }, [params.date, isPlus, todayKey]);

  // Losing Plus while parked on another day puts you back on today.
  useEffect(() => {
    if (!isPlus && selectedKey !== todayKey) setSelectedKey(todayKey);
  }, [isPlus, selectedKey, todayKey]);

  const selectedDate = useMemo(() => fromDateKey(selectedKey), [selectedKey]);
  const weekStart = useMemo(() => startOfWeek(selectedDate), [selectedDate]);
  const weekKeys = useMemo(() => weekDateKeys(weekStart), [weekStart]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  const { meals, byDate, loading, error, refresh } = useMealPlanWeek(weekStart);
  const impact = useMealPlanImpact(meals);

  const fadeContent = useFadeIn(!loading, 0);
  const focusAnim = useFocusFadeIn();

  const dayMeals = useMemo(() => byDate[selectedKey] ?? [], [byDate, selectedKey]);
  const placed = useMemo(() => placeMeals(dayMeals), [dayMeals]);
  const activeMeal = meals.find((m) => m.id === activeMealId) ?? null;
  const isToday = selectedKey === todayKey;

  // Current time for the "now" line, refreshed each minute.
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Each day opens with its totals folded away.
  useEffect(() => {
    setTotalsOpen(false);
  }, [selectedKey]);

  // Open each day at something useful: an hour before the first meal,
  // else an hour before now (today), else breakfast time.
  const firstMealMinutes = dayMeals.length > 0 ? timeToMinutes(dayMeals[0].meal_time) : null;
  // `pendingScroll` is true until the timeline has been positioned for
  // the current day; the ScrollView's onLayout does the actual scroll,
  // since it may not be mounted yet when the day changes.
  const pendingScroll = useRef(true);
  const positionTimeline = useCallback(() => {
    if (!pendingScroll.current || !timelineRef.current) return;
    const anchor = firstMealMinutes ?? (isToday ? nowMinutes : DEFAULT_SCROLL_HOUR * 60 + 60);
    const top = Math.max(0, ((anchor - 60) / 60) * HOUR_HEIGHT);
    timelineRef.current.scrollTo({ y: top, animated: false });
    pendingScroll.current = false;
    // nowMinutes is read, not depended on — re-running each minute would
    // yank the scroll position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstMealMinutes, isToday]);

  useEffect(() => {
    pendingScroll.current = true;
  }, [selectedKey]);

  useEffect(() => {
    if (loading) return;
    // Covers day changes while the ScrollView is already mounted.
    const id = setTimeout(positionTimeline, 0);
    return () => clearTimeout(id);
  }, [selectedKey, loading, positionTimeline]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  function shiftWeek(direction: -1 | 1) {
    selectDay(toDateKey(addDays(selectedDate, direction * 7)));
  }

  // The builder hides itself while a picker screen (search, scanner,
  // recipe list) is on top. Coming back here with a meal still in
  // progress brings it up again.
  // Read through a ref so this only runs on focus, not every time the
  // draft changes while the planner is already in front.
  const hasDraftRef = useRef(false);
  hasDraftRef.current = draftMeal.draft !== null;
  useFocusEffect(
    useCallback(() => {
      if (hasDraftRef.current) setBuilderOpen(true);
    }, []),
  );

  function startMeal(time: string, dateKey: string = selectedKey) {
    draftMeal.startNew(dateKey, time);
    setBuilderOpen(true);
  }

  // ?add=1 (the dashboard's + button) opens the builder for a meal today.
  // A meal already in progress takes priority — the focus effect above
  // reopens it instead.
  useEffect(() => {
    if (params.add !== '1') return;
    router.setParams({ add: undefined });
    if (!hasDraftRef.current) startMeal(nowRoundedTime(), todayKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.add]);

  function editMeal(meal: Meal) {
    draftMeal.startEdit(meal);
    // Let the actions sheet finish closing before this Modal opens
    // (iOS double-modal freeze).
    setTimeout(() => setBuilderOpen(true), 350);
  }

  const plannedWhen =
    selectedKey === todayKey
      ? 'planned today'
      : selectedKey === tomorrowKey
        ? 'planned tomorrow'
        : selectedKey === yesterdayKey
          ? 'planned yesterday'
          : `planned for ${WEEKDAY_LONG[selectedDate.getDay()]}`;

  const dayTotals = useMemo(
    () => sumNutrition(dayMeals.flatMap((m) => m.items)),
    [dayMeals],
  );
  const hasMeals = dayMeals.length > 0;

  // ── Header extension ────────────────────────────────────────────────────────
  const headerExtension = (
    <View style={styles.headerExt}>
      <View style={styles.weekGroup}>
        {/* Week row */}
        <View style={styles.weekRow}>
          <IconButton
            size="small"
            icon={<ChevronLeftIcon width={20} height={20} />}
            onPress={() => shiftWeek(-1)}
            accessibilityLabel="Previous week"
          />
          <TouchableOpacity
            style={styles.weekLabel}
            onPress={() => setSelectedKey(todayKey)}
            disabled={isToday}
            activeOpacity={0.7}
            accessibilityLabel={isToday ? undefined : 'Back to today'}
          >
            <OrdinalDate date={weekStart} textStyle={styles.weekText} suffixStyle={styles.weekSuffix} />
            <Text style={styles.weekText}> - </Text>
            <OrdinalDate date={weekEnd} textStyle={styles.weekText} suffixStyle={styles.weekSuffix} />
          </TouchableOpacity>
          <IconButton
            size="small"
            icon={<ChevronRightIcon width={20} height={20} />}
            onPress={() => shiftWeek(1)}
            accessibilityLabel="Next week"
          />
        </View>

        {/* Day strip — one cell per day of the selected week */}
        <View style={styles.dayStrip}>
          {weekKeys.map((key) => {
            const d = fromDateKey(key);
            const isActive = key === selectedKey;
            const locked = !isPlus && key !== todayKey;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayCell, isActive && styles.dayCellActive, locked && styles.dayCellLocked]}
                onPress={() => selectDay(key)}
                activeOpacity={0.7}
                accessibilityLabel={`${WEEKDAY_LONG[d.getDay()]} ${d.getDate()}${key === todayKey ? ', today' : ''}`}
                accessibilityState={{ selected: isActive }}
              >
                <Text style={styles.dayName}>{DAY_LABELS[d.getDay()]}</Text>
                <Text style={styles.dayNumber}>{d.getDate()}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Count card — opens to the day's nutrition totals. Open, it turns
          white and floats over the timeline (which blurs behind it); the
          slot keeps the closed height so nothing below moves. */}
      <View style={[styles.countSlot, countCardHeight != null && { height: countCardHeight }]}>
      <TouchableOpacity
        style={[styles.countCard, totalsOpen && styles.countCardOpen]}
        onLayout={(e) => {
          if (!totalsOpen) setCountCardHeight(Math.round(e.nativeEvent.layout.height));
        }}
        onPress={() => setTotalsOpen((open) => !open)}
        disabled={!hasMeals}
        activeOpacity={0.8}
        accessibilityState={hasMeals ? { expanded: totalsOpen } : undefined}
        accessibilityHint={hasMeals ? 'Shows the totals for this day' : undefined}
      >
        <View style={styles.countRow}>
          <View style={styles.countText}>
            <Text style={styles.countBold}>
              {hasMeals
                ? `${dayMeals.length} ${dayMeals.length === 1 ? 'meal' : 'meals'}`
                : 'No meals'}
            </Text>
            <Text style={styles.countLight}>{plannedWhen}</Text>
          </View>
          {hasMeals && (
            <View style={[styles.countChevron, totalsOpen && styles.countChevronOpen]}>
              <ChevronDownIcon width={20} height={20} />
            </View>
          )}
        </View>
        {hasMeals && totalsOpen && <MealTotalsList totals={dayTotals} />}
      </TouchableOpacity>
      </View>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenLayout
      title="Meal Planner"
      subtitle="Plan what you'll eat this week"
      headerExtension={headerExtension}
    >
      <Animated.View
        style={{ flex: 1, opacity: focusAnim.opacity, transform: [{ translateY: focusAnim.translateY }] }}
      >
        <Animated.View
          style={[
            styles.contentInner,
            { opacity: fadeContent.opacity, transform: [{ translateY: fadeContent.translateY }] },
          ]}
        >
          {loading && meals.length === 0 ? (
            <LottieLoader type="loading" fullScreen={false} />
          ) : error && meals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="alert-circle-outline" size={42} color={Colors.status.negative} />
              <Text style={styles.emptyTitle}>We couldn't load your plan</Text>
              <Text style={styles.emptyText}>Check your connection and try again.</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={refresh} activeOpacity={0.85}>
                <Text style={styles.retryBtnText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              ref={timelineRef}
              onLayout={positionTimeline}
              contentContainerStyle={styles.timelineContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
              }
            >
              <View style={styles.timeline}>
                {/* Hour rows — tap an empty hour to plan a meal there */}
                {HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour}
                    style={styles.hourRow}
                    onPress={() => startMeal(minutesToTime(hour * 60))}
                    activeOpacity={0.6}
                    accessibilityLabel={`Add a meal at ${minutesToTime(hour * 60)}`}
                  >
                    <Text style={styles.hourLabel}>{minutesToTime(hour * 60)}</Text>
                    <View style={styles.hourLine} />
                  </TouchableOpacity>
                ))}

                {/* Now line — drawn under the meals so it never covers their text */}
                {isToday && (
                  <View
                    style={[styles.nowLine, { top: y(nowMinutes) - 4 }]}
                    pointerEvents="none"
                  >
                    <View style={styles.nowDot} />
                    <View style={styles.nowRule} />
                  </View>
                )}

                {/* Everything to the right of the hour gutter */}
                <View style={styles.blocksLayer} pointerEvents="box-none">
                  {placed.map(({ meal, top, lane, lanes }) => (
                    <View
                      key={meal.id}
                      style={[
                        styles.blockSlot,
                        {
                          top,
                          left: `${(lane / lanes) * 100}%`,
                          width: `${100 / lanes}%`,
                          paddingRight: lane < lanes - 1 ? LANE_GAP : 0,
                        },
                      ]}
                    >
                      <MealBlock
                        meal={meal}
                        impact={impact[meal.id]}
                        onPress={() => setActiveMealId(meal.id)}
                        style={styles.blockFill}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </ScrollView>
          )}

          {/* The day softens into the page as it scrolls up to the count card */}
          {!loading && !error && <ProgressiveBlur height={TIMELINE_TOP} />}
        </Animated.View>
      </Animated.View>

      {/* Plan a meal */}
      <IconButton
        icon={<AddIcon width={24} height={24} />}
        onPress={() => startMeal(isToday ? nowRoundedTime() : '12:00')}
        accessibilityLabel="Plan a meal"
        hitSlop={0}
        style={styles.addBtn}
      />

      {/* Totals open: blur the timeline and + button behind the card.
          Tapping the blur closes it. Android gets a soft tint instead. */}
      {totalsOpen && (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setTotalsOpen(false)}
          accessibilityLabel="Close totals"
        >
          {Platform.OS === 'android' ? (
            <View style={[StyleSheet.absoluteFill, styles.totalsScrimAndroid]} />
          ) : (
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
          )}
        </Pressable>
      )}

      <MealBuilderSheet
        visible={builderOpen}
        onHide={() => setBuilderOpen(false)}
        onDone={({ saved }) => {
          setBuilderOpen(false);
          if (saved) refresh();
        }}
      />

      <MealActionsSheet
        visible={activeMealId !== null}
        meal={activeMeal}
        onClose={() => setActiveMealId(null)}
        onChanged={refresh}
        onEdit={editMeal}
      />
    </ScreenLayout>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
// Tabs and empty-state blocks mirror app/(tabs)/history.tsx.

const styles = StyleSheet.create({
  // ── Header extension ──────────────────────────────────────────────────────────
  headerExt: {
    paddingHorizontal: 24,
    gap: 16,
    // Above the content area, so the open totals card can float over the
    // timeline and its blur.
    zIndex: 2,
    elevation: 2,
  },
  weekGroup: {
    gap: 8,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  weekText: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  weekSuffix: {
    fontSize: 10.32,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.32,
  },
  ordinalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // ── Day strip ─────────────────────────────────────────────────────────────────
  dayStrip: {
    flexDirection: 'row',
    gap: 4,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderRadius: 8,
    // Transparent border so the selected cell doesn't change size.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  dayCellActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderColor: '#aad4cd',
  },
  dayCellLocked: {
    opacity: 0.45,
  },
  dayName: {
    fontSize: 12,
    lineHeight: 12,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.24,
  },
  dayNumber: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
  },

  // ── Count card ────────────────────────────────────────────────────────────────
  countSlot: {
    position: 'relative',
  },
  // Open: white, lifted, and drawn over the timeline instead of pushing it down.
  countCardOpen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface.secondary,
    ...Shadows.level3,
  },
  totalsScrimAndroid: {
    backgroundColor: 'rgba(226, 241, 238, 0.85)',
  },
  countCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    borderRadius: 16,
    padding: 16,
    gap: 16,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  countText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  countBold: {
    fontSize: 16,
    lineHeight: 17.6,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  countLight: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  countChevron: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countChevronOpen: {
    transform: [{ rotate: '180deg' }],
  },

  // No gap under the count card — the timeline's top padding provides it,
  // so the fade band can run right up to the card.
  contentInner: {
    flex: 1,
  },

  // ── Content states ────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
    paddingBottom: 100,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  retryBtnText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
  },

  // ── Timeline ──────────────────────────────────────────────────────────────────
  timelineContent: {
    paddingHorizontal: 24,
    paddingTop: TIMELINE_TOP,
    // Clears the floating tab bar and the + button.
    paddingBottom: 160,
  },
  timeline: {
    height: HOUR_HEIGHT * 24 + LINE_OFFSET,
  },
  hourRow: {
    height: HOUR_HEIGHT,
  },
  hourLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    fontSize: 14,
    lineHeight: 16.8,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.28,
    fontVariant: ['tabular-nums'],
  },
  hourLine: {
    position: 'absolute',
    top: LINE_OFFSET,
    left: GUTTER,
    right: 0,
    height: 1,
    backgroundColor: '#aad4cd',
    opacity: 0.6,
  },

  blocksLayer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: GUTTER,
    right: 0,
  },
  blockSlot: {
    position: 'absolute',
    height: BLOCK_HEIGHT,
  },
  blockFill: {
    flex: 1,
  },

  // Now line — 8px dot in the gutter, 2px rule across the day
  nowLine: {
    position: 'absolute',
    left: 17,
    // Run through the timeline's side padding to the screen edge.
    right: -24,
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NOW_COLOUR,
  },
  nowRule: {
    flex: 1,
    height: 2,
    backgroundColor: NOW_COLOUR,
  },

  // Floating + button — position only; look comes from IconButton
  addBtn: {
    position: 'absolute',
    right: 22,
    bottom: 122,
  },
});
