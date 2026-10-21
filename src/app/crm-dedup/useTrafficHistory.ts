"use client";

import { useEffect, useRef, useState } from 'react';
import type { IntegratedTrafficItem } from './components/TrafficHistoryTable';

export interface HistoryFilters {
  query: string;
  store: string;
  status: string;
  prospect: string;
  startDate: string;
  endDate: string;
}
export const emptyHistoryFilters: HistoryFilters = { query: '', store: 'ALL', status: 'ALL', prospect: 'ALL', startDate: '', endDate: '' };
export const historyPageSize = 40;

export function historyParams(filters: HistoryFilters, page: number) {
  for (const value of [filters.startDate, filters.endDate]) {
    if (!value) continue;
    const date = new Date(`${value}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('Select a valid date range.');
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new Error('From date must be on or before To date.');
  const params = new URLSearchParams({ action: 'get_integrated_traffic', limit: String(historyPageSize), page: String(page) });
  if (filters.query.trim()) params.set('q', filters.query.trim());
  for (const key of ['store', 'status', 'prospect'] as const) if (filters[key] !== 'ALL') params.set(key, filters[key]);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  return params;
}

export function useTrafficHistory() {
  const [draft, setDraft] = useState<HistoryFilters>({ ...emptyHistoryFilters });
  const [result, setResult] = useState<{ filters: HistoryFilters; rows: IntegratedTrafficItem[]; total: number; page: number; loadedAt: Date } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  async function load(filters = draft, page = 1) {
    let params: URLSearchParams;
    try { params = historyParams(filters, page); }
    catch (error) { setError(error instanceof Error ? error.message : 'Check the filters.'); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/crm/dedup?${params}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.trafficRows)) throw new Error(data.error || 'Unable to load visits. Please try again.');
      if (controller.signal.aborted) return;
      const total = Number(data.totalCount ?? data.metrics?.totalRows ?? data.trafficRows.length);
      setResult({ filters: { ...filters }, rows: data.trafficRows, total: Number.isFinite(total) ? Math.max(0, total) : 0, page, loadedAt: new Date() });
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load visits.');
    } finally {
      if (request.current === controller) setLoading(false);
    }
  }
  const dirty = !!result && (Object.keys(draft) as (keyof HistoryFilters)[]).some(key => draft[key].trim() !== result.filters[key].trim());
  return { draft, setDraft, result, loading, error, dirty, load };
}
