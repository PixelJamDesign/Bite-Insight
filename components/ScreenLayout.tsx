import {
  createContext,
  cloneElement,
  isValidElement,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  type FlatList,
  type FlatListProps,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { MenuModal, MenuBarLeading } from '@/components/MenuModal';
import { IconButton } from '@/components/IconButton';
import { MenuArrowLeftIcon } from '@/components/MenuIcons';
import { HeaderEdge } from '@/components/HeaderEdge';
import { titleCollapse } from '@/components/headerMotion';

/** A subtitle, or a function that builds it for the large or compact header. */
type Subtitle = ReactNode | ((compact: boolean) => ReactNode);

interface ScreenLayoutProps {
  /** Page title, shown in the header */
  title: string;
  /**
   * Optional supporting line under the title. A string is styled for you.
   * For mixed weights pass a function returning a <Text> built from
   * `subtitleStyles(compact)`, so the collapsed header gets the small size.
   */
  subtitle?: Subtitle;
  /** Controls pinned under the title (date tabs, filters, etc.). They scroll
   *  up with the title, then stay put once the header has collapsed. */
  headerExtension?: ReactNode;
  /** Back button action. Defaults to going back, or to the dashboard. */
  onBack?: () => void;
  children: ReactNode;
}

// Figma "Header Nav" (5856:30586): 48px buttons, 16 below them, and the
// large title stack another 16 above whatever follows.
const NAV_TOP_GAP = 24;
const BUTTON = 48;
const NAV_BOTTOM_GAP = 16;
const TITLE_BOTTOM_GAP = 16;

interface ScreenHeaderContextValue {
  /** Scroll offset of the screen's main list. */
  scrollY: Animated.Value;
  /** Space the list needs at the top to clear the expanded header. */
  insetTop: number;
  /** How far the list scrolls before the large title has gone. */
  collapseDistance: number;
  /** Marks a list as owning the inset while it's mounted. */
  register: () => () => void;
}

const ScreenHeaderContext = createContext<ScreenHeaderContextValue | null>(null);

/** The header's scroll state, for lists that can't use HeaderScrollView. */
export function useScreenHeader(): ScreenHeaderContextValue {
  const ctx = useContext(ScreenHeaderContext);
  if (!ctx) throw new Error('useScreenHeader must be used inside ScreenLayout');
  return ctx;
}

/**
 * ScreenLayout — shared page template for every screen after the dashboard.
 *
 * Follows the Figma "Header Nav" component (5856:30586) and the Meal
 * Planner / Meal Planner (Scrolled) frames, and behaves like an iOS large
 * title:
 *
 *   • A fixed row: back button, menu button.
 *   • Under it the large title (24px) + subtitle, then headerExtension.
 *   • As the list scrolls, the title slides up under the button row at
 *     the list's own speed and a compact title (18px + 14px subtitle)
 *     fades in between the buttons. headerExtension then stays pinned.
 *
 * The list has to be a HeaderScrollView or HeaderFlatList (or use
 * useScreenHeader) for the header to collapse: they pad their content to
 * start below the header and report their scroll. Anything else (loading
 * and empty states) is placed below the expanded header automatically.
 *
 * The menu overlay slides in as on the dashboard; while it's open the
 * header shows the logo.
 *
 * Usage:
 *   <ScreenLayout title="Scan History" subtitle="Everything you've scanned">
 *     <HeaderFlatList ... />
 *   </ScreenLayout>
 */
export function ScreenLayout({ title, subtitle, headerExtension, onBack, children }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  const navTop = insets.top + NAV_TOP_GAP;
  const navHeight = navTop + BUTTON + NAV_BOTTOM_GAP;

  // Measured, since the subtitle is optional and the title may wrap.
  const [titleHeight, setTitleHeight] = useState(subtitle != null ? 57 + TITLE_BOTTOM_GAP : 30 + TITLE_BOTTOM_GAP);
  const [extensionHeight, setExtensionHeight] = useState(0);
  const insetTop = titleHeight + extensionHeight;

  const scrollY = useRef(new Animated.Value(0)).current;
  const [listCount, setListCount] = useState(0);
  const register = useCallback(() => {
    scrollY.setValue(0);
    setListCount((n) => n + 1);
    return () => {
      setListCount((n) => n - 1);
      scrollY.setValue(0);
    };
  }, [scrollY]);

  const context = useMemo(
    () => ({ scrollY, insetTop, collapseDistance: titleHeight, register }),
    [scrollY, insetTop, titleHeight, register],
  );

  // The title and pinned controls move 1:1 with the list until the title
  // has gone, and follow the iOS overscroll down.
  const T = titleHeight;
  const stackShift = scrollY.interpolate({
    inputRange: [-1, 0, T, T + 1],
    outputRange: [1, 0, -T, -T],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });
  const { largeOpacity, compactOpacity, compactShift } = titleCollapse(scrollY, T);

  function onTitleLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== titleHeight) setTitleHeight(h);
  }
  function onExtensionLayout(e: LayoutChangeEvent) {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== extensionHeight) setExtensionHeight(h);
  }

  function goBack() {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/dashboard' as never);
  }

  function openMenu() {
    setMenuVisible(true);
    setMenuOpen(true);
    (navigation as any).setOptions({ tabBarStyle: { display: 'none' } });
    Animated.timing(menuAnim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }

  function closeMenu() {
    setMenuOpen(false);
    (navigation as any).setOptions({ tabBarStyle: undefined });
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setMenuVisible(false));
  }

  function closeMenuInstant() {
    menuAnim.setValue(0);
    setMenuOpen(false);
    setMenuVisible(false);
    (navigation as any).setOptions({ tabBarStyle: undefined });
  }

  const renderSubtitle = (compact: boolean) => {
    if (subtitle == null) return null;
    if (typeof subtitle === 'function') return subtitle(compact);
    if (typeof subtitle === 'string') {
      return (
        <Text style={compact ? styles.compactSubtitle : styles.subtitleText} numberOfLines={compact ? 1 : undefined}>
          {subtitle}
        </Text>
      );
    }
    return subtitle;
  };

  return (
    <ScreenHeaderContext.Provider value={context}>
      <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingBottom: insets.bottom }]} edges={[]}>
        {/* ── Content: under the header. A HeaderScrollView pads itself;
            anything else is placed below the expanded header. ── */}
        <View style={[styles.contentArea, { top: navHeight, paddingTop: listCount > 0 ? 0 : insetTop }]}>
          {children}
        </View>

        {/* ── Large title + pinned controls ── */}
        <Animated.View style={[styles.stack, { top: navHeight, transform: [{ translateY: stackShift }] }]}>
          {/* First, so the pinned controls (e.g. a card that opens over
              the list) draw over the fade. */}
          <HeaderEdge scrollY={scrollY} />
          <Animated.View style={[styles.largeTitle, { opacity: largeOpacity }]} onLayout={onTitleLayout}>
            <Text style={styles.titleText} numberOfLines={2} accessibilityRole="header">
              {title}
            </Text>
            {renderSubtitle(false)}
          </Animated.View>
          <View onLayout={onExtensionLayout}>{headerExtension}</View>
        </Animated.View>

        {/* ── Menu overlay ── */}
        {menuVisible && (
          <Animated.View style={[styles.menuOverlay, { opacity: menuAnim }]}>
            <MenuModal onClose={closeMenu} onNavigate={closeMenuInstant} />
          </Animated.View>
        )}

        {/* ── Button row (always on top) ── */}
        <View style={[styles.navBar, menuOpen && styles.navBarMenu, { paddingTop: navTop }]}>
          {menuOpen ? (
            <View style={styles.logo}>
              <MenuBarLeading onLogoPress={() => router.push('/(tabs)/dashboard' as any)} />
            </View>
          ) : (
            <>
              <IconButton
                icon={<MenuArrowLeftIcon color={Colors.primary} size={16} />}
                onPress={goBack}
                hitSlop={0}
                accessibilityLabel="Back"
              />
              <Animated.View
                style={[styles.compactStack, { opacity: compactOpacity, transform: [{ translateY: compactShift }] }]}
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
              >
                <Text style={styles.compactTitle} numberOfLines={1}>
                  {title}
                </Text>
                {renderSubtitle(true)}
              </Animated.View>
            </>
          )}
          <IconButton
            icon={<Ionicons name={menuOpen ? 'close' : 'menu-outline'} size={24} color={Colors.primary} />}
            variant={menuOpen ? 'onWhite' : 'onTeal'}
            onPress={menuOpen ? closeMenu : openMenu}
            hitSlop={0}
            accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
          />
        </View>
      </SafeAreaView>
    </ScreenHeaderContext.Provider>
  );
}

// ─── Lists that drive the header ───────────────────────────────────────────

type ScrollHandler = (e: NativeSyntheticEvent<NativeScrollEvent>) => void;

/** Registers the list and returns its scroll handler and padding. */
function useHeaderList(onScroll?: ScrollHandler | null) {
  const { scrollY, insetTop, register } = useScreenHeader();
  useLayoutEffect(() => register(), [register]);
  const handler = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
        listener: onScroll ?? undefined,
      }),
    [scrollY, onScroll],
  );
  return { insetTop, handler };
}

/** Adds the header inset to whatever top padding the content already has. */
function padTop(style: StyleProp<ViewStyle>, inset: number): StyleProp<ViewStyle> {
  const flat = StyleSheet.flatten(style) ?? {};
  const own = flat.paddingTop ?? flat.paddingVertical ?? flat.padding ?? 0;
  return [style, { paddingTop: (typeof own === 'number' ? own : 0) + inset }];
}

/** Android draws the pull-to-refresh spinner at the top of the list,
 *  under the header, unless it's offset. iOS shows it in the overscroll. */
const spinnerOffset = (inset: number) => (Platform.OS === 'android' ? inset : undefined);

/** ScrollView for a ScreenLayout screen: scrolls under the header and collapses it. */
export function HeaderScrollView({
  ref,
  contentContainerStyle,
  onScroll,
  refreshControl,
  ...rest
}: ScrollViewProps & { ref?: Ref<ScrollView> }) {
  const { insetTop, handler } = useHeaderList(onScroll);
  return (
    <Animated.ScrollView
      ref={ref as any}
      {...rest}
      onScroll={handler}
      scrollEventThrottle={16}
      contentContainerStyle={padTop(contentContainerStyle, insetTop)}
      scrollIndicatorInsets={{ top: insetTop }}
      refreshControl={
        isValidElement(refreshControl)
          ? cloneElement(refreshControl as ReactElement<any>, { progressViewOffset: spinnerOffset(insetTop) })
          : refreshControl
      }
    />
  );
}

/** FlatList for a ScreenLayout screen: scrolls under the header and collapses it. */
export function HeaderFlatList<T>({
  ref,
  contentContainerStyle,
  onScroll,
  ...rest
}: FlatListProps<T> & { ref?: Ref<FlatList<T>> }) {
  const { insetTop, handler } = useHeaderList(onScroll);
  return (
    <Animated.FlatList
      ref={ref as any}
      {...(rest as any)}
      onScroll={handler}
      scrollEventThrottle={16}
      contentContainerStyle={padTop(contentContainerStyle, insetTop)}
      scrollIndicatorInsets={{ top: insetTop }}
      progressViewOffset={spinnerOffset(insetTop)}
    />
  );
}

// ─── Subtitle styles ───────────────────────────────────────────────────────

/** Subtitle text styles, for screens that build a mixed-weight subtitle. */
export const screenSubtitleStyles = StyleSheet.create({
  light: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
  },
  bold: {
    fontSize: 16,
    lineHeight: 27,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.32,
  },
});

/** The same, sized for the collapsed header (14px). */
export const screenSubtitleCompactStyles = StyleSheet.create({
  light: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '300',
    fontFamily: 'Figtree_300Light',
    color: Colors.secondary,
    letterSpacing: -0.14,
  },
  bold: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.28,
  },
});

/** Subtitle styles for the large (false) or collapsed (true) header. */
export const subtitleStyles = (compact: boolean) =>
  compact ? screenSubtitleCompactStyles : screenSubtitleStyles;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  stack: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    zIndex: 5,
  },
  largeTitle: {
    paddingHorizontal: 24,
    paddingBottom: TITLE_BOTTOM_GAP,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  subtitleText: screenSubtitleStyles.light,
  compactStack: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
  },
  compactSubtitle: screenSubtitleCompactStyles.light,
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: NAV_BOTTOM_GAP,
    backgroundColor: Colors.background,
    zIndex: 20,
  },
  navBarMenu: {
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  logo: {
    flex: 1,
  },
});
