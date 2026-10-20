export function businessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(item => item.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// clean_master stores Jakarta dates as timestamptz (legacy rows at 17:00 UTC of the previous
// day, synced rows at 00:00 UTC). Read the calendar date in Asia/Jakarta, never the UTC prefix.
export function salesDate(value: string | null | undefined): string {
  const text = (value || '').trim();
  if (!/(Z|[+-]\d{2}:?\d{2})$/i.test(text)) return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
  const time = new Date(text).getTime();
  return Number.isFinite(time) ? new Date(time + 7 * 3600e3).toISOString().slice(0, 10) : '';
}

export function formatSalesAxis(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function buildDailySalesSeries(dailyData: { net: number; qty: number }[], year: number, month: number, asOfDate = businessDate()) {
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const start = `${year}-${String(month + 1).padStart(2, '0')}`;
  let cumulative = 0;
  return Array.from({ length: count }, (_, index) => {
    const date = `${start}-${String(index + 1).padStart(2, '0')}`;
    const future = date > asOfDate;
    const net = dailyData[index]?.net || 0;
    const qty = dailyData[index]?.qty || 0;
    if (!future) cumulative += net;
    const trailing = dailyData.slice(Math.max(0, index - 6), index + 1);
    const average = trailing.reduce((sum, item) => sum + item.net, 0) / Math.min(index + 1, 7);
    const weekday = new Date(Date.UTC(year, month, index + 1)).getUTCDay();
    return { day: index + 1, date, net: future ? null : net, qty: future ? null : qty, cumulative: future ? null : cumulative, average: future ? null : average, weekend: weekday === 0 || weekday === 6 };
  });
}
