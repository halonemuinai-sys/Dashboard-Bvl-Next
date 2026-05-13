"use client";

import { ShieldOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useUserAccess } from '@/lib/user-access-context';

const ROLE_LABEL: Record<string, string> = {
  management_it:    'Management & IT All',
  operations_sales: 'Operations Sales',
  crm:              'CRM',
};

export default function UnauthorizedPage() {
  const { role } = useUserAccess();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-100 shadow-sm">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Akses Ditolak</h1>
          <p className="text-slate-500 text-sm mt-1">
            Halaman ini tidak tersedia untuk role{' '}
            <span className="font-semibold text-slate-700">{role ? ROLE_LABEL[role] : '-'}</span>.
          </p>
        </div>
        <Link href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all shadow-sm">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
