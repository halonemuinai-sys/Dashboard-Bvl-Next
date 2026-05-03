export const ID_HOLIDAYS: Record<string, string> = {
  // 2026
  "2026-01-01": "Tahun Baru 2026",
  "2026-02-14": "Isra Mikraj",
  "2026-02-17": "Tahun Baru Imlek",
  "2026-03-19": "Hari Suci Nyepi",
  "2026-03-20": "Cuti Bersama Nyepi",
  "2026-03-21": "Hari Paskah",
  "2026-04-03": "Wafat Isa Al Masih",
  "2026-04-10": "Cuti Bersama Idul Fitri",
  "2026-04-13": "Cuti Bersama Idul Fitri",
  "2026-04-14": "Idul Fitri 1447 H",
  "2026-04-15": "Idul Fitri 1447 H",
  "2026-04-16": "Cuti Bersama Idul Fitri",
  "2026-04-17": "Cuti Bersama Idul Fitri",
  "2026-05-01": "Hari Buruh",
  "2026-05-14": "Kenaikan Isa Al Masih",
  "2026-05-31": "Hari Raya Waisak",
  "2026-06-01": "Hari Lahir Pancasila",
  "2026-06-21": "Idul Adha 1447 H",
  "2026-06-22": "Cuti Bersama Idul Adha",
  "2026-07-11": "Tahun Baru Islam 1448 H",
  "2026-08-17": "HUT RI",
  "2026-09-19": "Maulid Nabi",
  "2026-12-24": "Cuti Bersama Natal",
  "2026-12-25": "Hari Raya Natal",
  // 2025
  "2025-03-31": "Idul Fitri 1446 H",
  "2025-04-01": "Idul Fitri 1446 H",
  // 2024
  "2024-04-10": "Idul Fitri 1445 H",
  "2024-04-11": "Idul Fitri 1445 H",
};

export type DayType = 'weekday' | 'weekend' | 'holiday';

export function getDayType(year: number, monthIndex: number, day: number): DayType {
  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (ID_HOLIDAYS[dateStr]) return 'holiday';
  const dow = new Date(year, monthIndex, day).getDay();
  if (dow === 0 || dow === 6) return 'weekend';
  return 'weekday';
}

export function getHolidayName(year: number, monthIndex: number, day: number): string | null {
  const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return ID_HOLIDAYS[dateStr] || null;
}
