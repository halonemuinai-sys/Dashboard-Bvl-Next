import { cn } from '@/lib/utils';
import { Summary } from './_types';
import Amt from '@/components/Amt';

interface Props {
  summary: Summary;
}

export default function TransactionSummary({ summary }: Props) {
  const cards = [
    { label: 'Transaksi', value: summary.totalTrans.toLocaleString('id-ID'), unit: 'trans', amt: null },
    { label: 'Total Qty',  value: summary.totalQty.toLocaleString('id-ID'),  unit: 'pcs',   amt: null },
    { label: 'Gross Sales', value: null, unit: '', amt: summary.totalGross },
    { label: 'Total Diskon', value: null, unit: '', amt: summary.totalDisc },
    { label: 'Net Sales',  value: null,  unit: '', amt: summary.totalNet, highlight: true },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {cards.map(k => (
        <div key={k.label} className={cn("bg-white border rounded-xl p-4 shadow-sm",
          k.highlight ? "border-blue-200 bg-blue-50/30" : "border-slate-200")}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
          <p className={cn("text-sm font-black tracking-tight", k.highlight ? "text-blue-700" : "text-slate-800")}>
            {k.amt != null ? <Amt value={k.amt} /> : k.value}
            {k.unit && <span className="text-xs font-medium text-slate-400"> {k.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}
