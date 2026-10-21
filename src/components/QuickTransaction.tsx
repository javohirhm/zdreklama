import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { TransactionSheet, type TransactionDefaults } from "./TransactionSheet";

interface QuickTransactionApi {
  openTransaction: (defaults?: TransactionDefaults) => void;
  closeTransaction: () => void;
}

const QuickTransactionContext = createContext<QuickTransactionApi | null>(null);

export function QuickTransactionProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<TransactionDefaults>({});

  const openTransaction = useCallback((nextDefaults?: TransactionDefaults) => {
    setDefaults(nextDefaults || {});
    setOpen(true);
  }, []);

  const closeTransaction = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ openTransaction, closeTransaction }),
    [openTransaction, closeTransaction]
  );

  return (
    <QuickTransactionContext.Provider value={value}>
      {children}
      <TransactionSheet open={open} onClose={closeTransaction} defaults={defaults} />
    </QuickTransactionContext.Provider>
  );
}

export function useQuickTransaction() {
  const context = useContext(QuickTransactionContext);
  if (!context) throw new Error("useQuickTransaction must be used inside QuickTransactionProvider");
  return context;
}
