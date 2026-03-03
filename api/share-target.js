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

    // Přečti raw body jako ArrayBuffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Najdi boundary z Content-Type
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) throw new Error('No boundary');
    const boundary = boundaryMatch[1];

    // Jednoduché parsování multipart
    const bodyStr = buffer.toString('binary');
    const parts = bodyStr.split('--' + boundary);
    
    let fileBuffer = null;
    let fileName = 'receipt.jpg';
    let mimeType = 'image/jpeg';

    for (const part of parts) {
      if (part.includes('Content-Disposition') && part.includes('filename=')) {
        const nameMatch = part.match(/filename="([^"]+)"/);
        if (nameMatch) fileName = nameMatch[1];
        const mimeMatch = part.match(/Content-Type: ([^\r\n]+)/);
        if (mimeMatch) mimeType = mimeMatch[1].trim();
        // Obsah souboru je za prázdným řádkem
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        const dataEnd = part.lastIndexOf('\r\n');
        if (dataStart > 4 && dataEnd > dataStart) {
          fileBuffer = Buffer.from(part.slice(dataStart, dataEnd), 'binary');
        }
      }
    }

    if (!fileBuffer) throw new Error('No file found');

    const fileId = Math.random().toString(36).slice(2, 10);
    const ext = fileName.endsWith('.pdf') ? '.pdf' : '.jpg';
    const path = `${fileId}${ext}`;

    const { error } = await supabase.storage
      .from('temp-receipts')
      .upload(path, fileBuffer, { contentType: mimeType, upsert: true });

    if (error) throw error;

    return res.redirect(302, `/?receipt=${path}`);
  } catch (e) {
    console.error('share-target error:', e.message);
    return res.redirect(302, '/');
  }
}
