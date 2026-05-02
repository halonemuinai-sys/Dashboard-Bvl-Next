"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Footprints, 
  Settings, 
  LogOut,
  Gem,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard, href: '/' },
  { name: 'Sales Analysis', icon: BarChart3, href: '/sales' },
  { name: 'Footfall', icon: Footprints, href: '/footfall' },
  { name: 'Customers', icon: Users, href: '/customers' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0a0a0a] border-r border-zinc-800/50 flex flex-col z-50">
      {/* Brand Logo */}
      <div className="p-8 mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500 p-1.5 rounded-lg">
            <Gem className="w-6 h-6 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-white">BVLGARI <span className="text-amber-500 text-[10px] align-top">BI</span></span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-5 h-5", isActive ? "text-amber-500" : "text-zinc-500 group-hover:text-zinc-200")} />
                <span className="text-sm font-medium">{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 mt-auto border-t border-zinc-800/50">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-zinc-500 hover:text-red-400 hover:bg-red-400/5 rounded-xl transition-all">
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">Settings</span>
        </button>
        <button className="flex items-center gap-3 w-full px-4 py-3 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>

      {/* User Profile Mini */}
      <div className="p-4 bg-zinc-900/30 m-4 rounded-2xl border border-zinc-800/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 flex items-center justify-center text-xs font-bold text-black">
            AD
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">Administrator</p>
            <p className="text-[10px] text-zinc-500 truncate">HQ Office</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
