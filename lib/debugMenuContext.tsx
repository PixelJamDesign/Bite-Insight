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
  /** OFF "Help add this product" sheet — rendered at app root, triggered from
   *  the debug menu (the debug menu itself returns null when hidden, so the
   *  sheet can't live inside it). */
  offContributeVisible: boolean;
  showOffContribute: () => void;
  hideOffContribute: () => void;
}

const DebugMenuContext = createContext<DebugMenuContextValue>({
  visible: false,
  showDebugMenu: () => {},
  hideDebugMenu: () => {},
  offContributeVisible: false,
  showOffContribute: () => {},
  hideOffContribute: () => {},
});

export function DebugMenuProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [offContributeVisible, setOffContributeVisible] = useState(false);

  const showDebugMenu = useCallback(() => setVisible(true), []);
  const hideDebugMenu = useCallback(() => setVisible(false), []);
  const showOffContribute = useCallback(() => setOffContributeVisible(true), []);
  const hideOffContribute = useCallback(() => setOffContributeVisible(false), []);

  const value = useMemo<DebugMenuContextValue>(
    () => ({
      visible, showDebugMenu, hideDebugMenu,
      offContributeVisible, showOffContribute, hideOffContribute,
    }),
    [visible, showDebugMenu, hideDebugMenu, offContributeVisible, showOffContribute, hideOffContribute],
  );

  return <DebugMenuContext.Provider value={value}>{children}</DebugMenuContext.Provider>;
}

export function useDebugMenu() {
  return useContext(DebugMenuContext);
}
