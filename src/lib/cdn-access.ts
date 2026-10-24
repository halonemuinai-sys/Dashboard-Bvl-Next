import 'server-only';
import { getSessionUser } from './server-access';
import { isAdminRole } from './access-policy';

// Files written to public/cdn are served to anyone with the URL, so only plain images and PDFs
// in the folders the CRM forms use are accepted.
export const CDN_UPLOAD_FOLDERS = ['bukti_chat', 'foto_customer', 'ktp_passport'] as const;
export const CDN_UPLOAD_TYPES: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.pdf': 'application/pdf' };
export const CDN_MAX_BYTES = 10 * 1024 * 1024;

/** Listing and deleting CDN files is for dashboard administrators only. */
export async function requireCdnAdmin(): Promise<string | null> {
  try {
    const { user } = await getSessionUser();
    return isAdminRole(user.role) ? null : 'Administrator access is required.';
  } catch {
    return 'Please sign in to continue.';
  }
}
