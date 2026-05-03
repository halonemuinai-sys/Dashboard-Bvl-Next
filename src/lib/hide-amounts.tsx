"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

const STORAGE_KEY = 'bvl_hide_amounts';

interface HideAmountsCtx {
  hidden: boolean;
  toggle: () => void;
}

const Ctx = createContext<HideAmountsCtx>({ hidden: false, toggle: () => {} });

export function HideAmountsProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);

  // Restore from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const toggle = useCallback(() => {
    setHidden(h => {
      const next = !h;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ hidden, toggle }}>{children}</Ctx.Provider>;
}

export const useHideAmounts = () => useContext(Ctx);
