import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Cache-Control': 'public, max-age=31536000, immutable',
};

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    
    // Prevent directory traversal attacks
    const sanitizedPath = pathSegments
      .map(segment => segment.replace(/\.\./g, ''))
      .join('/');

    // Check inside public/cdn first, then public/uploads
    let filePath = path.join(process.cwd(), 'public', 'cdn', sanitizedPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(process.cwd(), 'public', 'uploads', sanitizedPath);
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      return NextResponse.json(
        { success: false, error: 'File not found on Proxmox CDN' },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'CDN serve error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
