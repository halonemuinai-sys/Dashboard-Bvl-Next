import { Users, Camera, CameraOff, ArrowUpRight, ChartNoAxesCombined } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProfilePhotoFilter, profilePhotoSummary } from '@/lib/crm-profiling-query';
import styles from './profiling.module.css';

export default function ProfileSummary({ data, loading, error, selected, onSelect, onRetry }: {
  data?: ReturnType<typeof profilePhotoSummary>; loading: boolean; error: boolean;
  selected: ProfilePhotoFilter; onSelect: (filter: ProfilePhotoFilter) => void; onRetry: () => void;
}) {
  const value = (amount?: number) => loading ? <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-slate-200/40" /> : error || amount === undefined ? '—' : amount.toLocaleString();
  const cards = [
    { id: 'all' as const, label: 'Total profiles', value: data?.total, note: 'In this search & boutique', icon: Users, tone: styles.totalKpi },
    { id: 'with' as const, label: 'Photo on file', value: data?.withPhoto, note: 'Photo reference added', icon: Camera, tone: styles.photoKpi },
    { id: 'missing' as const, label: 'Missing photo', value: data?.missing, note: 'View profiles to complete', icon: CameraOff, tone: styles.missingKpi },
  ];
  return (
    <section aria-label="Profile health" className={cn(styles.responsiveSection, "space-y-3")}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-1"><h2 className="text-sm font-semibold text-slate-800">Profile health</h2><p className="text-xs text-slate-400">Across all matching profiles · Click a card to filter</p></div>
      <div className={styles.kpiGrid}>
        {cards.map(card => <button key={card.id} type="button" aria-pressed={selected === card.id} onClick={() => onSelect(card.id)} className={cn(styles.kpi, card.tone, selected === card.id && styles.kpiSelected)}>
          <span className="flex items-center justify-between gap-3 text-xs font-medium"><span>{card.label}</span><card.icon className="h-4 w-4 opacity-75" /></span>
          <span className="mt-4 block text-3xl font-semibold tracking-tight tabular-nums">{value(card.value)}</span>
          <span className="mt-3 flex items-center justify-between gap-2 text-[11px] opacity-75"><span>{card.note}</span><ArrowUpRight className="h-3.5 w-3.5" /></span>
        </button>)}
        <div className={cn(styles.kpi, styles.coverageKpi)}>
          <div className="flex items-center justify-between text-xs font-medium text-slate-500"><span>Photo coverage</span><ChartNoAxesCombined className="h-4 w-4 text-violet-500" /></div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value(data?.coverage)}{!loading && !error && data && <span className="ml-1 text-lg text-slate-400">%</span>}</p>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-[width] duration-500" style={{ width: `${!loading && !error ? data?.coverage ?? 0 : 0}%` }} /></div>
        </div>
      </div>
      {error && <p role="alert" className="px-1 text-xs text-amber-700">Profile counts could not be loaded. <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button></p>}
      <p className="px-1 text-[11px] text-slate-400">Photo coverage is based on saved photo references. File availability may vary.</p>
    </section>
  );
}
