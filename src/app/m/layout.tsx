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
  LogOut,
  Building2
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
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-md bg-slate-900 flex flex-col min-h-screen shadow-2xl relative border-x border-slate-800">
        
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-slate-950 shadow-md">
              MPI
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wider text-slate-100 uppercase">BVLGARI ADVISOR</h1>
              <div className="flex items-center text-[10px] text-amber-400 font-medium">
                <Building2 className="w-3 h-3 mr-1" />
                {advisorStore}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-200">{advisorName}</p>
              <p className="text-[10px] text-slate-400">Online</p>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 p-4">
          {children}
        </main>

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1 z-50">
          <div className="grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/m' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                    isActive 
                      ? 'text-amber-400 bg-amber-500/10 font-bold scale-105' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
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
