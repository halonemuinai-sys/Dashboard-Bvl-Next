'use client';

import React, { useState } from 'react';
import { Users, Phone, MessageSquare, Plus, Search, Filter, Calendar } from 'lucide-react';

export default function MobileProspectsPage() {
  const [search, setSearch] = useState('');

  const prospects = [
    { name: 'Ibu Ratna S.', phone: '6281298765432', status: 'Walk-in', item: 'Serpenti Viper Ring', store: 'Plaza Indonesia', date: '01 Aug 2026' },
    { name: 'Pak Hendra K.', phone: '6281123456789', status: 'Follow Up', item: 'Octo Finissimo Watch', store: 'Plaza Indonesia', date: '01 Aug 2026' },
    { name: 'Ibu Maya L.', phone: '6281809876543', status: 'Delivery', item: 'B.zero1 Necklace', store: 'Plaza Indonesia', date: '31 Jul 2026' },
  ];

  const filtered = prospects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.item.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      
      {/* Search Header */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Cari prospect / nama / item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
          />
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-bold flex items-center shadow-md shadow-indigo-500/20">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Prospects List matching Flutter Design */}
      <div className="space-y-3">
        {filtered.map((item, idx) => (
          <div key={idx} className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3 shadow-sm">
            
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                <p className="text-xs text-indigo-600 font-semibold mt-0.5">{item.item}</p>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                item.status === 'Walk-in' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                item.status === 'Follow Up' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 font-medium">
              <span className="flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> {item.date}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <a
                  href={`https://wa.me/${item.phone}?text=Halo%20${encodeURIComponent(item.name)},%20salam%20dari%20Bvlgari%20${encodeURIComponent(item.store)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center space-x-1 font-bold hover:bg-emerald-100 transition-all text-xs"
                >
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </a>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
