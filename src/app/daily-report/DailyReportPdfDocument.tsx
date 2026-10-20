import Amt from '@/components/Amt';
import { longReportDate, type DailyReport } from './dailyReportExport';

const fmtPct = (n: number) => (typeof n === 'number' && !isNaN(n) ? n.toFixed(1) + '%' : '0.0%');

/** Off-screen A4 layout captured by renderDailyPdf(). Kept print-plain on purpose. */
export default function DailyReportPdfDocument({ data, date }: { data: DailyReport; date: string }) {
  return (
    <div id="pdf-document" className="absolute -left-[9999px] top-0 w-[794px] bg-white text-black font-sans p-8 box-border" style={{ minHeight: '1123px' }}>
      <div className="bg-slate-900 text-white py-4 px-6 mb-4 -mx-8 -mt-8">
        <h1 className="text-2xl font-serif uppercase tracking-[0.25em] text-white text-center">Bvlgari</h1>
        <h2 className="text-sm mt-1 font-medium text-slate-300 tracking-widest uppercase text-center">Daily Sales Performance Report</h2>
        <p className="text-[10px] text-slate-400 mt-1 text-center">{longReportDate(date)}</p>
      </div>

      <div className="mb-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-2">Executive Summary</h3>
        <div className="grid grid-cols-2 gap-6">
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-gray-100"><td className="py-1 text-gray-600">Total Sales (Incl. HO)</td><td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.totalSales} /></td></tr>
              <tr className="border-b border-gray-100"><td className="py-1 text-gray-600">Store Sales (Excl. HO)</td><td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.storeSales} /></td></tr>
              <tr className="border-b border-gray-100"><td className="py-1 text-gray-600">Global Target MTD</td><td className="py-1 text-right font-mono font-bold"><Amt value={data.globalKPIs.globalTarget} /></td></tr>
            </tbody>
          </table>
          <table className="w-full text-xs">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-1 text-gray-600">Global Achievement</td>
                <td className="py-1 text-right font-mono font-bold"><span className="bg-slate-900 text-white px-2 py-0.5 rounded-sm">{fmtPct(data.globalKPIs.globalAchievement)}</span></td>
              </tr>
              <tr className="border-b border-gray-100"><td className="py-1 text-gray-600">MTD Cost % (MDR + Disc)</td><td className="py-1 text-right font-mono font-bold text-rose-600">{fmtPct(data.globalKPIs.mtdCostPct)}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-1 text-gray-600">Average Discount MTD</td><td className="py-1 text-right font-mono font-bold text-amber-600">{fmtPct(data.globalKPIs.avgDiscMtd)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-2">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-1 mb-3">Boutique Performance Breakdown</h3>
        {data.stores.map(store => (
          <div key={store.storeName} className="mb-4">
            <div className="bg-slate-800 text-white py-1.5 px-3 mb-2 flex justify-between items-center">
              <h4 className="font-bold text-sm">{store.storeName}</h4>
              <div className="text-right text-[10px]">
                <span className="text-slate-300 mr-2 uppercase tracking-tighter">MTD Achievement:</span>
                <span className="font-black bg-white text-slate-900 px-2 py-0.5 rounded-sm shadow-sm">{fmtPct(store.metrics.achievement)}</span>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-[10px]">
              {[
                ['MTD Sales', <Amt key="a" value={store.metrics.mtdSales} />, ''],
                ['Target', <Amt key="b" value={store.metrics.target} />, ''],
                ['Rem. to Target', <Amt key="c" value={store.metrics.remaining} />, 'rose'],
                ["Today's Sales", <Amt key="d" value={store.metrics.todaySales} />, ''],
                ['MTD Cost %', fmtPct(store.metrics.mtdCostPct), 'rose-text'],
                ['MTD MDR %', fmtPct(store.metrics.mtdMdrPct), ''],
                ['AVG Disc MTD', fmtPct(store.metrics.avgDiscMtd), 'amber-text'],
              ].map(([label, value, tone]) => (
                <div key={String(label)} className={tone === 'rose' ? 'border border-gray-100 p-1.5 bg-rose-50/30' : 'border border-gray-100 p-1.5'}>
                  <div className={tone === 'rose' ? 'text-rose-500 mb-0.5 text-[9px] leading-tight' : 'text-gray-500 mb-0.5 text-[9px] leading-tight'}>{label}</div>
                  <div className={tone === 'rose' || tone === 'rose-text' ? 'font-bold font-mono text-rose-600' : tone === 'amber-text' ? 'font-bold font-mono text-amber-600' : 'font-bold font-mono'}>{value}</div>
                </div>
              ))}
            </div>
            <table className="w-full text-[10px] text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-800 text-white text-[9px] uppercase tracking-wider">
                  <th className="border border-slate-700 py-1 px-2">Category</th>
                  <th className="border border-slate-700 py-1 px-2 text-center">Qty (Sold)</th>
                  <th className="border border-slate-700 py-1 px-2 text-right">Reg Sales</th>
                  <th className="border border-slate-700 py-1 px-2 text-right">SMI Sales</th>
                  <th className="border border-slate-700 py-1 px-2 text-center">Disc %</th>
                  <th className="border border-slate-700 py-1 px-2 text-center">Rem. Stock</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(store.tableData).map(([cat, vals]) => (
                  <tr key={cat}>
                    <td className="border border-gray-200 py-1 px-2 font-medium">{cat}</td>
                    <td className="border border-gray-200 py-1 px-2 text-center font-mono">{vals.qty}</td>
                    <td className="border border-gray-200 py-1 px-2 text-right font-mono"><Amt value={vals.netNonSMI} /></td>
                    <td className="border border-gray-200 py-1 px-2 text-right font-mono"><Amt value={vals.netSMI} /></td>
                    <td className="border border-gray-200 py-1 px-2 text-center font-mono">{vals.gross > 0 ? ((vals.valDisc / vals.gross) * 100).toFixed(1) : '0.0'}%</td>
                    <td className="border border-gray-200 py-1 px-2 text-center font-mono font-bold text-red-600">{vals.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 left-8 right-8 pt-2 border-t border-slate-200 text-[9px] text-slate-400 flex justify-between items-center">
        <div>
          <p className="font-bold text-slate-600 tracking-widest uppercase">Confidential</p>
          <p>Internal Use Only — Bvlgari Indonesia</p>
        </div>
        <div className="text-right">
          <p>Generated via Bvlgari Dashboard</p>
          <p className="font-bold text-slate-500">MRA Retail</p>
          <p className="text-[7px] mt-0.5">{new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })}</p>
        </div>
      </div>
    </div>
  );
}
