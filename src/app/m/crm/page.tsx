'use client';

import React, { useState } from 'react';
import { UserCheck, Search, Plus, Star, Phone, Mail, MapPin } from 'lucide-react';

export default function MobileCrmPage() {
  const [search, setSearch] = useState('');

  const clients = [
    { name: 'Ibu Ratna S.', phone: '+62 812-9876-5432', segment: 'Elite VVIP', ltv: 'Rp 450.000.000', location: 'Jakarta' },
    { name: 'Pak Hendra K.', phone: '+62 811-2345-6789', segment: 'Top VIP', ltv: 'Rp 1.850.000.000', location: 'Jakarta' },
    { name: 'Ibu Maya L.', phone: '+62 818-0987-6543', segment: 'High Potential', ltv: 'Rp 85.000.000', location: 'Surabaya' },
  ];

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari nama client / nomor telp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold flex items-center shadow-md shadow-indigo-500/20">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* CRM Client Cards matching Flutter Light Theme */}
      <div className="space-y-3">
        {filtered.map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-sm">
            
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                <p className="text-xs text-slate-500 font-medium flex items-center mt-0.5">
                  <Phone className="w-3.5 h-3.5 mr-1 text-indigo-600" /> {item.phone}
                </p>
              </div>
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                item.segment.includes('Top') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                item.segment.includes('Elite') ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {item.segment}
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs font-semibold">
              <span className="text-slate-500">Total Spend (LTV)</span>
              <span className="font-extrabold text-indigo-600">{item.ltv}</span>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
