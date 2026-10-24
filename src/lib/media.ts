// AppSheet stores photos as "<Folder>/<file>"; the files live in private storage on the
// server and are served only to signed-in CRM users through /api/media.
export const APPSHEET_MEDIA_FOLDERS = ['Form Profiling_Images', 'Form Profiling_Files_', 'Traffic_Images', 'Traffic_Files_'] as const;

/** Browser URL for a stored photo value, or null when there is nothing to show. */
export function mediaUrl(value: string | null | undefined): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (/^(https?:)?\/\//i.test(v) || v.startsWith('/')) return v;
  const slash = v.indexOf('/');
  if (slash < 0) return null;
  const folder = v.slice(0, slash);
  if (!(APPSHEET_MEDIA_FOLDERS as readonly string[]).includes(folder)) return null;
  return `/api/media/${encodeURIComponent(folder)}/${encodeURIComponent(v.slice(slash + 1))}`;
}
