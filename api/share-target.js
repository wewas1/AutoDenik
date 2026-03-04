import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.redirect(302, '/');
  }

  try {
    const supabase = createClient(
      'https://jcpvjfhfgmijxdrldnds.supabase.co',
      process.env.SUPABASE_SERVICE_KEY
    );

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const buffer = Buffer.concat(chunks);

    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=["']?([^"';\s]+)["']?/);
    if (!boundaryMatch) throw new Error('No boundary');
    
    const boundary = boundaryMatch[1];
    const boundaryBuf = Buffer.from('--' + boundary);
    const parts = [];
    let start = 0;
    while (start < buffer.length) {
      const idx = buffer.indexOf(boundaryBuf, start);
      if (idx === -1) break;
      const partStart = idx + boundaryBuf.length + 2;
      const nextIdx = buffer.indexOf(boundaryBuf, partStart);
      if (nextIdx === -1) break;
      parts.push(buffer.slice(partStart, nextIdx - 2));
      start = nextIdx;
    }

    let fileBuffer = null;
    let fileName = 'receipt.jpg';
    let mimeType = 'image/jpeg';

    for (const part of parts) {
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd === -1) continue;
      const headers = part.slice(0, headerEnd).toString();
      if (headers.includes('filename=')) {
        const nameMatch = headers.match(/filename="([^"]+)"/);
        if (nameMatch) fileName = nameMatch[1];
        const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
        if (mimeMatch) mimeType = mimeMatch[1].trim();
        fileBuffer = part.slice(headerEnd + 4);
        break;
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) throw new Error('No file');

    const fileId = Math.random().toString(36).slice(2, 10);
    const ext = fileName.toLowerCase().endsWith('.pdf') ? '.pdf' : '.jpg';
    const path = `${fileId}${ext}`;

    const { error } = await supabase.storage
      .from('temp-receipts')
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (error) throw error;

    // Vrať HTML stránku která uloží do localStorage a pak přesměruje
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
<script>
  localStorage.setItem('ad_pending_receipt', '${path}');
  window.location.replace('/');
</script>
<p>Načítám účtenku...</p>
</body>
</html>`);

  } catch (e) {
    console.error('share-target error:', e.message);
    return res.redirect(302, '/');
  }
}
