"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PieChart,
  BarChart,
  Store,
  TrendingUp,
  LineChart,
  Calendar,
  ClipboardList,
  CalendarRange,
  Repeat,
  Users2,
  Zap,
  Presentation,
  Briefcase,
  Search,
  Users,
  Database,
  Heart,
  ChevronRight,
  Diamond
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuGroups = [
  {
    title: "EXECUTIVE SUMMARY",
    items: [
      { name: 'Monthly Overview', icon: LayoutDashboard, href: '/' },
      { name: 'Quarterly Standard', icon: PieChart, href: '/quarterly-standard' },
      { name: 'Quarterly Budget', icon: BarChart, href: '/quarterly-budget' },
      { name: 'Store Performance', icon: Store, href: '/store-performance', badge: 'NEW', badgeColor: 'bg-blue-500' },
      { name: 'Annual Net Sales', icon: TrendingUp, href: '/annual-sales' },
      { name: 'Forecasting', icon: LineChart, href: '/forecasting', badge: 'AI', badgeColor: 'bg-indigo-500' },
    ]
  },
  {
    title: "STORE & OPERATIONS",
    items: [
      { name: 'Daily Report', icon: Calendar, href: '/daily-report' },
      { name: 'Monthly Trans.', icon: ClipboardList, href: '/monthly-transactions' },
      { name: 'Heatmap Calendar', icon: CalendarRange, href: '/heatmap-calendar' },
      { name: 'Crossing Sales', icon: Repeat, href: '/crossing-sales' },
      { name: 'Footfall (Store)', icon: Users2, href: '/footfall-store' },
    ]
  },
  {
    title: "ANALYTICS & INSIGHTS",
    items: [
      { name: 'Product Rank (Top)', icon: Zap, href: '/product-rank' },
      { name: 'Product Projection', icon: Presentation, href: '/product-projection' },
      { name: 'Advisor Performance', icon: Briefcase, href: '/advisor-performance' },
      { name: 'Customer Segment', icon: Search, href: '/customer-segment' },
      { name: 'Footfall (CRM)', icon: Users, href: '/footfall-crm' },
      { name: 'App Sheet (CRM)', icon: Database, href: '/app-sheet-crm' },
      { name: 'Clienteling Hub', icon: Heart, href: '/clienteling-hub', badge: 'NEW', badgeColor: 'bg-rose-500' },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-50 shadow-sm">
      {/* Brand Logo */}
      <div className="p-6 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Diamond className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">MRA Retail</h1>
            <p className="text-blue-600 text-[10px] font-medium uppercase tracking-widest">Bvlgari Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto custom-scrollbar py-4">
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="px-4 text-[10px] font-bold text-slate-400 mb-1.5 tracking-[0.15em] uppercase">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group relative",
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-4 h-4", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700")} />
                      <span className="text-sm font-medium tracking-tight">{item.name}</span>
                    </div>
                    {item.badge && !isActive && (
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-full text-white",
                        item.badgeColor
                      )}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Within Sidebar */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <p className="text-[9px] text-slate-400 text-center leading-relaxed">
          &copy; 2026 MRA Retail.<br />
          <span className="text-slate-300">Created By Aris Setiyono.</span>
        </p>
      </div>
    </aside>
  );
}
