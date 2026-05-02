"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  Target, 
  ArrowUpRight, 
  Calendar,
  Store,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

// Format Currency
const formatIDR = (val: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(val);
};

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalQty: 0,
    totalTrans: 0,
    achievement: 0,
    target: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [storeData, setStoreData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        // 1. Fetch Sales Data
        const { data: sales, error: salesError } = await supabase
          .from('clean_master')
          .select('*');
        
        if (salesError) throw salesError;

        // 2. Fetch Targets
        const { data: targets, error: targetError } = await supabase
          .from('targets')
          .select('*');
        
        if (targetError) throw targetError;

        // --- Calculate Stats ---
        const totalSales = sales.reduce((acc, curr) => acc + (curr.net_sales || 0), 0);
        const totalQty = sales.reduce((acc, curr) => acc + (curr.qty || 0), 0);
        const totalTrans = new Set(sales.map(s => s.trans_no)).size;
        const totalTarget = targets.reduce((acc, curr) => acc + (curr.target_value || 0), 0);

        setStats({
          totalSales,
          totalQty,
          totalTrans,
          target: totalTarget,
          achievement: totalTarget > 0 ? (totalSales / totalTarget) * 100 : 0
        });

        // --- Process Chart Data (Monthly) ---
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyMap: any = {};
        months.forEach(m => monthlyMap[m] = { name: m, sales: 0, target: 0 });

        sales.forEach(s => {
          const d = new Date(s.transaction_date);
          const m = months[d.getMonth()];
          if (monthlyMap[m]) monthlyMap[m].sales += s.net_sales;
        });

        targets.forEach(t => {
          const m = t.month.substring(0, 3);
          if (monthlyMap[m]) monthlyMap[m].target += t.target_value;
        });

        setChartData(Object.values(monthlyMap));

        // --- Store Performance ---
        const storeMap: any = {};
        sales.forEach(s => {
          const loc = s.location || "Unknown";
          if (!storeMap[loc]) storeMap[loc] = { name: loc, sales: 0, qty: 0 };
          storeMap[loc].sales += s.net_sales;
          storeMap[loc].qty += s.qty;
        });
        setStoreData(Object.values(storeMap).sort((a: any, b: any) => b.sales - a.sales));

      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-widest text-amber-500 uppercase">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-6 md:p-10 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Bvlgari <span className="text-amber-500">Retail BI</span>
          </h1>
          <p className="text-zinc-500 text-sm">Real-time performance analytics overview</p>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 p-2 rounded-xl">
          <Calendar className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-medium">May 2026</span>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard 
          title="Total Net Sales" 
          value={formatIDR(stats.totalSales)} 
          icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
          trend="+12.5%"
          color="emerald"
        />
        <StatCard 
          title="Total Transactions" 
          value={stats.totalTrans.toLocaleString()} 
          icon={<ShoppingBag className="w-5 h-5 text-blue-400" />}
          trend="+5.2%"
          color="blue"
        />
        <StatCard 
          title="Total Qty Sold" 
          value={stats.totalQty.toLocaleString()} 
          icon={<Users className="w-5 h-5 text-purple-400" />}
          trend="+3.1%"
          color="purple"
        />
        <StatCard 
          title="Sales Achievement" 
          value={`${stats.achievement.toFixed(1)}%`} 
          icon={<Target className="w-5 h-5 text-amber-500" />}
          trend="vs Target"
          color="amber"
          isProgress
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-lg font-semibold text-white">Sales vs Target Trend</h2>
              <p className="text-zinc-500 text-xs">Monthly revenue comparison</p>
            </div>
            <div className="flex gap-4">
               <div className="flex items-center gap-2 text-xs">
                 <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                 <span className="text-zinc-400">Sales</span>
               </div>
               <div className="flex items-center gap-2 text-xs">
                 <div className="w-3 h-3 rounded-full bg-zinc-700"></div>
                 <span className="text-zinc-400">Target</span>
               </div>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#71717a', fontSize: 12}}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#71717a', fontSize: 12}}
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}M`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff', borderRadius: '12px' }}
                  itemStyle={{ color: '#f59e0b' }}
                  formatter={(val: number) => formatIDR(val)}
                />
                <Area type="monotone" dataKey="sales" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                <Bar dataKey="target" fill="#3f3f46" radius={[4, 4, 0, 0]} barSize={20} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Store Performance */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Store className="w-5 h-5 text-amber-500" />
            Store Performance
          </h2>
          <div className="space-y-6">
            {storeData.map((store, i) => (
              <div key={i} className="group">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-amber-500 transition-colors">{store.name}</p>
                    <p className="text-xs text-zinc-500">{store.qty} items sold</p>
                  </div>
                  <p className="text-sm font-bold">{formatIDR(store.sales)}</p>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full" 
                    style={{ width: `${(store.sales / stats.totalSales) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, color, isProgress = false }: any) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 hover:border-zinc-700 transition-all group relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-zinc-800/20 rounded-full blur-2xl group-hover:bg-zinc-700/30 transition-all"></div>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-zinc-800/50 text-${color}-400`}>
          {icon}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full uppercase tracking-wider">
          {trend}
        </div>
      </div>
      <div>
        <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
      </div>
      {isProgress && (
        <div className="mt-4 w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
           <div className="bg-amber-500 h-full rounded-full" style={{ width: value }}></div>
        </div>
      )}
    </div>
  );
}
