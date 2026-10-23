"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const isStandalonePage = pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password' || pathname === '/m/login' || pathname.startsWith('/public');

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const checkMobile = () => {
      const mobile = media.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(true);
      } else {
        setIsOpen(false); // Mobile drawer starts closed
      }
    };
    checkMobile();
    // Preserve the user's collapsed sidebar while resizing within desktop mode.
    media.addEventListener('change', checkMobile);
    return () => media.removeEventListener('change', checkMobile);
  }, []);

  if (isStandalonePage) return <>{children}</>;

  return (
    <div className="flex min-h-screen relative w-full">
      {/* Mobile backdrop overlay */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[40]"
          onClick={() => setIsOpen(false)}
        />
      )}

      <Sidebar
        isOpen={isMobile ? true : isOpen}
        setIsOpen={setIsOpen}
        isMobile={isMobile}
        mobileOpen={isOpen}
      />

      <main className={cn(
        "flex-1 min-w-0 min-h-screen transition-all duration-300 w-0 max-w-full flex flex-col",
        !isMobile ? (isOpen ? "md:ml-72" : "md:ml-20") : "ml-0"
      )}>
        {isMobile && (
          <div className="mobile-header-bar bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(true)}
                aria-label="Open menu"
                aria-expanded={isOpen}
                aria-controls="dashboard-sidebar"
                className="p-2 -ml-1 text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-2xs flex items-center space-x-1.5"
              >
                <Menu className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Menu</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[radial-gradient(circle_at_50%_35%,#1d2d4f,#0f1a31_70%)]" aria-hidden="true"><Image src="/brand/vizione-bv.png" alt="" width={555} height={520} sizes="20px" className="h-auto w-5" /></span>
                <div className="flex flex-col">
                  <h1 className="font-serif text-sm tracking-[0.16em] text-slate-900 leading-none">VIZIONE</h1>
                  <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-[0.18em] mt-1">MRA Group</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={cn("flex-1 min-w-0 w-full max-w-full", isMobile ? "p-4" : "p-8")}>
          {children}
        </div>
      </main>
    </div>
  );
}
