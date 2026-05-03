import { Filter, Search, X } from 'lucide-react';

interface Props {
  search: string;      onSearch: (v: string) => void;
  filterLoc: string;   onLoc: (v: string) => void;
  filterCat: string;   onCat: (v: string) => void;
  filterType: string;  onType: (v: string) => void;
  locations: string[];
  categories: string[];
  types: string[];
  totalFiltered: number;
  page: number;
  totalPages: number;
}

export default function TransactionFilters({
  search, onSearch, filterLoc, onLoc, filterCat, onCat, filterType, onType,
  locations, categories, types, totalFiltered, page, totalPages,
}: Props) {
  const hasFilters = search || filterLoc || filterCat || filterType;
  const clearAll = () => { onSearch(''); onLoc(''); onCat(''); onType(''); };

  return (
    <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Cari trans no, customer, salesman, koleksi..."
          value={search}
          onChange={e => onSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 outline-none focus:border-blue-300 focus:bg-white transition-colors"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <select aria-label="Filter location" value={filterLoc} onChange={e => onLoc(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 font-bold outline-none cursor-pointer hover:border-slate-300">
          <option value="">All Stores</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select aria-label="Filter category" value={filterCat} onChange={e => onCat(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 font-bold outline-none cursor-pointer hover:border-slate-300">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select aria-label="Filter type" value={filterType} onChange={e => onType(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-600 font-bold outline-none cursor-pointer hover:border-slate-300">
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {hasFilters && (
          <button type="button" onClick={clearAll}
            className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 px-2 py-1.5 rounded-lg hover:bg-rose-50 transition-colors">
            <X className="w-3.5 h-3.5" /> Reset
          </button>
        )}
      </div>

      <span className="ml-auto text-[10px] font-bold text-slate-400">
        {totalFiltered.toLocaleString('id-ID')} rows · hal {page}/{totalPages}
      </span>
    </div>
  );
}
