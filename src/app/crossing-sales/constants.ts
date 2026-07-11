export const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export const STORE_CONFIG: Record<string, { abbr: string; color: string; bg: string; text: string }> = {
  'Plaza Indonesia': { abbr: 'PI', color: '#2563EB', bg: 'bg-blue-50',    text: 'text-blue-600'   },
  'Plaza Senayan':   { abbr: 'PS', color: '#D97706', bg: 'bg-amber-50',   text: 'text-amber-600'  },
  'Bali':            { abbr: 'BL', color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-600' },
};

export const fmtPct = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

export type StoreCard = {
  store: string;
  physical: number;
  adjusted: number;
  impact: number;
  varPct: number;
  incomingNet: number;
  outgoingNet: number;
};
