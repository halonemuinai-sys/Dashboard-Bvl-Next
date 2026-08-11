"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const isStandalonePage = pathname === '/login' || pathname === '/m/login' || pathname.startsWith('/public');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(true); // Always keep sidebar open on desktop/laptop
      } else {
        setIsOpen(false); // Mobile drawer starts closed
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
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
        "flex-1 min-h-screen transition-all duration-300 w-full max-w-full flex flex-col",
        !isMobile ? (isOpen ? "md:ml-64" : "md:ml-20") : "ml-0"
      )}>
        {isMobile && (
          <div className="mobile-header-bar bg-white border-b border-slate-200 h-16 px-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsOpen(true)}
                aria-label="Open Menu"
                className="p-2 -ml-1 text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-2xs flex items-center space-x-1.5"
              >
                <Menu className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">Menu</span>
              </button>
              <div className="flex flex-col">
                <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none">MRA Retail</h1>
                <p className="text-[9px] text-indigo-600 font-bold uppercase tracking-widest mt-0.5">Bvlgari Intelligence</p>
              </div>
            </div>
          </div>
        )}

        <div className={cn("flex-1", isMobile ? "p-4" : "p-8")}>
          {children}
        </div>
      </main>
    </div>
  );
}
