'use client';

import React, { useState } from 'react';
import { Users, Phone, MessageSquare, Plus, Search, Filter, Calendar } from 'lucide-react';

export default function MobileProspectsPage() {
  const [search, setSearch] = useState('');

  // Demo prospects list
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
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Cari prospect / nama / item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-amber-500"
          />
        </div>
        <button className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl font-bold flex items-center shadow-lg shadow-amber-500/20">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Prospects List */}
      <div className="space-y-3">
        {filtered.map((item, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
            
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-sm font-bold text-slate-100">{item.name}</h4>
                <p className="text-xs text-amber-400 font-medium mt-0.5">{item.item}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                item.status === 'Walk-in' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                item.status === 'Follow Up' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                {item.status}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1 text-slate-500" /> {item.date}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2">
                <a
                  href={`https://wa.me/${item.phone}?text=Halo%20${encodeURIComponent(item.name)},%20salam%20dari%20Bvlgari%20${encodeURIComponent(item.store)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center space-x-1 font-semibold hover:bg-emerald-600/30"
                >
                  <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                </a>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
