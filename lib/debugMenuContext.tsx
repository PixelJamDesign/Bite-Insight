/**
 * DebugMenuContext — owns the visibility of the hidden debug menu.
 *
 * The menu is opened via a 3-second long-press on the version
 * footer inside MenuModal. It's available in ALL builds (including
 * TestFlight / App Store) so QA can trigger sheets and reset state
 * directly on production-signed builds. The gesture is undiscoverable
 * to normal users — nobody long-presses a version number.
 *
 * To prevent the menu from ever appearing in genuine consumer hands,
 * we could gate this on Constants.expoConfig?.extra?.releaseChannel
 * being 'staging' or similar. For now we trust the obscurity of the
 * gesture itself.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface DebugMenuContextValue {
  visible: boolean;
  showDebugMenu: () => void;
  hideDebugMenu: () => void;
}

const DebugMenuContext = createContext<DebugMenuContextValue>({
  visible: false,
  showDebugMenu: () => {},
  hideDebugMenu: () => {},
});

export function DebugMenuProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  const showDebugMenu = useCallback(() => setVisible(true), []);
  const hideDebugMenu = useCallback(() => setVisible(false), []);

  const value = useMemo<DebugMenuContextValue>(
    () => ({ visible, showDebugMenu, hideDebugMenu }),
    [visible, showDebugMenu, hideDebugMenu],
  );

  return <DebugMenuContext.Provider value={value}>{children}</DebugMenuContext.Provider>;
}

export function useDebugMenu() {
  return useContext(DebugMenuContext);
}
