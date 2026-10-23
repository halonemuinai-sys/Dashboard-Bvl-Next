import { NextResponse } from 'next/server';
import { syncInventory } from '@/services/inventoryService';
import { businessDate } from '@/lib/sales-chart-data';

// Morning stock snapshot for the boutiques, called by the server's scheduler (cron).
// Each run replaces today's snapshot for every store, so re-running is safe.
const STORES = ['PI', 'PS', 'BL'];
const BVLGARI_API_BASE = process.env.BVLGARI_API_BASE || 'http://139.99.102.231:8089/demo';
const BVLGARI_API_TOKEN = process.env.BVLGARI_API_TOKEN || '';

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }

async function run(request: Request) {
  // Optional shared secret: when CRON_SECRET is set, callers must send it.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(request.url);
    const sent = url.searchParams.get('key') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (sent !== secret) return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }
  const snapshotDate = businessDate();
  const fetchStock = (code: string) => fetch(`${BVLGARI_API_BASE}/stockvaluation?location=${encodeURIComponent(code)}`, {
    headers: BVLGARI_API_TOKEN ? { Authorization: BVLGARI_API_TOKEN } : {},
  });
  const stores: Record<string, { success: boolean; inserted: number; error?: string }> = {};
  for (const code of STORES) {
    const result = await syncInventory(code, snapshotDate, fetchStock);
    stores[code] = { success: result.success, inserted: result.inserted, ...(result.error ? { error: result.error } : {}) };
  }
  const success = Object.values(stores).every(store => store.success);
  console.log(`[CRON INVENTORY SYNC] ${snapshotDate}`, JSON.stringify(stores));
  return NextResponse.json({ success, snapshotDate, stores }, { status: success ? 200 : 502 });
}
