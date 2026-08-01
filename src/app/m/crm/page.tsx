'use client';

import React, { useState } from 'react';
import { UserCheck, Search, Plus, Star, Phone, Mail, MapPin } from 'lucide-react';

export default function MobileCrmPage() {
  const [search, setSearch] = useState('');

  const clients = [
    { name: 'Ibu Ratna S.', phone: '+62 812-9876-5432', segment: 'Elite', ltv: 'Rp 450.000.000', location: 'Jakarta' },
    { name: 'Pak Hendra K.', phone: '+62 811-2345-6789', segment: 'Top', ltv: 'Rp 1.850.000.000', location: 'Jakarta' },
    { name: 'Ibu Maya L.', phone: '+62 818-0987-6543', segment: 'High Potential', ltv: 'Rp 85.000.000', location: 'Surabaya' },
  ];

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari nama client / nomor telp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500"
          />
        </div>
        <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* CRM Client Cards */}
      <div className="space-y-3">
        {filtered.map((item, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{item.name}</h4>
                <p className="text-xs text-slate-400 flex items-center mt-0.5">
                  <Phone className="w-3 h-3 mr-1 text-amber-400" /> {item.phone}
                </p>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                item.segment === 'Top' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                item.segment === 'Elite' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' :
                'bg-blue-500/20 text-blue-300 border border-blue-500/40'
              }`}>
                {item.segment}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400">Total Spend (LTV)</span>
              <span className="font-extrabold text-amber-400">{item.ltv}</span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
