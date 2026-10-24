"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Crown, Package, RefreshCw, Search, ShoppingBag, TrendingUp, X } from 'lucide-react';
import Amt from '@/components/Amt';
import { useHideAmounts } from '@/lib/hide-amounts';
import { customerService, SEGMENT_CFG, type Segment } from '@/services/customerService';
import styles from './customer-modal.module.css';

type Detail = Awaited<ReturnType<typeof customerService.getCustomerDetail>>;

interface Props {
  name: string | null;
  segment: Segment | null;
  onClose: () => void;
}

const PAGE_SIZE = 15;
const formatDate = (date: string) => {
  if (!date || Number.isNaN(Date.parse(date))) return '—';
  return new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

export default function CustomerModal({ name, segment, onClose }: Props) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loadedName, setLoadedName] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { hidden } = useHideAmounts();

  const closeModal = useCallback(() => {
    setLoadedName(null);
    setQuery('');
    setPage(1);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!name) return;
    let active = true;
    const fetchDetail = async () => {
      try {
        const result = await customerService.getCustomerDetail(name);
        if (active) {
          setDetail(result);
          setLoadedName(name);
          setError(false);
        }
      } catch (err) {
        console.error('Could not load customer detail', err);
        if (active) {
          setLoadedName(name);
          setError(true);
        }
      }
    };
    void fetchDetail();
    return () => { active = false; };
  }, [name, retry]);

  useEffect(() => {
    if (!name) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [name]);

  useEffect(() => {
    if (!name) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], select:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [name, closeModal]);

  const transactions = detail?.transactions;
  const matches = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return transactions ?? [];
    return (transactions ?? []).filter(tx =>
      [tx.transNo, tx.collection, tx.category, tx.location, formatDate(tx.date)]
        .some(value => value.toLocaleLowerCase().includes(term))
    );
  }, [transactions, query]);

  if (!name) return null;

  const cfg = SEGMENT_CFG[segment ?? 'Potential'];
  const loading = loadedName !== name || (!detail && !error);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const visibleRows = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const maxCollection = Math.max(...(detail?.topCollections.map(col => col.value) ?? []), 0);

  return (
    <div className={styles.overlay}>
      <button className={styles.backdrop} type="button" onClick={closeModal} aria-label="Close customer details" tabIndex={-1} />
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="customer-modal-title">
        <header className={styles.header}>
          <div className={styles.identity}>
            <div className={styles.avatar} aria-hidden="true"><ShoppingBag size={23} /></div>
            <div className={styles.identityText}>
              <div className={styles.eyebrow}><Crown size={12} /> CUSTOMER INTELLIGENCE</div>
              <h2 id="customer-modal-title">{name}</h2>
              <div className={styles.identityMeta}>
                <span className={styles.segment} style={{ color: cfg.color }}>{segment ?? 'Potential'} customer</span>
                {detail && loadedName === name && <span>{detail.transactions.length.toLocaleString('en-US')} purchase records</span>}
              </div>
            </div>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={closeModal} aria-label="Close customer details"><X size={20} /></button>
        </header>

        {loading ? (
          <div className={styles.state} role="status"><RefreshCw className={styles.spinner} size={24} /><strong>Loading customer profile</strong><span>Preparing purchase history and collections…</span></div>
        ) : error ? (
          <div className={styles.state} role="alert"><ShoppingBag size={25} /><strong>Customer details could not be loaded</strong><span>Please try again.</span><button type="button" onClick={() => { setLoadedName(null); setError(false); setRetry(value => value + 1); }}>Retry</button></div>
        ) : detail && (
          <div className={styles.body}>
            <div className={styles.kpis}>
              <div className={`${styles.kpi} ${styles.kpiPrimary}`}>
                <div className={styles.kpiTop}><span>Lifetime spend</span><TrendingUp size={18} /></div>
                <strong><Amt value={detail.kpi.totalSpend} short /></strong>
                <small>Net sales from purchase history</small>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiTop}><span>Pieces purchased</span><Package size={18} /></div>
                <strong>{detail.kpi.totalQty.toLocaleString('en-US')}</strong>
                <small>Across all recorded transactions</small>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiTop}><span>First purchase</span><CalendarDays size={18} /></div>
                <strong className={styles.kpiDate}>{formatDate(detail.kpi.firstVisit)}</strong>
                <small>First recorded sales date</small>
              </div>
              <div className={styles.kpi}>
                <div className={styles.kpiTop}><span>Latest purchase</span><CalendarDays size={18} /></div>
                <strong className={styles.kpiDate}>{formatDate(detail.kpi.lastVisit)}</strong>
                <small>Most recent sales date</small>
              </div>
            </div>

            <div className={styles.grid}>
              <section className={styles.card} aria-labelledby="collections-title">
                <div className={styles.cardHeading}><div><span className={styles.sectionLabel}>PREFERENCES</span><h3 id="collections-title">Top collections</h3></div><span className={styles.count}>Top 5</span></div>
                <div className={styles.collections}>
                  {detail.topCollections.length === 0 && <p className={styles.empty}>No collection data available.</p>}
                  {detail.topCollections.map((collection, index) => (
                    <div className={styles.collection} key={collection.name}>
                      <div className={styles.collectionTop}>
                        <span className={styles.rank}>{String(index + 1).padStart(2, '0')}</span>
                        <div className={styles.collectionName}><strong title={collection.name}>{collection.name}</strong><small>{collection.qty.toLocaleString('en-US')} pcs</small></div>
                        <span className={styles.collectionValue}><Amt value={collection.value} short /></span>
                      </div>
                      {!hidden && <div className={styles.track} aria-hidden="true"><span style={{ width: `${maxCollection > 0 ? Math.max(3, collection.value / maxCollection * 100) : 0}%` }} /></div>}
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card} aria-labelledby="history-title">
                <div className={styles.cardHeading}><div><span className={styles.sectionLabel}>PURCHASE ACTIVITY</span><h3 id="history-title">Transaction history</h3></div><span className={styles.count}>{detail.transactions.length.toLocaleString('en-US')} records</span></div>
                <div className={styles.historyToolbar}>
                  <label className={styles.search}><Search size={16} /><span className={styles.srOnly}>Search transactions</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="Search invoice, collection or store" /></label>
                  <span className={styles.resultCount}>{matches.length.toLocaleString('en-US')} shown</span>
                </div>
                <div className={styles.tableScroll} tabIndex={0} role="region" aria-label="Customer transaction history">
                  <table>
                    <thead><tr><th>Date / Invoice</th><th>Collection / Store</th><th className={styles.center}>Qty</th><th className={styles.right}>Net sales</th></tr></thead>
                    <tbody>
                      {visibleRows.map((tx, index) => (
                        <tr key={`${tx.transNo}-${tx.date}-${(page - 1) * PAGE_SIZE + index}`}>
                          <td><strong>{formatDate(tx.date)}</strong><small title={tx.transNo}>{tx.transNo || 'No invoice number'}</small></td>
                          <td><strong title={tx.collection}>{tx.collection}</strong><small title={`${tx.category} · ${tx.location}`}>{tx.category} · {tx.location}</small></td>
                          <td className={styles.center}><span className={styles.quantity}>{tx.qty}</span></td>
                          <td className={styles.right}><span className={styles.sales}><Amt value={tx.netSales} short /></span></td>
                        </tr>
                      ))}
                      {matches.length === 0 && <tr><td colSpan={4} className={styles.empty}>{query ? 'No transactions match your search.' : 'No transactions recorded.'}</td></tr>}
                    </tbody>
                  </table>
                </div>
                {matches.length > PAGE_SIZE && <div className={styles.pagination}><span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, matches.length)} of {matches.length}</span><div><button type="button" onClick={() => setPage(value => value - 1)} disabled={page === 1} aria-label="Previous transactions page"><ChevronLeft size={16} /></button><span>Page {page} / {totalPages}</span><button type="button" onClick={() => setPage(value => value + 1)} disabled={page === totalPages} aria-label="Next transactions page"><ChevronRight size={16} /></button></div></div>}
              </section>
            </div>
            <p className={styles.footnote}>Figures reflect sales transactions recorded for this customer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
