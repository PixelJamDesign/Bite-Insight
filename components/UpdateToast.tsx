/**
 * UpdateToast — bottom-anchored banner shown when the installed app
 * version is older than `app_config.latest_app_version` in Supabase.
 *
 * Tapping "Update" opens the platform's store listing page so the
 * user can grab the new build. The toast can be dismissed by
 * swiping it downwards — there's deliberately no close button, so
 * a user who's already swiped past the prompt has to engage with
 * it intentionally to make it go away.
 *
 * Visual spec from Figma (node 4980:9324):
 *  - Dark teal gradient background (#00776f → #023432)
 *  - 16px corner radius, green-tinted drop shadow on iOS
 *  - White rounded-square logo block on the left, rotated -10.17deg,
 *    icon fills the white square edge-to-edge
 *  - Title (h4) + body copy (bodySmall) in white
 *  - Solid accent-teal Update button on the right
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';
import { openStoreListing } from '@/lib/openStore';

interface UpdateToastProps {
  visible: boolean;
  onDismiss: () => void;
}

/** Pixels of downward drag past which a release commits to dismiss. */
const DISMISS_THRESHOLD = 50;
/** Off-screen Y position the toast slides to/from. */
const OFFSCREEN_Y = 220;

export function UpdateToast({ visible, onDismiss }: UpdateToastProps) {
  const { t } = useTranslation('common');
  // Slide up from below the tab bar. Starts at OFFSCREEN_Y
  // and springs to rest at its natural position above the tab bar.
  const translateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // PanResponder for swipe-down-to-dismiss. We only react to
  // downward (positive dy) drags; horizontal or upward motion is
  // forwarded through so the underlying screen can still scroll.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        return gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      },
      onPanResponderMove: (_evt, gesture) => {
        // Rubber-band: ignore drag-up beyond 0, follow drag-down 1:1.
        const dy = Math.max(0, gesture.dy);
        translateY.setValue(dy);
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD || gesture.vy > 0.6) {
          // Commit dismiss: animate out, then notify parent.
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: OFFSCREEN_Y,
              duration: 200,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(() => {
            onDismiss();
          });
        } else {
          // Snap back to rest.
          Animated.spring(translateY, {
            toValue: 0,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 60,
          friction: 11,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: OFFSCREEN_Y,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, opacity]);

  if (!visible) return null;

  const handleUpdate = async () => {
    onDismiss();
    await openStoreListing();
  };

  return (
    <SafeAreaView style={styles.container} pointerEvents="box-none" edges={['bottom']}>
      <Animated.View
        style={[styles.shadowWrap, { opacity, transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#00776f', '#023432']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.toast}
        >
          {/* Logo block — white rounded square, rotated -10.17deg.
              Icon fills the white square edge-to-edge with the same
              border radius so it reads as a single rounded tile. */}
          <View style={styles.logoOuter}>
            <View style={styles.logoInner}>
              <Image
                source={require('@/assets/images/icon.png')}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* Title + subtitle. textCol takes the remaining horizontal
              space; subtitle is allowed up to 3 lines so common.json
              copy doesn't truncate in any of the 12 locales. */}
          <View style={styles.textCol}>
            <Text style={styles.title} numberOfLines={1}>
              {t('updateToast.title')}
            </Text>
            <Text style={styles.subtitle} numberOfLines={3}>
              {t('updateToast.body')}
            </Text>
          </View>

          {/* Update button */}
          <TouchableOpacity
            onPress={handleUpdate}
            activeOpacity={0.8}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{t('updateToast.button')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // Sits just above the tab bar (~100px tall with safe-area
    // padding on notched devices). Matches the offset used by
    // ToastContext for its bottom-anchored snackbar.
    paddingBottom: 110,
    zIndex: 200,
    elevation: 200,
    paddingHorizontal: Spacing.s,
  },
  // Wrapping the gradient with a shadow-only view keeps the iOS
  // drop shadow rendering as a separate layer (LinearGradient + the
  // shadowColor prop on the same view can confuse some RN versions
  // and stop the shadow from drawing).
  shadowWrap: {
    borderRadius: Radius.l,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(68,112,78,1)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
      },
      default: {},
    }),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.s,
    paddingHorizontal: Spacing.s,
    borderRadius: Radius.l,
    overflow: 'hidden',
  },
  logoOuter: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10.17deg' }],
  },
  // Icon fills the white tile edge-to-edge; we drop the previous
  // inner gradient because the icon itself is the surface.
  logoInner: {
    width: 50,
    height: 50,
    borderRadius: 11,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  logoImage: {
    width: 50,
    height: 50,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.h4,
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
  },
  subtitle: {
    ...Typography.bodySmall,
    fontFamily: 'Figtree_300Light',
    color: '#ffffff',
    opacity: 0.9,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.m,
  },
  buttonText: {
    ...Typography.h4,
    fontFamily: 'Figtree_700Bold',
    color: '#ffffff',
  },
});
