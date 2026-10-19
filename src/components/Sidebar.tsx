"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import styles from './Sidebar.module.css';
import { usePathname } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useHideAmounts } from '@/lib/hide-amounts';
import {
  LayoutDashboard,
  PieChart,
  BarChart,
  Store,
  TrendingUp,
  Sparkles,
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
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Diamond,
  ContactRound,
  LogOut,
  ShieldCheck,
  Boxes,
  Table,
  Award,
  Receipt,
  NotebookPen,
  Percent,
  CreditCard,
  Crosshair,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserAccess } from '@/lib/user-access-context';

const ROLE_LABEL: Record<string, string> = {
  super_admin:      'Super Admin',
  management_it:    'Management & IT',
  operations_sales: 'Operations Sales',
  crm:              'CRM',
  finance:          'Finance',
};

function getBadgeStyle(badgeColor?: string) {
  if (!badgeColor) return styles.badgeSlate;
  if (badgeColor.includes('violet')) return styles.badgeViolet;
  if (badgeColor.includes('indigo')) return styles.badgeIndigo;
  if (badgeColor.includes('blue')) return styles.badgeBlue;
  if (badgeColor.includes('emerald') || badgeColor.includes('green')) return styles.badgeEmerald;
  if (badgeColor.includes('amber') || badgeColor.includes('orange')) return styles.badgeAmber;
  if (badgeColor.includes('rose') || badgeColor.includes('red')) return styles.badgeRose;
  return styles.badgeSlate;
}

const menuGroups = [
  {
    title: "OVERVIEW",
    items: [
      { name: 'Monthly Overview',    icon: LayoutDashboard, href: '/' },
      { name: 'Operations Sales',   icon: LayoutDashboard, href: '/operations-sales', badge: 'NEW', badgeColor: 'bg-amber-500' },
      { name: 'Quarterly Standard',  icon: PieChart,        href: '/quarterly-standard' },
      { name: 'Quarterly Budget',    icon: BarChart,        href: '/quarterly-budget' },
      { name: 'Annual Net Sales',    icon: TrendingUp,      href: '/annual-sales' },
      { name: 'Store Performance',   icon: Store,           href: '/store-performance' },
      { name: 'Margin Intelligence', icon: Percent,         href: '/cost-disc-analysis', badge: 'NEW', badgeColor: 'bg-rose-500' },
      { name: 'Forecasting',         icon: Sparkles,        href: '/forecasting' },
    ]
  },
  {
    title: "OPERATIONS",
    items: [
      { name: 'Daily Report',        icon: Calendar,        href: '/daily-report' },
      { name: 'Daily Breakdown',     icon: Table,           href: '/daily-breakdown' },
      { name: 'Invoice Management',  icon: Receipt,         href: '/invoice-management', badge: 'POS', badgeColor: 'bg-blue-600' },
      { name: 'Installment & MDR Guide', icon: CreditCard,  href: '/installment-guide', badge: 'GUIDE', badgeColor: 'bg-emerald-600' },
      { name: 'Monthly Trans.',      icon: ClipboardList,   href: '/monthly-transactions', badge: 'INPUT', badgeColor: 'bg-blue-600' },
      { name: 'Heatmap Calendar',    icon: CalendarRange,   href: '/heatmap-calendar' },
      { name: 'Sales Journal',       icon: NotebookPen,     href: '/sales-journal', badge: 'NEW', badgeColor: 'bg-blue-600' },
      { name: 'Crossing Sales',      icon: Repeat,          href: '/crossing-sales' },
      { name: 'Sales Data',          icon: Database,        href: '/sales', badge: 'SYNC', badgeColor: 'bg-emerald-500' },
      { name: 'Sales Data (DP/SVC)', icon: Database,        href: '/sales-dps-svc', badge: 'SYNC', badgeColor: 'bg-violet-500' },
      { name: 'Inventory Val.',      icon: Boxes,           href: '/inventory', badge: 'NEW', badgeColor: 'bg-blue-500' },
    ]
  },
  {
    title: "FINANCE",
    items: [
      { name: 'Reconciliation & Audit', icon: ShieldCheck,     href: '/finance-reconciliation', badge: 'AUDIT', badgeColor: 'bg-emerald-600' },
      { name: 'Bank Performance & MDR', icon: BarChart,        href: '/finance-payment-analytics', badge: 'ANALYTICS', badgeColor: 'bg-emerald-600' },
      { name: 'Bank MDR Setup',         icon: Percent,         href: '/finance-mdr-setup', badge: 'CONFIG', badgeColor: 'bg-emerald-600' },
      { name: 'Installment & MDR Guide', icon: CreditCard,     href: '/installment-guide', badge: 'GUIDE', badgeColor: 'bg-emerald-600' },
    ]
  },
  {
    title: "PRODUCTS & ADVISORS",
    items: [
      { name: 'Product Rank',        icon: Zap,             href: '/product-rank' },
      { name: 'Product Projection',  icon: Presentation,    href: '/product-projection' },
      { name: 'Setup & Targets',     icon: Users2,          href: '/advisor-setup' },
      { name: 'Advisor Performance', icon: Briefcase,       href: '/advisor-performance' },
      { name: 'Advisor Productivity', icon: Award,          href: '/advisor-productivity', badge: 'NEW', badgeColor: 'bg-indigo-500' },
    ]
  },
  {
    title: "CRM & TRAFFIC",
    items: [
      { name: 'CRM Profiling',        icon: ContactRound,    href: '/crm-profiling', badge: 'NEW', badgeColor: 'bg-violet-500' },
      { name: 'Advanced Clienteling', icon: Crosshair,       href: '/advanced-clienteling', badge: 'NEW', badgeColor: 'bg-blue-600' },
      { name: 'CRM & Traffic',          icon: ShieldCheck,     href: '/crm-dedup', badge: 'NEW', badgeColor: 'bg-emerald-500' },
      { name: 'Event Selling Plan',  icon: Diamond,         href: '/event-selling-plan', badge: 'NEW', badgeColor: 'bg-amber-500' },
      { name: 'App Sheet (CRM)',     icon: Database,        href: '/app-sheet-crm' },
      { name: 'Footfall (Store)',    icon: Users2,          href: '/footfall-store' },
      { name: 'Footfall (CRM)',      icon: Users,           href: '/footfall-crm' },
      { name: 'Customer Segment',    icon: Search,          href: '/customer-segment' },
      { name: 'Clienteling Hub',     icon: Heart,           href: '/clienteling-hub', badge: 'NEW', badgeColor: 'bg-rose-500' },
    ]
  },
  {
    title: "ADMIN",
    items: [
      { name: 'User Access',         icon: ShieldCheck,     href: '/user-access' },
    ]
  },
];

import { logout } from '@/app/login/actions';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
}

export default function Sidebar({ isOpen, setIsOpen, isMobile, mobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const { hidden, toggle } = useHideAmounts();
  const { canAccess, role } = useUserAccess();
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isExpanded = isMobile || isOpen;
  const search = query.trim().toLowerCase();

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [isMobile, mobileOpen, setIsOpen]);

  const visibleGroups = menuGroups.map(group => ({
    ...group,
    items: group.items.filter(item => {
      if (role === 'finance' && group.title !== 'FINANCE' && !(group.title === 'OVERVIEW' && item.href === '/operations-sales')) return false;
      return canAccess(item.href) && (!isExpanded || !search || `${item.name} ${group.title}`.toLowerCase().includes(search));
    }),
  })).filter(group => group.items.length > 0);

  return (
    <aside
      id="dashboard-sidebar"
      aria-label="Sidebar"
      inert={isMobile && !mobileOpen ? true : undefined}
      className={cn(styles.sidebar, !isExpanded && styles.compact, isMobile && styles.mobile, isMobile && !mobileOpen && styles.mobileClosed)}
    >
      <header className={styles.header}>
        <div className={styles.brandMark} aria-hidden="true"><Diamond size={21} strokeWidth={1.5} /></div>
        {isExpanded && <div className={styles.brandText}><span>BVLGARI</span><p>RETAIL INTELLIGENCE</p></div>}
        {isMobile ? (
          <button ref={closeRef} type="button" onClick={() => setIsOpen(false)} className={styles.iconButton} aria-label="Close menu"><X size={18} /></button>
        ) : (
          <button type="button" onClick={() => setIsOpen(!isOpen)} className={styles.collapseButton} aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'} aria-expanded={isOpen} aria-controls="sidebar-navigation" title={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
            {isOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        )}
      </header>

      {isExpanded && <div className={styles.searchWrap}>
        <Search size={16} aria-hidden="true" />
        <input aria-label="Search navigation" placeholder="Find a menu..." value={query} onChange={event => setQuery(event.target.value)} />
        {query && <button type="button" onClick={() => setQuery('')} aria-label="Clear menu search"><X size={14} /></button>}
      </div>}

      <nav id="sidebar-navigation" aria-label="Main navigation" className={styles.navigation}>
        {visibleGroups.map(group => {
          const groupId = `nav-${group.title.toLowerCase().replace(/[^a-z]+/g, '-')}`;
          const groupOpen = !isExpanded || Boolean(search) || !collapsedGroups.includes(group.title);
          const hasActivePage = group.items.some(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`)));
          return <section key={group.title} className={styles.group} aria-label={group.title}>
            {isExpanded ? <button
              type="button"
              className={styles.groupHeading}
              aria-expanded={groupOpen}
              aria-controls={groupId}
              disabled={Boolean(search)}
              onClick={() => setCollapsedGroups(current => current.includes(group.title) ? current.filter(title => title !== group.title) : [...current, group.title])}
            ><span>{group.title}{!groupOpen && hasActivePage && <span className={styles.activeDot} />}</span><ChevronDown size={13} className={cn(!groupOpen && styles.chevronClosed)} /></button> : <div className={styles.divider} />}
            <div id={groupId} hidden={!groupOpen}>
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
                return <Link
                  key={item.href}
                  href={item.href}
                  aria-label={!isExpanded ? item.name : undefined}
                  aria-current={active ? 'page' : undefined}
                  title={item.name}
                  onClick={() => { if (isMobile) setIsOpen(false); }}
                  className={cn(styles.menuItem, active && styles.active)}
                >
                  <item.icon size={18} strokeWidth={1.7} aria-hidden="true" />
                  {isExpanded && (
                    <>
                      <span className={styles.itemName}>{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            styles.badge,
                            getBadgeStyle(item.badgeColor),
                            (item.badge === 'NEW' || item.badge === 'UPDATE' || item.badge === 'INPUT') && styles.badgePulse
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>;
              })}
            </div>
          </section>;
        })}
        {visibleGroups.length === 0 && <div className={styles.empty} role="status"><Search size={22} /><p>No menus found</p><span>Try another keyword.</span></div>}
      </nav>

      <footer className={styles.footer}>
        {isExpanded && <div className={styles.workspace}><div className={styles.avatar}>MR</div><div><strong>MRA Retail</strong><span>{role ? ROLE_LABEL[role] || role : 'Workspace'}</span></div><ShieldCheck size={16} aria-hidden="true" /></div>}
        <div className={styles.actions}>
          <button type="button" onClick={toggle} aria-label={hidden ? 'Show amounts' : 'Hide amounts'} aria-pressed={hidden} title={hidden ? 'Show amounts' : 'Hide amounts'} className={cn(styles.footerButton, hidden && styles.amountsHidden)}>
            {hidden ? <EyeOff size={16} /> : <Eye size={16} />}{isExpanded && <span>{hidden ? 'Amounts hidden' : 'Hide amounts'}</span>}
          </button>
          <button type="button" aria-label="Sign out" title="Sign out" className={cn(styles.footerButton, styles.signOut)} onClick={() => {
            localStorage.removeItem('bvl_user_role');
            localStorage.removeItem('bvl_assigned_store');
            localStorage.removeItem('bvl_allowed_paths');
            logout();
          }}><LogOut size={16} /></button>
        </div>
        {isExpanded && <p className={styles.credit}>&copy; 2026 MRA Retail <span>Created by Aris Setiyono</span></p>}
      </footer>
    </aside>
  );
}
