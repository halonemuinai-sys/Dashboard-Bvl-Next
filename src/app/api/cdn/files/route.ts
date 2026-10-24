import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireCdnAdmin } from '@/lib/cdn-access';

// Same-origin only: listing and deleting are for signed-in administrators.
const CORS_HEADERS = {};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  const denied = await requireCdnAdmin();
  if (denied) return NextResponse.json({ success: false, error: denied }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const folder = (searchParams.get('folder') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const cdnBase = path.join(process.cwd(), 'public', 'cdn');

    if (!fs.existsSync(cdnBase)) {
      return NextResponse.json({ success: true, files: [] }, { headers: CORS_HEADERS });
    }

    const host = req.headers.get('host') || '202.6.239.245';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';

    type CdnFile = { filename: string; folder: string; path: string; url: string; size: number; updatedAt: string };
    const getFiles = (dirPath: string, folderName = ''): CdnFile[] => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      let results: CdnFile[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relFolder = folderName ? `${folderName}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
          results = results.concat(getFiles(fullPath, relFolder));
        } else {
          const stats = fs.statSync(fullPath);
          results.push({
            filename: entry.name,
            folder: folderName || 'general',
            path: `/cdn/${relFolder}`,
            url: `${protocol}://${host}/cdn/${relFolder}`,
            size: stats.size,
            updatedAt: stats.mtime.toISOString(),
          });
        }
      }
      return results;
    };

    const targetDir = folder ? path.join(cdnBase, folder) : cdnBase;
    if (!fs.existsSync(targetDir)) {
      return NextResponse.json({ success: true, files: [] }, { headers: CORS_HEADERS });
    }

    const files = getFiles(targetDir, folder);

    return NextResponse.json(
      { success: true, count: files.length, files },
      { headers: CORS_HEADERS }
    );
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list CDN files' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(req: Request) {
  const denied = await requireCdnAdmin();
  if (denied) return NextResponse.json({ success: false, error: denied }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const filePathParam = searchParams.get('path') || '';

    if (!filePathParam) {
      return NextResponse.json(
        { success: false, error: 'Path parameter is required' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Sanitize path to prevent traversal
    const cdnRoot = path.join(process.cwd(), 'public', 'cdn');
    const absolutePath = path.resolve(cdnRoot, filePathParam.replace(/^\/cdn\//, ''));

    if (!absolutePath.startsWith(cdnRoot + path.sep) || !fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    fs.unlinkSync(absolutePath);

    return NextResponse.json(
      { success: true, message: 'File deleted successfully from Proxmox CDN' },
      { headers: CORS_HEADERS }
    );
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete file' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
