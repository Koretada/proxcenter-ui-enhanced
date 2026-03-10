import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

const UPLOAD_DIR = path.join(process.cwd(), 'data', 'uploads', 'branding')
const LEGACY_DIR = path.join(process.cwd(), 'public', 'uploads', 'branding')

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  ico: 'image/x-icon',
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    // Sanitize filename to prevent path traversal
    const sanitized = path.basename(filename)
    // Check new location first, then legacy public/ location
    let filePath = path.join(UPLOAD_DIR, sanitized)
    if (!fs.existsSync(filePath)) {
      filePath = path.join(LEGACY_DIR, sanitized)
    }
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const ext = sanitized.split('.').pop()?.toLowerCase() || ''
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'
    const buffer = fs.readFileSync(filePath)

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
