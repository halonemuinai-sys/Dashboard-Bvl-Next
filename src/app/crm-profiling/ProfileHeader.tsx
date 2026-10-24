import { X, User, Store, ShoppingBag, Calendar, TrendingUp, ImageIcon } from 'lucide-react';
import type { CrmProfilingRow } from '@/services/dashboardService';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import ProfilePhoto from './ProfilePhoto';
import styles from './profile-details.module.css';

type ProfileTab = 'profile' | 'traffic' | 'sales';

export default function ProfileHeader({ row, fullName, store, loading, error, visits, sales, lifetimeSales, lastVisit, tab, onTab, onClose, onPhoto, onRetry }: {
  row: CrmProfilingRow; fullName: string; store: string; loading: boolean; error: string;
  visits: number; sales: number; lifetimeSales: number; lastVisit: string; tab: ProfileTab;
  onTab: (tab: ProfileTab) => void; onClose: () => void; onPhoto: () => void; onRetry: () => void;
}) {
  const tabs = [
    { id: 'profile' as const, label: 'Overview', icon: User },
    { id: 'traffic' as const, label: 'Store visits', icon: Store, count: visits },
    { id: 'sales' as const, label: 'Purchases', icon: ShoppingBag, count: sales },
  ];
  const skeleton = <span className="inline-block h-6 w-16 animate-pulse rounded bg-slate-200/60" />;
  return <>
    <header className={styles.hero}>
      <button type="button" aria-label="Close client profile" onClick={onClose} className={styles.close}><X className="h-4 w-4" /></button>
      <div className={styles.heroIdentity}>
        <button type="button" aria-label="Enlarge customer photo" disabled={!mediaUrl(row.foto_customer)} onClick={onPhoto} className="shrink-0 rounded-2xl ring-4 ring-white/10 focus-visible:outline-2 focus-visible:outline-blue-300">
          <ProfilePhoto name={fullName} store={store} large photo={row.foto_customer} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[.2em] text-blue-200/70">Client profile <span className="px-1.5 text-white/20">/</span> #{row.id}</p>
          <h2 className="break-words text-xl font-semibold tracking-tight text-white sm:text-2xl">{fullName}</h2>
          {row.nama_panggilan && <p className="mt-1 text-xs text-slate-400">Also known as {row.nama_panggilan}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 text-slate-200"><Store className="h-3 w-3" />{row.lokasi_store || 'Boutique not assigned'}</span>
            {row.status_pelanggan && <span className="rounded-md bg-amber-300/10 px-2 py-1 font-medium text-amber-200">{row.status_pelanggan}</span>}
            {row.customer_advisor && <span className="text-slate-300"><span className="mr-1 text-slate-500">Advisor</span>{row.customer_advisor}</span>}
          </div>
        </div>
      </div>
    </header>
    <div className={styles.overview}>
      {error ? <div role="alert" className="mb-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">{error}<button type="button" onClick={onRetry} className="ml-2 font-semibold underline">Retry</button></div> : (
        <div className={styles.metrics} aria-label="Client activity summary" aria-busy={loading}>
          <div className={styles.metric}><p className={styles.metricLabel}>Store visits<Store className="h-4 w-4 text-blue-500" /></p><p className={styles.metricValue}>{loading ? skeleton : <>{visits.toLocaleString()}<span className="ml-1.5 text-[11px] font-normal tracking-normal text-slate-400">visits</span></>}</p></div>
          <div className={cn(styles.metric, styles.salesMetric)}><p className={styles.metricLabel}>Lifetime sales · IDR<TrendingUp className="h-4 w-4" /></p><p className={styles.metricValue}>{loading ? skeleton : <Amt value={lifetimeSales} />}</p></div>
          <div className={styles.metric}><p className={styles.metricLabel}>Last visit<Calendar className="h-4 w-4 text-violet-500" /></p><p className={styles.metricValue}>{loading ? skeleton : lastVisit === '—' ? <span className="text-sm text-slate-400">No visits yet</span> : lastVisit}</p></div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <nav className={styles.tabs} aria-label="Client profile sections">
          {tabs.map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => onTab(item.id)} className={cn(styles.tab, tab === item.id && styles.tabActive)}>
            <item.icon className="h-3.5 w-3.5" />{item.label}
            {item.count !== undefined && !loading && !error && <span className="rounded-md bg-slate-200/60 px-1.5 py-0.5 text-[10px] text-slate-500">{item.count}</span>}
          </button>)}
        </nav>
        <span className="mt-4 hidden items-center gap-1.5 text-[11px] text-slate-400 sm:inline-flex"><ImageIcon className="h-3.5 w-3.5" />{row.foto_customer?.trim() ? 'Photo on file' : 'Photo not added'}</span>
      </div>
    </div>
  </>;
}
