import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = (searchParams.get('folder') || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const cdnBase = path.join(process.cwd(), 'public', 'cdn');

    if (!fs.existsSync(cdnBase)) {
      return NextResponse.json({ success: true, files: [] }, { headers: CORS_HEADERS });
    }

    const host = req.headers.get('host') || '202.6.239.245';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';

    const getFiles = (dirPath: string, folderName = ''): any[] => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      let results: any[] = [];

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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to list CDN files' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function DELETE(req: Request) {
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
    const cleanPath = filePathParam.replace(/^\/cdn\//, '').replace(/\.\./g, '');
    const absolutePath = path.join(process.cwd(), 'public', 'cdn', cleanPath);

    if (!fs.existsSync(absolutePath)) {
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
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete file' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
