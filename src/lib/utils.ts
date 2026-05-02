import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka murni dengan pemisah titik (Tanpa Rp)
 * Contoh: 1500000 -> 1.500.000
 */
export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

/**
 * Format angka ringkas hanya dengan M (Tanpa Rp dan Tanpa jt)
 * Contoh: 1.500.000.000 -> 1,5 M
 * Contoh: 1.500.000 -> 1.500.000
 */
export const formatCompact = (value: number) => {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toLocaleString('id-ID', { 
      maximumFractionDigits: 1 
    }) + ' M';
  }
  // Menghilangkan 'jt', kembali ke format angka biasa dengan titik
  return value.toLocaleString('id-ID');
};

/**
 * Khusus untuk Chart Y-Axis (Hanya menggunakan M)
 */
export const formatChartValue = (value: number) => {
  if (value >= 1_000_000_000) return (value / 1_000_000_000) + ' M';
  return value.toLocaleString('id-ID');
};
