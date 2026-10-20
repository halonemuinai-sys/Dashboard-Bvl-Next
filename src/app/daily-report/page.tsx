"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  CalendarDays, ChevronDown, Download, FileSpreadsheet, Loader2, Mail, MessageCircle, RefreshCw,
  AlertCircle, X, HandCoins, Target, Receipt, Percent, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Amt from '@/components/Amt';
import InfoTip from '@/components/InfoTip';
import CustomCalendar from '@/components/CustomCalendar';
import { dashboardService } from '@/services/dashboardService';
import SendDailyEmailModal from './SendDailyEmailModal';
import StoreReportCard, { achievementTone } from './StoreReportCard';
import DailyReportPdfDocument from './DailyReportPdfDocument';
import {
  arrayBufferToBase64, buildDailyExcelWorkbook, longReportDate, parseReportDate, renderDailyPdf, whatsappMessage, type DailyReport,
} from './dailyReportExport';

const pct = (n: number) => (Number.isFinite(n) ? n.toFixed(1) : '0.0') + '%';
const localDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const shiftDays = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return localDate(d); };
const isDateParam = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

export default function DailyReportPage() {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading daily report…</p>}>
      <DailyReportContent />
    </Suspense>
  );
}

function DailyReportContent() {
  const params = useSearchParams();
  // Shared WhatsApp links carry ?date=YYYY-MM-DD.
  const [date, setDate] = useState(() => (isDateParam(params.get('date')) ? params.get('date')! : localDate(new Date())));
  const [report, setReport] = useState<{ date: string; data: DailyReport } | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [busy, setBusy] = useState<'' | 'pdf' | 'excel'>('');
  const [notice, setNotice] = useState('');

  const loading = report?.date !== date;
  const data = report?.data ?? null;

  useEffect(() => {
    let cancelled = false;
    dashboardService.getDailyReport(date)
      .then(res => { if (!cancelled) { setReport({ date, data: res }); setError(''); } })
      .catch(() => { if (!cancelled) setError('The daily report could not be loaded. Check your connection and try again.'); });
    return () => { cancelled = true; };
  }, [date, revision]);

  const reload = () => { setReport(null); setRevision(r => r + 1); };
  const pickDate = (value: string) => { setDate(value); setShowCalendar(false); };

  const kpi = useMemo(() => {
    if (!data) return null;
    const todaySales = data.stores.reduce((s, store) => s + store.metrics.todaySales, 0);
    const todayQty = data.stores.reduce((s, store) => s + store.metrics.todayQty, 0);
    return { ...data.globalKPIs, todaySales, todayQty, cardFeesPct: Math.max(0, data.globalKPIs.mtdCostPct - data.globalKPIs.avgDiscMtd) };
  }, [data]);

  const downloadPdf = useCallback(async () => {
    setBusy('pdf');
    try {
      const pdf = await renderDailyPdf();
      pdf?.save(`BVLGARI - Daily Sales Report - ${date}.pdf`);
    } catch {
      setNotice('The PDF could not be created. Try again.');
    } finally {
      setBusy('');
    }
  }, [date]);

  const downloadExcel = useCallback(async () => {
    if (!data) return;
    setBusy('excel');
    try {
      const wb = await buildDailyExcelWorkbook(data, date);
      const buffer = await wb.xlsx.writeBuffer();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      a.download = `BVLGARI - Daily Sales Report - ${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      setNotice('The Excel file could not be created. Try again.');
    } finally {
      setBusy('');
    }
  }, [data, date]);

  const pdfBase64 = async () => {
    try { const pdf = await renderDailyPdf(); return pdf ? arrayBufferToBase64(pdf.output('arraybuffer')) : undefined; }
    catch (err) { console.error('PDF attachment failed', err); return undefined; }
  };
  const excelBase64 = async () => {
    if (!data) return undefined;
    try { const wb = await buildDailyExcelWorkbook(data, date); return arrayBufferToBase64(new Uint8Array(await wb.xlsx.writeBuffer())); }
    catch (err) { console.error('Excel attachment failed', err); return undefined; }
  };
  const shareWhatsApp = () => {
    if (data) window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage(data, date, window.location.origin))}`, '_blank');
  };

  const today = localDate(new Date());
  const yesterday = shiftDays(-1);
  const quick = [{ label: 'Today', value: today }, { label: 'Yesterday', value: yesterday }];

  const kpis = kpi ? [
    {
      icon: HandCoins, tone: 'bg-blue-50 text-blue-600', label: 'Boutique sales MTD', value: <Amt value={kpi.storeSales} />,
      sub: <>Incl. Head Office <Amt value={kpi.totalSales} /></>,
      badge: { text: `${kpi.storeSalesGrowth >= 0 ? '+' : ''}${pct(kpi.storeSalesGrowth)}`, good: kpi.storeSalesGrowth >= 0 },
      help: 'Net sales of the boutiques (Head Office excluded) from day 1 to the selected day. The badge compares with the same days of last month.',
    },
    {
      icon: Target, tone: 'bg-emerald-50 text-emerald-600', label: 'Achievement', value: kpi.globalTarget > 0 ? pct(kpi.globalAchievement) : '—',
      sub: <>Monthly target <Amt value={kpi.globalTarget} /></>, progress: kpi.globalAchievement,
      help: 'Boutique sales month to date divided by the full monthly target of all boutiques (Head Office excluded).',
    },
    {
      icon: Receipt, tone: 'bg-slate-100 text-slate-600', label: 'Sales on this day', value: <Amt value={kpi.todaySales} />,
      sub: `${kpi.todayQty.toLocaleString('en-GB')} pcs across ${data!.stores.length} boutiques`,
      help: 'Net sales of all boutiques on the selected day only.',
    },
    {
      icon: Percent, tone: 'bg-amber-50 text-amber-600', label: 'Selling cost MTD', value: pct(kpi.mtdCostPct),
      sub: `Discount ${pct(kpi.avgDiscMtd)} · card fees ${pct(kpi.cardFeesPct)}`, warn: kpi.mtdCostPct > 15,
      help: 'Discounts plus card commission (MDR) as a share of boutique gross sales, month to date. Flagged above 15%.',
    },
  ] : [];

  return (
    <div className="space-y-5 pb-10">
      {/* Hero */}
      <motion.section initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 p-6 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
            className="absolute -right-16 -top-16 h-56 w-56 rounded-full border border-dashed border-white/10" />
        </div>
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15"><ClipboardList className="h-5 w-5 text-blue-200" /></span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-300">Sales</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">Daily Sales Report</h1>
              <p className="mt-1 text-sm text-slate-300">{longReportDate(date)} · month to date through this day</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="Quick date" className="relative flex rounded-lg bg-white/10 p-1">
              {quick.map(q => (
                <button key={q.label} type="button" role="tab" aria-selected={date === q.value} onClick={() => pickDate(q.value)}
                  className={cn('relative rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', date === q.value ? 'text-slate-900' : 'text-slate-300 hover:text-white')}>
                  {date === q.value && <motion.span layoutId="daily-quick-date" className="absolute inset-0 rounded-md bg-white" transition={{ type: 'spring', damping: 30, stiffness: 260 }} />}
                  <span className="relative">{q.label}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setShowCalendar(v => !v)} aria-haspopup="dialog" aria-expanded={showCalendar}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10">
                <CalendarDays className="h-4 w-4 text-blue-200" />
                {parseReportDate(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {showCalendar && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                  <div className="absolute right-0 top-full z-50 mt-2 text-slate-900"><CustomCalendar selectedDate={date} onSelect={pickDate} /></div>
                </>
              )}
            </div>
            <button type="button" onClick={reload} disabled={loading} aria-label="Reload report" title="Reload"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white transition hover:bg-white/10 disabled:opacity-50">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <span className="rounded-md border border-white/15 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-slate-300">AMOUNTS IN IDR</span>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={downloadPdf} disabled={!data || busy !== ''}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50">
              {busy === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}PDF
            </button>
            <button type="button" onClick={downloadExcel} disabled={!data || busy !== ''}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50">
              {busy === 'excel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}Excel
            </button>
            <button type="button" onClick={shareWhatsApp} disabled={!data}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/20 bg-white/5 px-3 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50">
              <MessageCircle className="h-4 w-4 text-emerald-300" />WhatsApp
            </button>
            <button type="button" onClick={() => setIsEmailModalOpen(true)} disabled={!data}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-4 text-xs font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50">
              <Mail className="h-4 w-4" />Send email
            </button>
          </div>
        </div>
      </motion.section>

      {(error || notice) && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span className="flex-1">{error || notice}</span>
          {error ? <button type="button" onClick={reload} className="font-semibold underline">Try again</button>
            : <button type="button" onClick={() => setNotice('')} aria-label="Dismiss" className="rounded p-1 hover:bg-rose-100"><X className="h-3.5 w-3.5" /></button>}
        </div>
      )}

      {!data ? (
        !error && (
          <div role="status" className="space-y-4">
            <span className="sr-only">Loading daily report</span>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
            </div>
            {Array.from({ length: 2 }, (_, i) => <div key={i} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />)}
          </div>
        )
      ) : (
        <div aria-busy={loading} className={cn('space-y-5 transition-opacity', loading && 'opacity-60')}>
          {/* KPI */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((card, i) => (
              <motion.div key={card.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} whileHover={{ y: -2 }}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', card.tone)}><card.icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{card.label}<InfoTip label={`About ${card.label.toLowerCase()}`} text={card.help} /></p>
                    {card.badge && (
                      <span title="Compared with the same days of last month" className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                        card.badge.good ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200')}>{card.badge.text}</span>
                    )}
                  </div>
                  <p className={cn('mt-0.5 truncate text-lg font-semibold tabular-nums tracking-tight', card.warn ? 'text-rose-600' : 'text-slate-900')}>{card.value}</p>
                  {card.progress !== undefined && (
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(Math.max(card.progress, 0), 100)}%` }} transition={{ duration: 0.7 }}
                        className={cn('h-full rounded-full', card.progress >= 100 ? 'bg-emerald-500' : 'bg-blue-600')} />
                    </div>
                  )}
                  <p className="mt-1 truncate text-[11px] text-slate-500">{card.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Boutique ranking strip */}
          {data.stores.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Boutiques</span>
              {[...data.stores].sort((a, b) => b.metrics.achievement - a.metrics.achievement).map(store => (
                <a key={store.storeName} href={`#store-${store.storeName.replace(/\s+/g, '-').toLowerCase()}`}
                  className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ring-1 ring-inset transition hover:brightness-95', achievementTone(store.metrics.achievement))}>
                  <span className="h-1 w-1 rounded-full bg-current" />{store.storeName}<span className="tabular-nums opacity-80">{store.metrics.target > 0 ? pct(store.metrics.achievement) : '—'}</span>
                </a>
              ))}
            </div>
          )}

          {data.stores.length ? data.stores.map((store, i) => (
            <div key={store.storeName} id={`store-${store.storeName.replace(/\s+/g, '-').toLowerCase()}`} className="scroll-mt-4">
              <StoreReportCard store={store} index={i} />
            </div>
          )) : (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-14 text-center">
              <p className="text-sm font-semibold text-slate-700">No boutique sales or targets for {data.monthName}</p>
              <p className="mt-1 text-xs text-slate-400">Run Sync to API in Invoice Management if sales are expected for this period.</p>
            </div>
          )}

          <DailyReportPdfDocument data={data} date={date} />
        </div>
      )}

      <SendDailyEmailModal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} date={date}
        onGeneratePdf={pdfBase64} onGenerateExcel={excelBase64} />
    </div>
  );
}
