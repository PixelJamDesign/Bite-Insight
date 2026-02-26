import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Animated, View, Text, TouchableOpacity, Image, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { DashboardIcon, RecipesIcon, HistoryIcon, ScannerIcon } from '@/components/TabIcons';
import { useCachedAvatar } from '@/lib/useCachedAvatar';
import { TabBarSlideProvider, useTabBarSlide } from '@/lib/tabBarContext';
import { MenuProvider, useMenu } from '@/lib/menuContext';
import { MenuModal } from '@/components/MenuModal';
import Logo from '../../assets/images/logo.svg';

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const tabBarSlide = useTabBarSlide();
  const { openMenu } = useMenu();
  const { session, avatarUrl } = useAuth();
  const cachedAvatarUrl = useCachedAvatar(avatarUrl);

  const tabPositions = useRef<Record<string, number>>({});
  // Start invisible — revealed only after onLayout has set the correct position
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorOpacity = useRef(new Animated.Value(0)).current;
  const initializedRef = useRef(false);

  useWindowDimensions(); // re-renders on browser resize, triggering onLayout recalculation

  const initials = getInitials(session?.user?.user_metadata?.full_name);
  const activeName = state.routes[state.index]?.name;

  useEffect(() => {
    const x = tabPositions.current[activeName];
    if (x === undefined) return;
    if (!initializedRef.current) {
      indicatorX.setValue(x);
      indicatorOpacity.setValue(1);
      initializedRef.current = true;
      return;
    }
    Animated.spring(indicatorX, {
      toValue: x,
      useNativeDriver: true,
      damping: 20,
      stiffness: 180,
      mass: 0.8,
    }).start();
  }, [activeName]);

  // Hide when the active screen sets tabBarStyle: { display: 'none' }
  const focusedOptions = descriptors[state.routes[state.index].key]?.options as any;
  if (focusedOptions?.tabBarStyle?.display === 'none') return null;

  return (
    <Animated.View style={[styles.wrapper, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 28 : 8), transform: [{ translateY: tabBarSlide }] }]}>
      {/* Fade gradient behind nav */}
      <LinearGradient
        colors={['rgba(226,241,238,0)', '#e2f1ee']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.pill}>
        <View style={styles.blurClip} pointerEvents="none">
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFill} />
          ) : (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(241,248,247,0.85)' }]} />
          )}
        </View>
        {/* Shared sliding indicator */}
        <Animated.View
          style={[styles.activeIndicator, { opacity: indicatorOpacity, transform: [{ translateX: indicatorX }] }]}
          pointerEvents="none"
        />

        {state.routes.map((route, index) => {
          // Skip routes that aren't part of the visible tab pill
          if (!['index', 'recipes', 'scanner', 'history'].includes(route.name)) return null;

          const isFocused = state.index === index;
          const isScanner = route.name === 'scanner';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // ── Scanner — large elevated dark circle ──
          if (isScanner) {
            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.scannerButton}
                activeOpacity={0.9}
              >
                <View style={styles.scannerInner}>
                  <ScannerIcon size={42} />
                </View>
              </TouchableOpacity>
            );
          }

          // ── Standard tabs ──
          const iconColor = isFocused ? Colors.primary : Colors.secondary;

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
              onLayout={(e) => {
                const x = e.nativeEvent.layout.x;
                tabPositions.current[route.name] = x;
                if (isFocused) {
                  // Always snap on layout/resize so the indicator tracks correctly
                  indicatorX.setValue(x);
                  if (!initializedRef.current) {
                    indicatorOpacity.setValue(1);
                    initializedRef.current = true;
                  }
                }
              }}
            >
              <View style={styles.iconContainer}>
                {route.name === 'index' && <DashboardIcon color={iconColor} size={24} />}
                {route.name === 'recipes' && <RecipesIcon color={iconColor} size={24} />}
                {route.name === 'history' && <HistoryIcon color={iconColor} size={24} />}
              </View>
            </TouchableOpacity>
          );
        })}

        {/* ── Avatar — opens menu instead of navigating to a screen ── */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={openMenu}
          activeOpacity={0.7}
        >
          <View style={styles.avatarCircle}>
            {cachedAvatarUrl ? (
              <Image source={{ uri: cachedAvatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function MenuOverlay() {
  const { menuVisible, menuAnim, closeMenu, closeMenuInstant } = useMenu();
  const insets = useSafeAreaInsets();
  if (!menuVisible) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.menuOverlay, { opacity: menuAnim }]}>
      <MenuModal onClose={closeMenu} onNavigate={closeMenuInstant} />
      {/* Header sits on top of the scroll content */}
      <View style={[styles.menuHeader, { paddingTop: insets.top + 24 }]}>
        <Logo width={141} height={36} />
        <TouchableOpacity style={styles.menuCloseBtn} onPress={closeMenu} activeOpacity={0.8}>
          <Ionicons name="close" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(241,248,247,0.25)',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 6,
    height: 60,
    width: '100%',
    maxWidth: 600,
    shadowColor: Platform.OS === 'android' ? '#aab4b3' : '#444770',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: Platform.OS === 'android' ? 0 : 6,
  },
  blurClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
    overflow: 'hidden',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
  },
  activeIndicator: {
    position: 'absolute',
    top: 4,
    left: -2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 999,
    width: 48,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: Platform.OS === 'android' ? '#aab4b3' : '#444770',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: Platform.OS === 'android' ? 1 : 4,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannerInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Platform.OS === 'android' ? '#aab4b3' : '#444770',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 1 : 8,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    shadowColor: Platform.OS === 'android' ? '#aab4b3' : '#444770',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 1 : 4,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Figtree_700Bold',
    fontWeight: '700',
    letterSpacing: 0,
  },
  menuOverlay: {
    zIndex: 100,
    elevation: 100,
  },
  menuHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  menuCloseBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.surface.tertiary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.stroke.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function TabLayout() {
  return (
    <TabBarSlideProvider>
      <MenuProvider>
        <View style={{ flex: 1 }}>
          <Tabs
            tabBar={(props) => <CustomTabBar {...props} />}
            screenOptions={{ headerShown: false }}
          >
            <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
            <Tabs.Screen name="recipes" options={{ title: 'Recipes' }} />
            <Tabs.Screen name="scanner" options={{ title: 'Scanner' }} />
            <Tabs.Screen name="history" options={{ title: 'History' }} />
            <Tabs.Screen name="ingredient-preferences" options={{ href: null }} />
          </Tabs>
          <MenuOverlay />
        </View>
      </MenuProvider>
    </TabBarSlideProvider>
  );
}
