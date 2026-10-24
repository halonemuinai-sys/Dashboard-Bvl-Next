'use client';

import { ArrowUpRight, Camera, CameraOff, Mail, Phone } from 'lucide-react';
import type { CrmProfilingRow } from '@/services/dashboardService';
import ProfilePhoto from './ProfilePhoto';
import { cn } from '@/lib/utils';
import styles from './profiling.module.css';

export default function ProfileList({ rows, onSelect }: { rows: CrmProfilingRow[]; onSelect: (row: CrmProfilingRow) => void }) {
  return (
    <div className={styles.directory}>
      <div className={styles.columnLabels} aria-hidden="true"><span>Client</span><span>Contact & interests</span><span>Boutique / Advisor</span><span>Photo status</span><span /></div>
      <ul className="divide-y divide-slate-100">
        {rows.map(row => {
          const name = row.full_name_tittle || row.nama_lengkap || [row.nama_depan, row.nama_belakang].filter(Boolean).join(' ') || 'Unnamed client';
          const location = (row.lokasi_store || '').toLowerCase();
          const store = /indonesia|intermark|^pi$/.test(location) ? 'PI' : /senayan|superstore|^ps$/.test(location) ? 'PS' : /bali/.test(location) ? 'Bali' : '';
          const hasPhoto = !!row.foto_customer?.trim();
          return (
            <li key={row.id}>
              <button type="button" onClick={() => onSelect(row)} className={styles.clientRow} aria-label={`View profile for ${name}`}>
                <div className={cn(styles.clientIdentity, 'flex min-w-0 items-center gap-3')}>
                  <ProfilePhoto compact name={name} store={store} photo={row.foto_customer} />
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900" title={name}>{name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {row.status_pelanggan && <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">{row.status_pelanggan}</span>}
                      {row.nama_panggilan && <span className="truncate text-xs text-slate-400">{row.nama_panggilan}</span>}
                    </div>
                  </div>
                </div>
                <div className={cn(styles.clientContact, 'min-w-0')}>
                  <p className="flex items-center gap-2 text-xs text-slate-600">{row.no_hp ? <Phone className="h-3 w-3 shrink-0 text-slate-400" /> : <Mail className="h-3 w-3 shrink-0 text-slate-400" />}<span className="truncate">{row.no_hp || row.email || 'No contact added'}</span></p>
                  <p className="mt-1.5 truncate text-xs text-slate-400">{row.barang_antusias || row.fashion_style || row.pekerjaan || 'Interests not added'}</p>
                </div>
                <div className={cn(styles.clientAdvisor, 'min-w-0')}>
                  <p className="flex items-center gap-2 text-xs font-medium text-slate-700"><span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', store === 'PI' ? 'bg-blue-500' : store === 'PS' ? 'bg-violet-500' : store === 'Bali' ? 'bg-emerald-500' : 'bg-slate-400')} /><span className="truncate">{row.lokasi_store || 'No boutique'}</span></p>
                  <p className="mt-1.5 truncate text-xs text-slate-400">{row.customer_advisor || 'No advisor assigned'}</p>
                </div>
                <div className={styles.clientPhotoStatus}>
                  <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium', hasPhoto ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                    {hasPhoto ? <Camera className="h-3.5 w-3.5" /> : <CameraOff className="h-3.5 w-3.5" />}{hasPhoto ? 'On file' : 'Missing photo'}
                  </span>
                </div>
                <ArrowUpRight className={cn(styles.rowArrow, 'h-4 w-4 text-slate-300')} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
