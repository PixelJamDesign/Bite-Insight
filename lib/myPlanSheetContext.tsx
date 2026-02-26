import { createContext, useContext, useState, ReactNode } from 'react';

interface MyPlanSheetContextValue {
  visible: boolean;
  showMyPlan: () => void;
  hideMyPlan: () => void;
}

const MyPlanSheetContext = createContext<MyPlanSheetContextValue>({
  visible: false,
  showMyPlan: () => {},
  hideMyPlan: () => {},
});

export function MyPlanSheetProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <MyPlanSheetContext.Provider
      value={{
        visible,
        showMyPlan: () => setVisible(true),
        hideMyPlan: () => setVisible(false),
      }}
    >
      {children}
    </MyPlanSheetContext.Provider>
  );
}

export function useMyPlanSheet() {
  return useContext(MyPlanSheetContext);
}
