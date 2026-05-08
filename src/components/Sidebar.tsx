"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useHideAmounts } from '@/lib/hide-amounts';
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
  Diamond,
  ContactRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuGroups = [
  {
    title: "OVERVIEW",
    items: [
      { name: 'Monthly Overview',    icon: LayoutDashboard, href: '/' },
      { name: 'Quarterly Standard',  icon: PieChart,        href: '/quarterly-standard' },
      { name: 'Quarterly Budget',    icon: BarChart,        href: '/quarterly-budget' },
      { name: 'Annual Net Sales',    icon: TrendingUp,      href: '/annual-sales' },
      { name: 'Store Performance',   icon: Store,           href: '/store-performance' },
      { name: 'Forecasting',         icon: LineChart,       href: '/forecasting', badge: 'AI', badgeColor: 'bg-indigo-500' },
    ]
  },
  {
    title: "OPERASIONAL",
    items: [
      { name: 'Daily Report',        icon: Calendar,        href: '/daily-report' },
      { name: 'Monthly Trans.',      icon: ClipboardList,   href: '/monthly-transactions' },
      { name: 'Heatmap Calendar',    icon: CalendarRange,   href: '/heatmap-calendar' },
      { name: 'Crossing Sales',      icon: Repeat,          href: '/crossing-sales' },
      { name: 'Sales Data',          icon: Database,        href: '/sales', badge: 'SYNC', badgeColor: 'bg-emerald-500' },
    ]
  },
  {
    title: "PRODUK & ADVISOR",
    items: [
      { name: 'Product Rank',        icon: Zap,             href: '/product-rank' },
      { name: 'Product Projection',  icon: Presentation,    href: '/product-projection' },
      { name: 'Advisor Setup',       icon: Users2,          href: '/advisor-setup' },
      { name: 'Advisor Performance', icon: Briefcase,       href: '/advisor-performance' },
    ]
  },
  {
    title: "CRM & TRAFFIC",
    items: [
      { name: 'CRM Profiling',        icon: ContactRound,    href: '/crm-profiling', badge: 'NEW', badgeColor: 'bg-violet-500' },
      { name: 'Event Selling Plan',  icon: Diamond,         href: '/event-selling-plan', badge: 'NEW', badgeColor: 'bg-amber-500' },
      { name: 'App Sheet (CRM)',     icon: Database,        href: '/app-sheet-crm' },
      { name: 'Footfall (Store)',    icon: Users2,          href: '/footfall-store' },
      { name: 'Footfall (CRM)',      icon: Users,           href: '/footfall-crm' },
      { name: 'Customer Segment',    icon: Search,          href: '/customer-segment' },
      { name: 'Clienteling Hub',     icon: Heart,           href: '/clienteling-hub', badge: 'NEW', badgeColor: 'bg-rose-500' },
    ]
  },
];

import { Menu, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, isMobile, mobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { hidden, toggle } = useHideAmounts();

  // If mobile, we rely on mobileOpen for the slide translation. If desktop, we rely on isOpen for the width.
  const isActuallyOpen = isMobile ? true : isOpen;

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-[50] shadow-2xl transition-transform duration-300",
      isMobile ? (mobileOpen ? "translate-x-0 w-[280px]" : "-translate-x-full w-[280px]") : "translate-x-0",
      !isMobile && (isOpen ? "w-64" : "w-20")
    )}>
      {/* Brand Logo & Toggle */}
      <div className={cn("p-6 mb-2 border-b border-slate-100 flex items-center", isActuallyOpen ? "justify-between" : "justify-center px-0")}>
        <div className={cn("flex items-center gap-3", !isActuallyOpen && "hidden")}>
          <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
            <Diamond className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 leading-tight">MRA Retail</h1>
            <p className="text-blue-600 text-[10px] font-medium uppercase tracking-widest">Bvlgari Intelligence</p>
          </div>
        </div>
        {!isActuallyOpen && (
          <div className="bg-blue-600 p-1.5 rounded-lg shrink-0 mb-4 mt-2">
            <Diamond className="w-5 h-5 text-white" />
          </div>
        )}
        
        {/* Absolute Toggle Button so it floats nicely on the edge - hidden on mobile */}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute -right-3 top-8 bg-white border border-slate-200 rounded-full p-1 shadow-sm hover:bg-slate-50 text-slate-500 hover:text-blue-600 transition-colors z-50"
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto custom-scrollbar py-4">
        {menuGroups.map((group) => (
          <div key={group.title}>
            {isActuallyOpen ? (
              <p className="px-4 text-[10px] font-bold text-slate-400 mb-1.5 tracking-[0.15em] uppercase">
                {group.title}
              </p>
            ) : (
              <div className="w-8 border-t border-slate-200 mx-auto mb-3 mt-4" />
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => {
                      if (isMobile) setIsOpen(false); // Close drawer on mobile click
                    }}
                    title={!isActuallyOpen ? item.name : undefined}
                    className={cn(
                      "flex items-center transition-all duration-200 group relative",
                      isActuallyOpen ? "justify-between px-4 py-2.5 rounded-xl" : "justify-center p-3 rounded-xl mx-2",
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("w-5 h-5", isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700")} />
                      {isActuallyOpen && <span className="text-sm font-medium tracking-tight">{item.name}</span>}
                    </div>
                    {isActuallyOpen && item.badge && !isActive && (
                      <span className={cn(
                        "text-[8px] font-black px-1.5 py-0.5 rounded-full text-white shrink-0",
                        item.badgeColor,
                        (item.badge === 'UPDATE' || item.badge === 'NEW') && "animate-pulse shadow-lg",
                        item.badge === 'UPDATE' ? "shadow-amber-200" : "shadow-indigo-200"
                      )}>
                        {item.badge}
                      </span>
                    )}
                    {isActuallyOpen && isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer Within Sidebar */}
      <div className={cn("border-t border-slate-200 bg-slate-50 space-y-3", isActuallyOpen ? "p-4" : "p-3 flex flex-col items-center")}>
        <button
          type="button"
          onClick={toggle}
          title={isActuallyOpen ? undefined : (hidden ? "Tampilkan Angka" : "Sembunyikan Angka")}
          className={cn(
            "flex items-center justify-center transition-all border",
            isActuallyOpen ? "w-full gap-2 px-3 py-2 rounded-xl text-xs font-bold" : "w-10 h-10 rounded-xl",
            hidden
              ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
              : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
          )}
        >
          {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {isActuallyOpen && (hidden ? "Angka Tersembunyi" : "Sembunyikan Angka")}
        </button>
        {isActuallyOpen && (
          <p className="text-[9px] text-slate-400 text-center leading-relaxed">
            &copy; 2026 MRA Retail.<br />
            <span className="text-slate-300">Created By Aris Setiyono.</span>
          </p>
        )}
      </div>
    </aside>
  );
}
