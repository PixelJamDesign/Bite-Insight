/**
 * ToastContext — lightweight toast/snackbar system.
 *
 * Usage:
 *   const { showToast } = useToast();
 *   showToast({ message: 'Saved', variant: 'success' });
 *   showToast({ message: 'Added to recipe', action: { label: 'View', onPress: () => router.push('/recipes/abc') } });
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Shadows, Spacing, Radius, Typography } from '@/constants/theme';

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Duration in ms before auto-dismiss. Defaults to 3000. 0 = sticky. */
  durationMs?: number;
  /** Optional tap-action button on the right of the toast */
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 100, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      setToast(null);
    });
  }, [translateY, opacity]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setToast(options);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      const duration = options.durationMs ?? 3000;
      if (duration > 0) {
        timerRef.current = setTimeout(() => {
          dismissToast();
        }, duration);
      }
    },
    [translateY, opacity, dismissToast],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast }),
    [showToast, dismissToast],
  );

  const variantColor = toast
    ? {
        info: Colors.primary,
        success: Colors.accent,
        error: Colors.status.negative,
      }[toast.variant ?? 'info']
    : Colors.primary;

  const variantIcon = toast
    ? ({
        info: 'information-circle' as const,
        success: 'checkmark-circle' as const,
        error: 'alert-circle' as const,
      }[toast.variant ?? 'info'])
    : ('information-circle' as const);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <SafeAreaView style={styles.container} pointerEvents="box-none" edges={['bottom']}>
          <Animated.View
            style={[
              styles.toast,
              { backgroundColor: variantColor, opacity, transform: [{ translateY }] },
            ]}
          >
            <Ionicons name={variantIcon} size={20} color="#fff" />
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
            {toast.action && (
              <TouchableOpacity
                onPress={() => {
                  toast.action!.onPress();
                  dismissToast();
                }}
                style={styles.actionBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.actionText}>{toast.action.label}</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingBottom: 140,   // above the tab bar
    zIndex: 100,
    elevation: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.s,
    paddingVertical: 14,
    borderRadius: Radius.m,
    marginHorizontal: Spacing.s,
    maxWidth: 360,
    ...Shadows.level2,
  },
  message: {
    flex: 1,
    ...Typography.h6,
    color: '#fff',
    fontFamily: 'Figtree_700Bold',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'Figtree_700Bold',
    color: '#fff',
    letterSpacing: -0.26,
  },
});
