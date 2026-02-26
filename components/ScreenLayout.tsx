import { useState, useRef, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';
import { MenuModal } from '@/components/MenuModal';
import Logo from '@/assets/images/logo.svg';

interface ScreenLayoutProps {
  /** Page title displayed below the header nav bar */
  title: string;
  /** Optional slot between title and children — e.g. month row + date tabs (not scrollable) */
  headerExtension?: ReactNode;
  children: ReactNode;
}

/**
 * ScreenLayout — shared page template for list-style screens.
 *
 * Renders:
 *   • Gradient header nav (logo + animated hamburger menu button)
 *   • Page title (H3, primary colour)
 *   • Optional headerExtension slot (month row, filter tabs, etc.)
 *   • Flex-1 content area for the screen's main list/content
 *   • Menu overlay with slide-in animation (same as Dashboard)
 *
 * Usage:
 *   <ScreenLayout title="Scan History" headerExtension={<DateTabsRow />}>
 *     <FlatList ... />
 *   </ScreenLayout>
 */
export function ScreenLayout({ title, headerExtension, children }: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Total height from screen top to bottom edge of the header bar
  // insets.top + 24 (paddingTop) + 36 (logo) + 16 (paddingBottom) + 4 (buffer)
  const navClearance = insets.top + 80;

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
    <SafeAreaView style={styles.safeArea} edges={[]}>
      {/* ── Main content column ─────────────────────────────────────────── */}
      <View style={styles.column}>
        {/* Title sits directly below the gradient header */}
        <View style={[styles.titleBlock, { paddingTop: navClearance + 20 }]}>
          <Text style={styles.titleText}>{title}</Text>
        </View>

        {/* Optional page-specific header (month row, filter tabs, etc.) */}
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
          locations={[0, 0.6, 1]}
          style={[styles.gradientFade, { height: navClearance + 28 }]}
          pointerEvents="none"
        />
      )}

      {/* ── Menu overlay ─────────────────────────────────────────────────── */}
      {menuVisible && (
        <Animated.View style={[styles.menuOverlay, { opacity: menuAnim }]}>
          <MenuModal onClose={closeMenu} onNavigate={closeMenuInstant} />
        </Animated.View>
      )}

      {/* ── Header bar (logo + menu button, always on top) ──────────────── */}
      <View
        style={[
          styles.headerBar,
          menuOpen && styles.headerBarMenu,
          { paddingTop: insets.top + 24 },
        ]}
      >
        <TouchableOpacity onPress={() => router.push('/(tabs)/' as any)} activeOpacity={0.7} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Logo width={141} height={36} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuBtn}
          onPress={menuOpen ? closeMenu : openMenu}
          activeOpacity={0.8}
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  column: {
    flex: 1,
  },
  titleBlock: {
    paddingHorizontal: 24,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: Colors.primary,
    letterSpacing: -0.48,
    lineHeight: 30,
  },
  contentArea: {
    flex: 1,
  },
  gradientFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
    elevation: 15,
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    elevation: 10,
  },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    zIndex: 20,
    elevation: 20,
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
    shadowColor: '#444770',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
});
