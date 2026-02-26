import { createContext, useContext, useState, ReactNode } from 'react';

interface UpsellSheetContextValue {
  visible: boolean;
  showUpsell: () => void;
  hideUpsell: () => void;
}

const UpsellSheetContext = createContext<UpsellSheetContextValue>({
  visible: false,
  showUpsell: () => {},
  hideUpsell: () => {},
});

export function UpsellSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <UpsellSheetContext.Provider
      value={{
        visible,
        showUpsell: () => setVisible(true),
        hideUpsell: () => setVisible(false),
      }}
    >
      {children}
    </UpsellSheetContext.Provider>
  );
}

export function useUpsellSheet() {
  return useContext(UpsellSheetContext);
}
