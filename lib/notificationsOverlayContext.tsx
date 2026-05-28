/**
 * notificationsOverlayContext — visibility state for the inbox overlay.
 *
 * Mirrors menuContext exactly so the notifications screen opens and
 * closes with the same animation timing as the side menu. The bell
 * icon calls showNotifications(); the overlay component listens for
 * `visible` and `anim` and animates its opacity accordingly.
 *
 * Same intent as menuContext: keep state out of the URL so we don't
 * leak a route, and so the logo can stay at the same absolute coords
 * across the dashboard and the overlay (no jump).
 */
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated, Platform } from 'react-native';

interface NotificationsOverlayContextValue {
  /** True the moment user opens it; flips false at the start of the close
   *  animation so the bell icon can update immediately. */
  open: boolean;
  /** Stays true through the close animation so the overlay can finish
   *  fading out before we unmount. */
  visible: boolean;
  /** 0 (hidden) → 1 (shown). Drive opacity / transforms off this. */
  anim: Animated.Value;
  show: () => void;
  hide: () => void;
  hideInstant: () => void;
}

const NotificationsOverlayContext = createContext<NotificationsOverlayContextValue>({
  open: false,
  visible: false,
  anim: new Animated.Value(0),
  show: () => {},
  hide: () => {},
  hideInstant: () => {},
});

export function NotificationsOverlayProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const show = useCallback(() => {
    setVisible(true);
    setOpen(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const hide = useCallback(() => {
    setOpen(false);
    const finalize = () => setVisible(false);
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) finalize(); });
    // Android safety — native driver callback occasionally drops
    if (Platform.OS === 'android') setTimeout(finalize, 200);
  }, [anim]);

  const hideInstant = useCallback(() => {
    anim.setValue(0);
    setOpen(false);
    setVisible(false);
  }, [anim]);

  return (
    <NotificationsOverlayContext.Provider value={{ open, visible, anim, show, hide, hideInstant }}>
      {children}
    </NotificationsOverlayContext.Provider>
  );
}

export function useNotificationsOverlay() {
  return useContext(NotificationsOverlayContext);
}
