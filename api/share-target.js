const { createClient } = require('@supabase/supabase-js');
const formidable = require('formidable');
const fs = require('fs');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://jcpvjfhfgmijxdrldnds.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.redirect(302, '/');
  }

  try {
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 });
    const [, files] = await form.parse(req);

    const fileArr = files.file;
    const file = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!file) return res.redirect(302, '/');

    const fileId = Math.random().toString(36).slice(2, 10);
    const ext = (file.originalFilename || '').endsWith('.pdf') ? '.pdf' : '.jpg';
    const path = `${fileId}${ext}`;

    const fileBuffer = fs.readFileSync(file.filepath);
    const { error } = await supabase.storage
      .from('temp-receipts')
      .upload(path, fileBuffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    return res.redirect(302, `/?receipt=${path}`);
  } catch (e) {
    console.error('share-target error:', e);
    return res.redirect(302, '/');
  }
};
