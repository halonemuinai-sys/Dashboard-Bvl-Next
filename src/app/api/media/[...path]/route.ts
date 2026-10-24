import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getSessionUser } from '@/lib/server-access';
import { hasMenuAccess } from '@/lib/access-policy';
import { APPSHEET_MEDIA_FOLDERS } from '@/lib/media';

// Private storage mounted from the server (see docker-compose.yml); never under public/.
const MEDIA_ROOT = process.env.APPSHEET_MEDIA_DIR || path.join(process.cwd(), 'storage', 'appsheet');
const CRM_MENUS = ['/crm-profiling', '/crm-dedup', '/advanced-clienteling', '/app-sheet-crm'];
const TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.pdf': 'application/pdf' };

const deny = (status: number, message: string) => new Response(message, { status, headers: { 'Cache-Control': 'no-store' } });

/** Customer photos, ID scans and chat proofs from AppSheet, for signed-in users with a CRM menu. */
export async function GET(_req: Request, props: { params: Promise<{ path: string[] }> }) {
  let access: Awaited<ReturnType<typeof getSessionUser>>;
  try { access = await getSessionUser(); } catch { return deny(401, 'Please sign in to view this file.'); }
  const { db, user } = access;
  const { data, error } = await db.from('role_menu_access').select('menu_path,allowed').eq('role', user.role);
  const allowed = (data || []).filter(r => r.allowed).map(r => r.menu_path);
  if (error || !CRM_MENUS.some(menu => hasMenuAccess(user.role, allowed, menu))) return deny(403, 'You do not have access to CRM files.');

  const segments = (await props.params).path || [];
  if (segments.length !== 2) return deny(404, 'File not found.');
  const [folder, name] = segments;
  const type = TYPES[path.extname(name).toLowerCase()];
  if (!(APPSHEET_MEDIA_FOLDERS as readonly string[]).includes(folder) || !type || name !== path.basename(name) || name.startsWith('.')) return deny(404, 'File not found.');

  const file = path.join(MEDIA_ROOT, folder, name);
  if (!file.startsWith(path.join(MEDIA_ROOT, folder) + path.sep)) return deny(404, 'File not found.');
  try {
    const body = await readFile(file);
    if (!body.length) return deny(404, 'File not found.');
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(body.length),
        'Cache-Control': 'private, max-age=3600',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return deny(404, 'File not found.');
  }
}
