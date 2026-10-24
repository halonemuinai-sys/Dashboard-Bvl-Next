'use client';

import { useState } from 'react';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

export default function ProfilePhoto({ name, store, photo, large = false, compact = false }: {
  name: string; store: string; photo?: string; large?: boolean; compact?: boolean;
}) {
  const url = mediaUrl(photo);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  const colors: Record<string, string> = { PI: 'bg-blue-50 text-blue-700', PS: 'bg-violet-50 text-violet-700', Bali: 'bg-emerald-50 text-emerald-700' };
  return (
    <div title={url && failedUrl === url ? 'Photo unavailable' : !url ? 'No photo added' : 'Customer photo'}
      className={cn('relative overflow-hidden rounded-2xl flex items-center justify-center font-semibold shrink-0 ring-1 ring-inset ring-slate-900/5', large ? 'w-24 h-24 text-xl' : compact ? 'w-12 h-12 text-sm' : 'w-20 h-20 text-xl', colors[store] || 'bg-slate-100 text-slate-600')}>
      {url && failedUrl !== url ? (
        // Private AppSheet media requires the browser session cookie.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name || 'Customer'} loading="lazy" decoding="async" width={large ? 96 : compact ? 48 : 80} height={large ? 96 : compact ? 48 : 80}
          onError={() => setFailedUrl(url)} className="h-full w-full object-cover" />
      ) : <span>{initials}</span>}
    </div>
  );
}
