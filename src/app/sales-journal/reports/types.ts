export interface JournalDayRecord {
  day: number;
  dateStr: string;
  dayName: string;
  isWeekend: boolean;
  store: string;
  netSales: number;
  qty: number;
  transCount: number;
  doorTraffic?: number;
  crmTraffic: number;
  walkIn: number;
  followUp: number;
  inHouse: number;
  conversionRate: number | null; // (transCount / crmTraffic)
  deltaPct: number | null;
  note: string;
  tags: string[];
  hasNote: boolean;
  author?: string;
  topCollections?: { name: string; net: number }[];
  discountReasons?: { reason: string; count: number }[];
}

export interface JournalReportPayload {
  month: number;
  monthName: string;
  year: number;
  store: string;
  totalNet: number;
  totalQty: number;
  totalTrans: number;
  totalTraffic: number;
  avgConversionRate: number | null;
  daysWithData: number;
  daysNoted: number;
  totalDays: number;
  records: JournalDayRecord[];
  storeBreakdown?: Record<string, JournalDayRecord[]>;
}

