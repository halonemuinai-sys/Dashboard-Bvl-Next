// ==========================================
// --- TYPES (Matching GAS Output Exactly) ---
// ==========================================

export interface StorePerformanceRow {
  store: string;
  actual: number;
  cost: number;
  target: number;
  qty: number;
  achievement: number;
}

export interface MonthlyKpi {
  totalNet: number;        // Total Sales Inc. HO
  totalTarget: number;     // Sum of all store targets for the month
  totalQty: number;
  achievement: number;     // totalNet(exc HO) / totalTarget * 100
  totalCost: number;       // Nominal cost value
  costPercentage: number;  // totalCost / totalGross * 100
  totalValDisc: number;    // Nominal discount value
  avgDiscountPercentage: number; // totalValDisc / totalGross * 100
  mtdSalesCurrent: number;   // MTD store sales (exc HO)
  mtdSalesPrevYear: number;  // Same period last year
  mtdGrowthPct: number;      // YoY growth
  momGrowthPct: number;      // MoM growth (vs same period last month)

  // New metrics for Qty and Transactions (Items Sold & Transactions)
  ytdQtyCurrent: number;
  ytdQtyPrevYear: number;
  ytdTxCurrent: number;
  ytdTxPrevYear: number;
  mtdQtyCurrent: number;
  mtdQtyPrevMonth: number;
  mtdTxCurrent: number;
  mtdTxPrevMonth: number;
}

export interface AnnualStats {
  salesExcHO: number;
  target: number;
  achievement: number;
}

export interface TrendDataPoint {
  net: number;
  qty: number;
  trans: number;
  customers: number;
}

export interface CategoryTrendData {
  [category: string]: {
    net: number[];  // 12 months
    qty: number[];  // 12 months
  };
}

export interface MonthlyOverviewData {
  kpi: MonthlyKpi;
  annualStats: AnnualStats;
  storeData: StorePerformanceRow[];
  catData: { [key: string]: { qty: number; net: number } };
  crossingData: {
    totalNet: number;
    totalQty: number;
    storeStats: Record<string, { physical: number; adjusted: number }>;
    records: { salesman: string; baseLoc: string; crossingLoc: string; net: number; qty: number }[];
  };
  trendData: TrendDataPoint[];        // 12 months current year
  multiYearStats: { [year: number]: number[] }; // year -> 12 monthly totals
  categoryTrend: CategoryTrendData;
  advisorData: AdvisorRecord[];
  dailyTrendData: { net: number; qty: number }[];
}

export interface AdvisorRecord {
  name: string;
  location: string;
  netSales: number;
  crossingNet: number;
  crossingQty: number;
  target: number;
  achievement: number;
  contribution: number;
  transCount: number;
  productiveMonths: number;
  categoryMix: { category: string; amount: number; qty: number; pct: number }[];
  storeData: {
    totalSales: number;
    target: number;
    achievement: number;
    status: string;
    advisorContrib: number;
  };
}

export interface AdvisorPerformanceData {
  advisors: AdvisorRecord[];
  month: string;
  year: number;
}

export interface CrossingRecord {
  salesman: string;
  baseLoc: string;
  crossingLoc: string;
  net: number;
  qty: number;
}

export interface CrossingSalesData {
  records: CrossingRecord[];
  totalNet: number;
  totalQty: number;
  totalNetSalesGenerated: number;
  totalQtyGenerated: number;
  hoExcludedNet: number;
  hoExcludedQty: number;
  storeStats: Record<string, { physical: number; adjusted: number }>;
  month: string;
  year: number;
}

export interface AdvisorProfile {
  name: string;
  home_location: string;
}

export interface AdvisorRotation {
  advisor_name: string;
  year: number;
  month_number: number;
  assigned_location: string;
}

export interface AdvisorSetupData {
  advisors: AdvisorProfile[];
  rotations: AdvisorRotation[];
  targets: { advisor_name: string; year: number; month_number: number; target_value: number }[];
  storeTargets: { store_name: string; year: number; month_number: number; target_value: number }[];
}

export interface CrmProfilingRow {
  id: number;
  tanggal_input: string | null;
  nama_depan: string;
  nama_belakang: string;
  title: string;
  nama_lengkap: string;
  nama_panggilan: string;
  customer_advisor: string;
  lokasi_store: string;
  tanggal_lahir: string | null;
  status_pelanggan: string;
  domisili: string;
  domisili_luar_negeri: string;
  umur: string;
  etnis: string;
  agama: string;
  kewarganegaraan: string;
  no_hp: string;
  email: string;
  pekerjaan: string;
  fashion_style: string;
  bentuk_tubuh: string;
  tinggi_badan: string;
  cake_favorit: string;
  makanan_favorit: string;
  minuman_favorit: string;
  alergi_makanan: string;
  hobby: string;
  hobby_kategori: string;
  hobby_sub: string;
  hobby_others: string;
  warna_favorit: string;
  status_pernikahan: string;
  memiliki_anak: string;
  jumlah_anak: string;
  tempat_liburan_favorit: string;
  topik_pembicaraan_favorit: string;
  karakter: string;
  tanggal_pernikahan: string | null;
  barang_antusias: string;
  instagram: string;
  tiktok: string;
  ktp_passport: string;
  foto_customer: string;
  faktor_pemicu_pembelian: string;
  full_name_tittle: string;
  created_at: string;
  updated_at: string;
}

export interface FootfallStoreRow {
  id: number;
  transaction_date: string;
  location: string;
  traffic_in: number;
  traffic_out: number;
  men_pct: number;
  women_pct: number;
}

export interface FootfallCrmRow {
  id: number;
  transaction_date: string;
  location: string;
  walk_in: number;
  appointment: number;
  new_customer: number;
}

export interface StockStoreRow {
  id: number;
  year: number;
  location: string;
  category: string;
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}
