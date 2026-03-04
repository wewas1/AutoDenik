import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.redirect(302, '/');
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'https://jcpvjfhfgmijxdrldnds.supabase.co',
      process.env.SUPABASE_SERVICE_KEY
    );

    // Přečti raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    console.log('Body size:', buffer.length);
    console.log('Content-Type:', req.headers['content-type']);

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)["']?/);
    
    if (!boundaryMatch) {
      console.log('No boundary found');
      return res.redirect(302, '/?err=noboundary');
    }
    
    const boundary = boundaryMatch[1];
    console.log('Boundary:', boundary);

    // Parsuj multipart manuálně pomocí Buffer
    const boundaryBuf = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;
    
    while (start < buffer.length) {
      const idx = buffer.indexOf(boundaryBuf, start);
      if (idx === -1) break;
      const partStart = idx + boundaryBuf.length + 2; // skip \r\n
      const nextIdx = buffer.indexOf(boundaryBuf, partStart);
      if (nextIdx === -1) break;
      parts.push(buffer.slice(partStart, nextIdx - 2)); // trim \r\n
      start = nextIdx;
    }

    console.log('Parts found:', parts.length);

    let fileBuffer = null;
    let fileName = 'receipt.jpg';
    let mimeType = 'image/jpeg';

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headers = part.slice(0, headerEnd).toString();
      const body = part.slice(headerEnd + 4);
      
      console.log('Part headers:', headers.slice(0, 100));
      
      if (headers.includes('filename=')) {
        const nameMatch = headers.match(/filename="([^"]+)"/);
        if (nameMatch) fileName = nameMatch[1];
        const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
        if (mimeMatch) mimeType = mimeMatch[1].trim();
        fileBuffer = body;
        console.log('File found:', fileName, mimeType, body.length);
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      console.log('No file buffer');
      return res.redirect(302, '/?err=nofile');
    }

    const fileId = Math.random().toString(36).slice(2, 10);
    const ext = fileName.toLowerCase().endsWith('.pdf') ? '.pdf' : '.jpg';
    const path = `${fileId}${ext}`;

    const { error } = await supabase.storage
      .from('temp-receipts')
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (error) {
      console.log('Upload error:', error.message);
      return res.redirect(302, '/?err=upload');
    }

    console.log('Uploaded:', path);
    return res.redirect(302, `/?receipt=${path}`);
    
  } catch (e) {
    console.error('share-target error:', e.message);
    return res.redirect(302, '/?err=' + encodeURIComponent(e.message));
  }
}
