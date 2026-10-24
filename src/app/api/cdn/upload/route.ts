import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CDN_MAX_BYTES, CDN_UPLOAD_FOLDERS, CDN_UPLOAD_TYPES } from '@/lib/cdn-access';

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
    const folder = ((formData.get('folder') as string) || 'bukti_chat').replace(/[^a-zA-Z0-9_-]/g, '');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file provided in form-data key "file"' },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    // The mobile app still uploads without a token, so uploads are limited to images and PDFs
    // in the CRM folders; anything else could be served as a page on this domain.
    const extension = path.extname(file.name).toLowerCase();
    if (!(CDN_UPLOAD_FOLDERS as readonly string[]).includes(folder)) {
      return NextResponse.json({ success: false, error: `Folder must be one of: ${CDN_UPLOAD_FOLDERS.join(', ')}.` }, { status: 400, headers: CORS_HEADERS });
    }
    if (!CDN_UPLOAD_TYPES[extension]) {
      return NextResponse.json({ success: false, error: 'Only JPG, PNG, WEBP, HEIC images and PDF files can be uploaded.' }, { status: 415, headers: CORS_HEADERS });
    }
    if (file.size === 0 || file.size > CDN_MAX_BYTES) {
      return NextResponse.json({ success: false, error: 'The file must be between 1 byte and 10 MB.' }, { status: 413, headers: CORS_HEADERS });
    }

    // Prepare target directory
    const uploadDir = path.join(process.cwd(), 'public', 'cdn', folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Sanitize filename and append timestamp
    const baseName = path.basename(file.name, path.extname(file.name)).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) || 'file';
    const filename = `${baseName}_${Date.now()}${extension}`;
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
  } catch (caught) {
    const error = caught instanceof Error ? caught : new Error(String(caught));
    return NextResponse.json(
      { success: false, error: error.message || 'CDN upload error' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
