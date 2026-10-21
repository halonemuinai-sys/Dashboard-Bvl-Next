export interface VisitItem {
  item_code: string;
  sap_code: string;
  deskripsi: string;
  harga: number;
  kategori: string;
  koleksi: string;
}

export function boutiqueDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function visitAmounts(items: Pick<VisitItem, 'harga'>[], discount: number) {
  const subtotal = items.reduce((sum, item) => sum + item.harga, 0);
  const net = Math.round((subtotal * (1 - discount / 100) + Number.EPSILON) * 100) / 100;
  return { subtotal, net };
}

/** Shared validation: the API recalculates amounts instead of trusting client totals. */
export function validateVisit(data: Record<string, unknown> | null | undefined, input: unknown) {
  if (!data || typeof data.customer_name !== 'string' || !data.customer_name.trim()) throw new Error('Enter the customer name.');
  const date = String(data.tanggal_berkunjung || '');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new Error('Select a valid visit date.');
  if (typeof data.location !== 'string' || !data.location.trim()) throw new Error('Select a boutique.');
  if (data.email && (typeof data.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))) throw new Error('Enter a valid email address or leave it blank.');
  const discount = data.diskon_pct ?? 0;
  if (typeof discount !== 'number' || !Number.isFinite(discount) || discount < 0 || discount > 100) throw new Error('Discount must be between 0% and 100%.');
  if (!Array.isArray(input)) throw new Error('Invalid product interest list.');
  const items: VisitItem[] = input.map((item, index) => {
    if (!item || typeof item.deskripsi !== 'string' || !item.deskripsi.trim() || typeof item.harga !== 'number' || !Number.isFinite(item.harga) || item.harga <= 0) throw new Error(`Item ${index + 1} needs a description and a price greater than zero.`);
    const text = (key: string) => typeof item[key] === 'string' ? item[key].trim() : '';
    return { item_code: text('item_code'), sap_code: text('sap_code'), deskripsi: text('deskripsi'), harga: item.harga, kategori: text('kategori'), koleksi: text('koleksi') };
  });
  const amounts = visitAmounts(items, discount);
  if (!Number.isFinite(amounts.subtotal) || !Number.isFinite(amounts.net)) throw new Error('The item total is too large.');
  return { items, discount, ...amounts, customerName: data.customer_name.trim() };
}
