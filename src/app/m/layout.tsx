'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Users, 
  UserCheck, 
  BarChart3, 
  Settings as SettingsIcon,
  Power,
  Store,
  Calendar as CalendarIcon,
  ChevronDown,
  Sparkles
} from 'lucide-react';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [advisorName, setAdvisorName] = useState<string>('');
  const [advisorRole, setAdvisorRole] = useState<string>('');
  const [advisorStore, setAdvisorStore] = useState<string>('Plaza Indonesia');

  useEffect(() => {
    // Check mobile session token
    const token = localStorage.getItem('mobile_token');
    const storedName = localStorage.getItem('mobile_advisor_name');
    const storedRole = localStorage.getItem('mobile_advisor_role');
    const storedStore = localStorage.getItem('mobile_advisor_store');

    if (!pathname.startsWith('/m/login')) {
      if (!token || !storedName) {
        router.push('/m/login');
        return;
      }
      setAdvisorName(storedName);
      setAdvisorRole(storedRole || 'Advisor');
      setAdvisorStore(storedStore || 'Plaza Indonesia');
    }
  }, [pathname, router]);

  const handleLogout = () => {
    localStorage.removeItem('mobile_token');
    localStorage.removeItem('mobile_advisor_name');
    localStorage.removeItem('mobile_advisor_role');
    localStorage.removeItem('mobile_advisor_store');
    router.push('/m/login');
  };

  const isLoginPage = pathname === '/m/login';

  const navItems = [
    { label: 'Beranda', href: '/m', icon: Home },
    { label: 'Prospek', href: '/m/prospects', icon: Users },
    { label: 'CRM', href: '/m/crm', icon: UserCheck },
    { label: 'Laporan', href: '/m/reports', icon: BarChart3 },
  ];

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex justify-center selection:bg-indigo-500 selection:text-white font-sans">
      {/* Container matching Flutter Mobile 430px Max Width */}
      <div className="w-full max-w-md bg-[#F8FAFC] flex flex-col min-h-screen shadow-2xl relative border-x border-slate-200">
        
        {/* Top Header matching Flutter AppTheme & _buildAppBar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-sm shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-slate-900 leading-tight">MPI Advisor</h1>
              <p className="text-xs font-medium text-slate-500">{advisorName || 'Advisor'}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-slate-500">
            <Link
              href="/m/settings"
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              title="Pengaturan"
            >
              <SettingsIcon className="w-5 h-5 text-slate-500" />
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              title="Keluar"
            >
              <Power className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          {children}
        </main>

        {/* Bottom Navigation Bar matching Flutter BottomNavigationBar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 px-3 py-2 z-50 shadow-md">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/m' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                    isActive 
                      ? 'text-indigo-600 font-bold' 
                      : 'text-slate-400 hover:text-slate-700 font-normal'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  <span className="text-[10px] tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
}

