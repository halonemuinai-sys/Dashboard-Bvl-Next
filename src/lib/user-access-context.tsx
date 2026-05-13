"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Role = 'super_admin' | 'management_it' | 'operations_sales' | 'crm' | null;

interface UserAccessState {
  role: Role;
  allowedPaths: Set<string>;
  loading: boolean;
  canAccess: (path: string) => boolean;
}

const UserAccessContext = createContext<UserAccessState>({
  role: null,
  allowedPaths: new Set(),
  loading: true,
  canAccess: () => true,
});

export function UserAccessProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        setRole(data.role ?? null);
        setAllowedPaths(new Set(data.allowedPaths ?? []));
      } catch {
        setRole(null);
        setAllowedPaths(new Set(['*']));
      } finally {
        setLoading(false);
      }
    }

    load();

    // Re-fetch when tab gets focus so permission changes apply immediately
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const canAccess = (path: string): boolean => {
    if (loading) return true;
    if (role === null) return true;
    if (allowedPaths.has('*')) return true;
    return allowedPaths.has(path);
  };

  return (
    <UserAccessContext.Provider value={{ role, allowedPaths, loading, canAccess }}>
      {children}
    </UserAccessContext.Provider>
  );
}

export const useUserAccess = () => useContext(UserAccessContext);
