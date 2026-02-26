import { useState, useCallback, useRef, useMemo } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Colors, Shadows, Spacing } from '@/constants/theme';
import { sentenceCase } from '@/lib/text';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTabBarSlide } from '@/lib/tabBarContext';
import type { Scan } from '@/lib/types';

// ─── Nutriscore colours ────────────────────────────────────────────────────────
const NUTRISCORE_COLORS: Record<string, string> = {
  a: '#009a1f',
  b: '#b8d828',
  c: '#ffc72d',
  d: '#ff8736',
  e: '#ff3f42',
};

// ─── Date utilities ────────────────────────────────────────────────────────────
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

type DateTab = {
  key: string;
  date: Date;
  day: number;
  ordinal: string;
  monthShort: string;
  specialLabel?: 'Today' | 'Yesterday';
};

/** Last 7 days, oldest → newest */
function buildDateTabs(): DateTab[] {
  const todayRaw = new Date();
  const tabs: DateTab[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayRaw);
    d.setDate(todayRaw.getDate() - i);
    d.setHours(0, 0, 0, 0);
    tabs.push({
      key: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
      date: d,
      day: d.getDate(),
      ordinal: getOrdinalSuffix(d.getDate()),
      monthShort: MONTH_SHORT[d.getMonth()],
      specialLabel: i === 0 ? 'Today' : i === 1 ? 'Yesterday' : undefined,
    });
  }
  return tabs;
}

function isSameLocalDay(isoDate: string, target: Date): boolean {
  const d = new Date(isoDate);
  return (
    d.getFullYear() === target.getFullYear() &&
    d.getMonth() === target.getMonth() &&
    d.getDate() === target.getDate()
  );
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/** Monday-first calendar grid for a given month */
function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let startDow = new Date(year, month, 1).getDay(); // 0=Sun
  startDow = startDow === 0 ? 6 : startDow - 1;    // convert to 0=Mon

  const cells: (number | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

function formatDateShort(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

// ─── CalendarPicker ────────────────────────────────────────────────────────────
function CalendarPicker({
  onCancel,
  onApply,
}: {
  onCancel: () => void;
  onApply: (start: Date, end: Date) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  // Card inner width = screen - 48px outer margin - 40px card padding
  const cellWidth = Math.floor((screenWidth - 48 - 40) / 7);

  const todayClean = startOfDay(new Date());
  const [calYear, setCalYear] = useState(todayClean.getFullYear());
  const [calMonth, setCalMonth] = useState(todayClean.getMonth());
  const [pendingStart, setPendingStart] = useState<Date | null>(null);
  const [pendingEnd, setPendingEnd] = useState<Date | null>(null);

  const grid = useMemo(() => buildCalendarGrid(calYear, calMonth), [calYear, calMonth]);

  const isAtCurrentMonth =
    calYear === todayClean.getFullYear() && calMonth === todayClean.getMonth();

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (isAtCurrentMonth) return;
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  function onDayPress(day: number) {
    const pressed = new Date(calYear, calMonth, day);
    if (pressed > todayClean) return;

    if (!pendingStart || (pendingStart && pendingEnd)) {
      setPendingStart(pressed);
      setPendingEnd(null);
    } else if (pressed >= pendingStart) {
      setPendingEnd(pressed);
    } else {
      setPendingStart(pressed);
      setPendingEnd(null);
    }
  }

  type DayState = 'empty' | 'future' | 'today' | 'rangeStart' | 'rangeEnd' | 'inRange' | 'normal';

  function getDayState(day: number | null): DayState {
    if (day === null) return 'empty';
    const d = new Date(calYear, calMonth, day);
    if (d > todayClean) return 'future';

    const sod = startOfDay(d);
    if (pendingStart && pendingEnd) {
      const ps = startOfDay(pendingStart);
      const pe = startOfDay(pendingEnd);
      if (sod.getTime() === ps.getTime()) return 'rangeStart';
      if (sod.getTime() === pe.getTime()) return 'rangeEnd';
      if (sod > ps && sod < pe) return 'inRange';
    } else if (pendingStart) {
      if (sod.getTime() === startOfDay(pendingStart).getTime()) return 'rangeStart';
    }

    if (sod.getTime() === todayClean.getTime()) return 'today';
    return 'normal';
  }

  const footerLabel = !pendingStart
    ? 'Select start date'
    : !pendingEnd
    ? 'Select end date'
    : `${formatDateShort(pendingStart)} – ${formatDateShort(pendingEnd)}`;

  const canApply = !!pendingStart && !!pendingEnd;

  return (
    <View style={styles.calCard}>
      {/* Month navigation */}
      <View style={styles.calHeader}>
        <TouchableOpacity style={styles.calNavBtn} onPress={prevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={Colors.primary} />
        </TouchableOpacity>
        <Text style={styles.calMonthTitle}>
          {MONTH_FULL[calMonth]} {calYear}
        </Text>
        <TouchableOpacity
          style={[styles.calNavBtn, isAtCurrentMonth && styles.calNavBtnDisabled]}
          onPress={nextMonth}
          activeOpacity={0.7}
          disabled={isAtCurrentMonth}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={isAtCurrentMonth ? 'rgba(2,52,50,0.2)' : Colors.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={styles.calDayHeaderRow}>
        {DAY_HEADERS.map((d) => (
          <View key={d} style={[styles.calDayCell, { width: cellWidth }]}>
            <Text style={styles.calDayHeaderText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {grid.map((week, wi) => (
          <View key={wi} style={styles.calWeekRow}>
            {week.map((day, di) => {
              const state = getDayState(day);
              const isSelected = state === 'rangeStart' || state === 'rangeEnd';
              const isInRange = state === 'inRange';
              const isToday = state === 'today';
              const isFuture = state === 'future';

              return (
                <TouchableOpacity
                  key={di}
                  style={[
                    styles.calDayBtn,
                    { width: cellWidth },
                    isSelected && styles.calDaySelected,
                    isInRange && styles.calDayInRange,
                  ]}
                  onPress={() => day && onDayPress(day)}
                  disabled={!day || isFuture}
                  activeOpacity={0.7}
                >
                  {day ? (
                    <Text
                      style={[
                        styles.calDayText,
                        isToday && styles.calDayTextToday,
                        isFuture && styles.calDayTextFuture,
                        isSelected && styles.calDayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer: status label + Cancel / Apply */}
      <View style={styles.calFooter}>
        <Text style={styles.calFooterLabel}>{footerLabel}</Text>
        <View style={styles.calActions}>
          <TouchableOpacity
            style={styles.calCancelAction}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.calCancelActionText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.calApplyBtn, !canApply && styles.calApplyBtnDisabled]}
            onPress={canApply ? () => onApply(pendingStart!, pendingEnd!) : undefined}
            activeOpacity={0.7}
            disabled={!canApply}
          >
            <Text style={styles.calApplyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── ScanCard ──────────────────────────────────────────────────────────────────
function ScanCard({ scan, onPress, onDelete }: { scan: Scan; onPress: () => void; onDelete: () => void }) {
  const grade = scan.nutriscore_grade?.toLowerCase();
  const gradeColor = grade ? NUTRISCORE_COLORS[grade] : null;

  function renderRightActions() {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete} activeOpacity={0.85}>
        <Ionicons name="trash-outline" size={22} color="#fff" />
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false} rightThreshold={40}>
      <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
        {scan.image_url ? (
          <Image source={{ uri: scan.image_url }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={24} color={Colors.secondary} />
          </View>
        )}
        <View style={styles.cardContent}>
          {scan.brand ? (
            <Text style={styles.brandName} numberOfLines={1}>{sentenceCase(scan.brand!)}</Text>
          ) : null}
          <Text style={styles.productName} numberOfLines={2}>{sentenceCase(scan.product_name)}</Text>
        </View>
        {gradeColor ? (
          <View style={[styles.nutriscoreCircle, { backgroundColor: gradeColor }]}>
            <Text style={styles.nutriscoreText}>{grade!.toUpperCase()}</Text>
          </View>
        ) : null}
        <View style={styles.chevronBox}>
          <Ionicons name="chevron-forward" size={14} color={Colors.secondary} />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── HistoryScreen ─────────────────────────────────────────────────────────────
export default function HistoryScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const tabBarSlide = useTabBarSlide();

  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date tabs — last 7 days, built once on mount
  const dateTabs = useRef(buildDateTabs()).current;
  const todayKey = dateTabs[dateTabs.length - 1]?.key ?? '';
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const tabScrollRef = useRef<ScrollView>(null);

  // Range filter (overrides tab filter when active)
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null);

  // Calendar overlay state
  const [calVisible, setCalVisible] = useState(false);
  const calAnim = useRef(new Animated.Value(0)).current;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchScans = useCallback(async () => {
    if (!session?.user) return;
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('scanned_at', { ascending: false });
    if (!error && data) setScans(data);
    setLoading(false);
  }, [session]);

  useFocusEffect(useCallback(() => { fetchScans(); }, [fetchScans]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchScans();
    setRefreshing(false);
  }, [fetchScans]);

  async function deleteScan(id: string) {
    setScans(prev => prev.filter(s => s.id !== id));
    await supabase.from('scans').delete().eq('id', id);
  }

  function openScan(scan: Scan) {
    router.push({
      pathname: '/scan-result',
      params: {
        scanId: scan.id,
        productName: scan.product_name,
        brand: scan.brand ?? '',
        imageUrl: scan.image_url ?? '',
        barcode: scan.barcode,
        nutriscoreGrade: scan.nutriscore_grade ?? '',
      },
    });
  }

  // ── Date range overlay ──────────────────────────────────────────────────────
  function openDateRange() {
    setCalVisible(true);
    Animated.parallel([
      Animated.timing(calAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(tabBarSlide, { toValue: 150, duration: 220, useNativeDriver: true }),
    ]).start();
  }

  function closeDateRange() {
    Animated.parallel([
      Animated.timing(calAnim, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(tabBarSlide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setCalVisible(false));
  }

  function applyDateRange(start: Date, end: Date) {
    setDateRange({ start, end });
    setSelectedKey(''); // clear tab filter
    closeDateRange();
  }

  function clearDateRange() {
    setDateRange(null);
    setSelectedKey(todayKey); // restore Today tab
  }

  // ── Filtered scans ──────────────────────────────────────────────────────────
  const filteredScans = useMemo(() => {
    if (dateRange) {
      const endInclusive = endOfDay(dateRange.end);
      return scans.filter((scan) => {
        const d = new Date(scan.scanned_at);
        return d >= dateRange.start && d <= endInclusive;
      });
    }
    const tab = dateTabs.find((t) => t.key === selectedKey);
    if (tab) return scans.filter((scan) => isSameLocalDay(scan.scanned_at, tab.date));
    return scans;
  }, [scans, dateRange, selectedKey, dateTabs]);

  // ── Month label ─────────────────────────────────────────────────────────────
  const today = new Date();
  const monthYearLabel = dateRange
    ? `${formatDateShort(dateRange.start)} – ${formatDateShort(dateRange.end)}`
    : `${MONTH_FULL[today.getMonth()]} ${today.getFullYear()}`;

  const emptyMessage =
    dateRange ? 'No scans in this range' :
    dateTabs.find(t => t.key === selectedKey)?.specialLabel === 'Today'
      ? 'No scans today'
      : 'No scans on this day';

  // ── Header extension ────────────────────────────────────────────────────────
  // headerFade: 1 when calendar closed, 0 when calendar open.
  // Drives fade-out of the month label and date tabs as the calendar opens.
  const headerFade = calAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

  // headerExtension — month row only. Date tabs have moved into contentOuter so the
  // calendar overlay (absoluteFillObject of contentOuter) starts at the same Y as
  // the date tabs, making the calendar card align perfectly with them.
  const headerExtension = (
    <View style={styles.headerExt}>
      <View style={styles.monthRow}>
        {/* Month label fades out as calendar opens */}
        <Animated.Text style={[styles.monthLabel, { opacity: headerFade }]}>
          {monthYearLabel}
        </Animated.Text>

        {/* Button slot: "Date range"/"Clear" crossfades with "Cancel" */}
        <View style={styles.headerBtnSlot}>
          {/* "Date range" / "Clear" — fades out as calendar opens */}
          <Animated.View
            style={{ opacity: headerFade }}
            pointerEvents={calVisible ? 'none' : 'auto'}
          >
            {dateRange ? (
              <TouchableOpacity style={styles.dateRangeBtn} onPress={clearDateRange} activeOpacity={0.7}>
                <Ionicons name="close-circle-outline" size={16} color={Colors.secondary} />
                <Text style={styles.dateRangeBtnText}>Clear</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.dateRangeBtn} onPress={openDateRange} activeOpacity={0.7}>
                <Ionicons name="calendar-outline" size={16} color={Colors.secondary} />
                <Text style={styles.dateRangeBtnText}>Date range</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* "Cancel" — fades in as calendar opens, overlaid in same slot */}
          <Animated.View
            style={[styles.cancelBtnOverlay, { opacity: calAnim }]}
            pointerEvents={calVisible ? 'auto' : 'none'}
          >
            <TouchableOpacity style={styles.dateRangeBtn} onPress={closeDateRange} activeOpacity={0.7}>
              <Ionicons name="close" size={14} color={Colors.secondary} />
              <Text style={styles.dateRangeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ScreenLayout title="Scan History" headerExtension={headerExtension}>
      <View style={styles.contentOuter}>
        {/* Date tabs live here so the calOverlay (absoluteFillObject) starts at
            the same Y, aligning the calendar card with the top of the tabs. */}
        {!dateRange && (
          <Animated.View style={styles.dateTabsRow}>
            <Animated.View style={{ opacity: headerFade }} pointerEvents={calVisible ? 'none' : 'auto'}>
              <ScrollView
                ref={tabScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsRow}
                onLayout={() => tabScrollRef.current?.scrollToEnd({ animated: false })}
              >
                {dateTabs.map((tab) => {
                  const isActive = tab.key === selectedKey;
                  return (
                    <TouchableOpacity
                      key={tab.key}
                      style={[styles.tab, isActive && styles.tabActive]}
                      onPress={() => setSelectedKey(tab.key)}
                      activeOpacity={0.7}
                    >
                      {tab.specialLabel ? (
                        <Text style={[styles.tabSpecial, isActive && styles.tabTextActive]}>
                          {tab.specialLabel}
                        </Text>
                      ) : (
                        <Text style={[styles.tabOrdinal, isActive && styles.tabTextActive]}>
                          <Text style={styles.tabDay}>{tab.day}</Text>
                          <Text style={styles.tabSup}>{tab.ordinal}</Text>
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </Animated.View>
        )}

        {/* ── Normal content ── */}
        <View style={styles.contentInner}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          ) : filteredScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barcode-outline" size={64} color={Colors.secondary} />
              <Text style={styles.emptyTitle}>{emptyMessage}</Text>
              <Text style={styles.emptyText}>
                Tap the scanner button below to scan a food label.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredScans}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ScanCard scan={item} onPress={() => openScan(item)} onDelete={() => deleteScan(item.id)} />
              )}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={Colors.primary}
                />
              }
            />
          )}
        </View>

        {/* Calendar overlay — starts at the same Y as the date tabs */}
        {calVisible && (
          <Animated.View style={[styles.calOverlay, { opacity: calAnim }]}>
            <CalendarPicker onCancel={closeDateRange} onApply={applyDateRange} />
          </Animated.View>
        )}
      </View>
    </ScreenLayout>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Content wrapper ──────────────────────────────────────────────────────────
  contentOuter: {
    flex: 1,
  },

  // ── Calendar overlay ─────────────────────────────────────────────────────────
  calOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // ── Calendar card ─────────────────────────────────────────────────────────────
  calCard: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 0,
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 4,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    marginBottom: 16,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 16,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavBtnDisabled: {
    backgroundColor: 'rgba(241,248,247,0.4)',
    opacity: 0.3,
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    textAlign: 'center',
  },

  // Day-of-week header row
  calDayHeaderRow: {
    flexDirection: 'row',
    height: 32,
    marginBottom: 8,
  },
  calDayCell: {
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
  },

  // Calendar grid
  calGrid: {
    gap: 2,
  },
  calWeekRow: {
    flexDirection: 'row',
    height: 40,
  },
  calDayBtn: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  calDaySelected: {
    backgroundColor: Colors.secondary,
  },
  calDayInRange: {
    backgroundColor: 'rgba(0,119,111,0.12)',
    borderRadius: 0,
  },
  calDayText: {
    fontSize: 16,
    fontFamily: 'Figtree_300Light',
    fontWeight: '300',
    color: Colors.primary,
    lineHeight: 24,
  },
  calDayTextToday: {
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
  },
  calDayTextFuture: {
    color: 'rgba(2,52,50,0.2)',
  },
  calDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
  },

  // Calendar footer
  calFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#aad4cd',
    marginTop: 16,
    paddingVertical: 16,
  },
  calFooterLabel: {
    fontSize: 16,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    flex: 1,
  },
  calActions: {
    flexDirection: 'row',
    gap: 8,
  },
  calCancelAction: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCancelActionText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 20,
  },
  calApplyBtn: {
    width: 77,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calApplyBtnDisabled: {
    opacity: 0.5,
  },
  calApplyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 20,
  },

  // ── Header extension ──────────────────────────────────────────────────────────
  headerExt: {
    paddingTop: 24,
    // paddingBottom matches the old gap between monthRow and dateTabs so the
    // contentOuter top lands exactly where the date tabs used to start.
    paddingBottom: 16,
  },
  dateTabsRow: {
    paddingBottom: 12,
  },
  contentInner: {
    flex: 1,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  headerBtnSlot: {
    position: 'relative',
  },
  cancelBtnOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  dateRangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateRangeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    lineHeight: 20,
  },

  // Date tabs
  tabsRow: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tab: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabActive: {
    backgroundColor: Colors.surface.tertiary,
    borderWidth: 2,
    borderColor: Colors.stroke.primary,
  },
  tabTextActive: {},
  tabSpecial: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  tabOrdinal: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
    lineHeight: 18,
  },
  tabDay: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  tabSup: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
  tabMonth: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },

  // ── Content states ────────────────────────────────────────────────────────────
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  // ── Scan cards ────────────────────────────────────────────────────────────────
  deleteAction: {
    backgroundColor: '#ff3f42',
    borderRadius: 16,
    width: 72,
    marginLeft: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 24,
    gap: 4,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: Colors.surface.secondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#aad4cd',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.s,
    paddingVertical: Spacing.s,
    gap: Spacing.s,
    ...Shadows.level4,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: Colors.surface.tertiary,
    overflow: 'hidden',
  },
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.secondary,
    letterSpacing: -0.26,
    lineHeight: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.36,
    lineHeight: 24,
  },
  nutriscoreCircle: {
    width: 24,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: Colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutriscoreText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    lineHeight: 20,
  },
  chevronBox: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
