"use client";

import { useState, useEffect } from 'react';
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { Menu } from "lucide-react";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsOpen(false);
      } else {
        setIsOpen(true);
      }
    };
    
    // Initial check
    checkMobile();
    
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex min-h-screen relative w-full">
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[40]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* We pass isMobile down so Sidebar knows to be full width when open on mobile */}
      <Sidebar isOpen={isMobile ? true : isOpen} setIsOpen={setIsOpen} isMobile={isMobile} mobileOpen={isOpen} />
      
      <main className={cn(
        "flex-1 min-h-screen transition-all duration-300 w-full max-w-full flex flex-col", 
        !isMobile ? (isOpen ? "md:ml-64" : "md:ml-20") : "ml-0"
      )}>
        {/* Mobile Header Top Bar */}
        {isMobile && (
          <div className="bg-white border-b border-slate-200 h-16 px-4 flex items-center gap-3 sticky top-0 z-30 shadow-sm">
            <button 
              onClick={() => setIsOpen(true)}
              className="p-1.5 -ml-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-none">MRA Retail</h1>
              <p className="text-[9px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">Bvlgari Intelligence</p>
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
