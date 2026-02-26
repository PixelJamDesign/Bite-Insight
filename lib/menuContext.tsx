import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { Animated, Platform } from 'react-native';

interface MenuContextValue {
  menuOpen: boolean;
  menuVisible: boolean;
  menuAnim: Animated.Value;
  openMenu: () => void;
  closeMenu: () => void;
  closeMenuInstant: () => void;
}

const MenuContext = createContext<MenuContextValue>({
  menuOpen: false,
  menuVisible: false,
  menuAnim: new Animated.Value(0),
  openMenu: () => {},
  closeMenu: () => {},
  closeMenuInstant: () => {},
});

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  function openMenu() {
    setMenuVisible(true);
    setMenuOpen(true);
    Animated.timing(menuAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    const hide = () => setMenuVisible(false);
    Animated.timing(menuAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => { if (finished) hide(); });
    // Android: native driver callback can silently fail — guarantee cleanup
    if (Platform.OS === 'android') setTimeout(hide, 200);
  }, [menuAnim]);

  function closeMenuInstant() {
    menuAnim.setValue(0);
    setMenuOpen(false);
    setMenuVisible(false);
  }

  return (
    <MenuContext.Provider value={{ menuOpen, menuVisible, menuAnim, openMenu, closeMenu, closeMenuInstant }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  return useContext(MenuContext);
}
