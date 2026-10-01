import { useState, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { Colors, Shadows } from '@/constants/theme';
import { MenuModal } from '@/components/MenuModal';
import Logo from '@/assets/images/logo.svg';

interface ScreenLayoutProps {
  /** Page title, shown in the header */
  title: string;
  /**
   * Optional supporting line under the title. A string is styled for you;
   * pass a <Text> (with nested bold <Text>) for mixed weights.
   */
  subtitle?: ReactNode;
  /** Optional slot between the header and children — e.g. date tabs (not scrollable) */
  headerExtension?: ReactNode;
  children: ReactNode;
}

/**
 * ScreenLayout — shared page template for every screen after the dashboard.
 *
 * Follows the Figma "Masthead (with Title)" component (Header Nav/No,
 * node 5856:30586). The dashboard keeps the logo masthead; everything
 * else puts the page title in the header:
 *
 *   • Gradient header: title (H3) + optional subtitle, menu button
 *   • Optional headerExtension slot (date tabs, filters, etc.)
 *   • Flex-1 content area for the screen's main list/content
 *   • Menu overlay with slide-in animation (same as Dashboard). While the
 *     menu is open the header shows the logo, as it does on the dashboard.
 *
 * Usage:
 *   <ScreenLayout title="Scan History" subtitle="Everything you've scanned">
 *     <FlatList ... />
 *   </ScreenLayout>
 */
export function ScreenLayout({ title, subtitle, headerExtension, children }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Header height drives where the content starts. Estimated up front
  // (insets.top + 24 top padding + title row + 16 bottom padding), then
  // measured, since the subtitle is optional and may wrap.
  const headerTop = insets.top + 24;
  const [headerHeight, setHeaderHeight] = useState(
    headerTop + (subtitle ? 57 : 48) + 16,
  );
  function onHeaderLayout(e: LayoutChangeEvent) {
    // Only the closed header sets the height — the menu's logo header is
    // a different size and must not shift the page behind it.
    if (menuOpen) return;
    const h = Math.round(e.nativeEvent.layout.height);
    if (h !== headerHeight) setHeaderHeight(h);
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

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingBottom: insets.bottom }]} edges={[]}>
      {/* ── Main content column ─────────────────────────────────────────── */}
      <View style={[styles.column, { paddingTop: headerHeight }]}>
        {/* Optional page-specific header (date tabs, filters, etc.) */}
        {headerExtension}

        {/* Main content area — FlatList / ScrollView / etc. */}
        <View style={styles.contentArea}>
          {children}
        </View>
      </View>

      {/* ── Gradient fade (non-interactive, masks content behind header) ── */}
      {!menuVisible && (
        <LinearGradient
          colors={[Colors.background, Colors.background, 'rgba(226,241,238,0)']}
          locations={[0, 0.82, 1]}
          style={[styles.gradientFade, { height: headerHeight }]}
          pointerEvents="none"
        />
      )}

      {/* ── Menu overlay ─────────────────────────────────────────────────── */}
      {menuVisible && (
        <Animated.View style={[styles.menuOverlay, { opacity: menuAnim }]}>
          <MenuModal onClose={closeMenu} onNavigate={closeMenuInstant} />
        </Animated.View>
      )}

      {/* ── Header bar (title or logo + menu button, always on top) ─────── */}
      <View
        style={[styles.headerBar, menuOpen && styles.headerBarMenu, { paddingTop: headerTop }]}
        onLayout={onHeaderLayout}
      >
        {menuOpen ? (
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/dashboard' as any)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Logo width={141} height={36} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerStack}>
            <Text style={styles.titleText} numberOfLines={2} accessibilityRole="header">
              {title}
            </Text>
            {subtitle != null &&
              (typeof subtitle === 'string' ? (
                <Text style={styles.subtitleText}>{subtitle}</Text>
              ) : (
                subtitle
              ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={menuOpen ? closeMenu : openMenu}
          activeOpacity={0.8}
          accessibilityLabel={menuOpen ? 'Close menu' : 'Open menu'}
        >
          <Ionicons
            name={menuOpen ? 'close' : 'menu-outline'}
            size={24}
            color={Colors.primary}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  column: {
    flex: 1,
  },
  headerStack: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
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
  contentArea: {
    flex: 1,
  },
  gradientFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 20,
  },
  headerBarMenu: {
    backgroundColor: '#fff',
  },
  menuBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.level3,
  },
});
