'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  BarChart3, 
  Settings as SettingsIcon,
  Building2,
  Sparkles
} from 'lucide-react';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [advisorName, setAdvisorName] = useState<string>('');
  const [advisorStore, setAdvisorStore] = useState<string>('');

  useEffect(() => {
    // Check mobile session token
    const token = localStorage.getItem('mobile_token');
    const storedName = localStorage.getItem('mobile_advisor_name');
    const storedStore = localStorage.getItem('mobile_advisor_store');

    if (!pathname.startsWith('/m/login')) {
      if (!token || !storedName) {
        router.push('/m/login');
        return;
      }
      setAdvisorName(storedName);
      setAdvisorStore(storedStore || 'Plaza Indonesia');
    }
  }, [pathname, router]);

  const isLoginPage = pathname === '/m/login';

  const navItems = [
    { label: 'Dashboard', href: '/m', icon: LayoutDashboard },
    { label: 'Prospects', href: '/m/prospects', icon: Users },
    { label: 'CRM', href: '/m/crm', icon: UserCheck },
    { label: 'Reports', href: '/m/reports', icon: BarChart3 },
    { label: 'Settings', href: '/m/settings', icon: SettingsIcon },
  ];

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex justify-center selection:bg-indigo-500 selection:text-white">
      {/* Container matching Flutter Mobile 430px Max Width */}
      <div className="w-full max-w-md bg-slate-50 flex flex-col min-h-screen shadow-2xl relative border-x border-slate-200">
        
        {/* Top Header matching Flutter AppTheme */}
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-slate-900 uppercase">MPI ADVISOR</h1>
              <div className="flex items-center text-[11px] text-indigo-600 font-semibold">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                {advisorStore}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{advisorName}</p>
              <p className="text-[10px] font-medium text-emerald-600 flex items-center justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse" /> Online
              </p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 p-4">
          {children}
        </main>

        {/* Bottom Navigation Bar matching Flutter */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 z-50 shadow-lg">
          <div className="grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/m' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all ${
                    isActive 
                      ? 'text-indigo-600 bg-indigo-50 font-bold scale-105' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  <span className="text-[10px] font-medium tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </div>
  );
}
