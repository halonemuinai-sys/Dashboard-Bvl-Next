import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folder = ((formData.get('folder') as string) || 'general').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided in form-data key "file"' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // Prepare target directory
    const uploadDir = path.join(process.cwd(), 'public', 'cdn', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize filename and append timestamp
    const ext = path.extname(file.name) || '.bin';
    const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${baseName}_${Date.now()}${ext.toLowerCase()}`;
    const filePath = path.join(uploadDir, filename);

    // Convert file arrayBuffer to Buffer and write
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    // Host domain / IP protocol construction
    const host = req.headers.get('host') || '202.6.239.245';
    const protocol = req.headers.get('x-forwarded-proto') || 'http';
    const cdnUrl = `${protocol}://${host}/cdn/${folder}/${filename}`;

    return NextResponse.json(
      {
        success: true,
        message: 'File uploaded successfully to Proxmox CDN',
        data: {
          url: cdnUrl,
          path: `/cdn/${folder}/${filename}`,
          filename: filename,
          folder: folder,
          size: file.size,
          type: file.type,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'CDN upload error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
