export const PROFILE_PAGE_SIZE = 24;
export type ProfilePhotoFilter = 'all' | 'with' | 'missing';
export const MISSING_PHOTO_FILTER = 'foto_customer.is.null,foto_customer.match."^[[:space:]]*$"';

export function profileDirectoryFilter(search: string, photo: ProfilePhotoFilter) {
  const searchFilter = profileSearchFilter(search);
  const photoFilter = photo === 'missing' ? MISSING_PHOTO_FILTER
    : photo === 'with' ? 'foto_customer.match."[^[:space:]]"' : '';
  if (searchFilter && photoFilter) return `and(or(${searchFilter}),or(${photoFilter}))`;
  return searchFilter || photoFilter;
}

export function profilePhotoSummary(total: number, missing: number) {
  const withPhoto = Math.max(0, total - missing);
  return { total, missing, withPhoto, coverage: total ? Math.round(withPhoto / total * 1000) / 10 : 0 };
}

/** Quote each PostgREST operand so punctuation cannot change the filter. */
export function profileSearchFilter(search: string): string {
  const value = search.trim();
  if (!value) return '';
  const pattern = JSON.stringify(`%${value.replace(/[\\%_*]/g, '\\$&')}%`);
  return ['nama_lengkap', 'full_name_tittle', 'nama_depan', 'nama_belakang',
    'nama_panggilan', 'no_hp', 'email', 'customer_advisor']
    .map(column => `${column}.ilike.${pattern}`).join(',');
}

export function profilePageRange(page: number) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const from = (safePage - 1) * PROFILE_PAGE_SIZE;
  return { from, to: from + PROFILE_PAGE_SIZE - 1 };
}

export function profileCsvCell(value: unknown): string {
  const text = String(value ?? '');
  // Keep exported names/phone numbers as data, including values beginning with +.
  const safe = /^[\s]*[=+@-]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}
