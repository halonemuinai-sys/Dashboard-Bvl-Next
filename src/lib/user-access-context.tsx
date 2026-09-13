"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Role = 'super_admin' | 'management_it' | 'operations_sales' | 'crm' | null;

interface UserAccessState {
  role: Role;
  isAdmin: boolean;
  userEmail: string;
  userName: string;
  assignedStore: string;
  allowedPaths: Set<string>;
  loading: boolean;
  canAccess: (path: string) => boolean;
}

const UserAccessContext = createContext<UserAccessState>({
  role: null,
  isAdmin: false,
  userEmail: '',
  userName: '',
  assignedStore: 'ALL',
  allowedPaths: new Set(),
  loading: true,
  canAccess: () => true,
});

export function UserAccessProvider({ children }: { children: ReactNode }) {
  // Initial state MUST match between server and client render (no localStorage reads here),
  // otherwise React throws a hydration mismatch. The localStorage cache is applied inside the
  // effect below, which only runs client-side after the first paint has already matched SSR.
  const [role, setRole] = useState<Role>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [assignedStore, setAssignedStore] = useState<string>('ALL');
  const [allowedPaths, setAllowedPaths] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Apply cached permissions immediately post-mount so the UI doesn't flash "no access"
    // while the fresh /api/me fetch below is in flight.
    const cachedRole = localStorage.getItem('bvl_user_role') as Role;
    if (cachedRole) {
      setRole(cachedRole);
      setUserEmail(localStorage.getItem('bvl_user_email') || '');
      setUserName(localStorage.getItem('bvl_user_name') || '');
      setAssignedStore(localStorage.getItem('bvl_assigned_store') || 'ALL');
      const cachedPaths = localStorage.getItem('bvl_allowed_paths');
      if (cachedPaths) {
        try { setAllowedPaths(new Set(JSON.parse(cachedPaths))); } catch {}
      }
    }

    async function load() {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        const nextRole = data.role ?? null;
        const nextEmail = data.email ?? '';
        const nextName = data.fullName ?? '';
        const nextStore = data.assignedStore ?? 'ALL';
        const nextPaths = data.allowedPaths ?? [];

        setRole(nextRole);
        setUserEmail(nextEmail);
        setUserName(nextName);
        setAssignedStore(nextStore);
        setAllowedPaths(new Set(nextPaths));

        if (typeof window !== 'undefined') {
          if (nextRole) {
            localStorage.setItem('bvl_user_role', nextRole);
            localStorage.setItem('bvl_user_email', nextEmail);
            localStorage.setItem('bvl_user_name', nextName);
            localStorage.setItem('bvl_assigned_store', nextStore);
            localStorage.setItem('bvl_allowed_paths', JSON.stringify(nextPaths));
          } else {
            localStorage.removeItem('bvl_user_role');
            localStorage.removeItem('bvl_user_email');
            localStorage.removeItem('bvl_user_name');
            localStorage.removeItem('bvl_assigned_store');
            localStorage.removeItem('bvl_allowed_paths');
          }
        }
      } catch {
        // Pada error network, JANGAN set allowedPaths ke ['*'] (jangan bocorkan semua menu)
        // Tetap gunakan cached permissions jika ada
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
    // Super admin & management IT mendapatkan akses penuh
    if (role === 'super_admin' || role === 'management_it') return true;
    if (allowedPaths.has('*')) return true;

    // Jika permissions sudah ada (baik dari cache localStorage maupun fetch), periksa path
    if (allowedPaths.size > 0) {
      return allowedPaths.has(path);
    }

    // Jika masih loading dan belum ada cache permissions sama sekali,
    // JANGAN tampilkan menu yang dilarang (cegah flash of unauthorized menus)
    if (loading) {
      if (role === 'operations_sales') return path === '/operations-sales';
      if (role === 'crm') return path === '/crm-profiling';
      return path === '/';
    }

    return false;
  };

  const isAdmin = role === 'super_admin' || role === 'management_it';

  return (
    <UserAccessContext.Provider value={{ role, isAdmin, userEmail, userName, assignedStore, allowedPaths, loading, canAccess }}>
      {children}
    </UserAccessContext.Provider>
  );
}

export const useUserAccess = () => useContext(UserAccessContext);
