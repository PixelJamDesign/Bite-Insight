import { createContext, useContext, useState, ReactNode } from 'react';

interface ActiveFamilyContextValue {
  activeFamilyId: string | null;
  setActiveFamilyId: (id: string) => void;
  clearActiveFamily: () => void;
}

const ActiveFamilyContext = createContext<ActiveFamilyContextValue | null>(null);

export function ActiveFamilyProvider({ children }: { children: ReactNode }) {
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);

  const setActiveFamilyId = (id: string) => setActiveFamilyIdState(id);
  const clearActiveFamily = () => setActiveFamilyIdState(null);

  return (
    <ActiveFamilyContext.Provider value={{ activeFamilyId, setActiveFamilyId, clearActiveFamily }}>
      {children}
    </ActiveFamilyContext.Provider>
  );
}

export function useActiveFamily(): ActiveFamilyContextValue {
  const ctx = useContext(ActiveFamilyContext);
  if (!ctx) throw new Error('useActiveFamily must be used within ActiveFamilyProvider');
  return ctx;
}
