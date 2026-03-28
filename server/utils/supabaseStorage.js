const path = require('path');
const crypto = require('crypto');

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || 'taskflow-assets';

function ensureSupabaseStorageConfig() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

function safeFileName(originalName = 'file') {
  const extension = path.extname(originalName || '').toLowerCase();
  const base = path.basename(originalName || 'file', extension).replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
  const suffix = crypto.randomBytes(8).toString('hex');
  return `${base}-${suffix}${extension}`;
}

function makeStoragePath(prefix, originalName) {
  return `${prefix}/${Date.now()}-${safeFileName(originalName)}`;
}

function objectPublicUrl(bucket, filePath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodeURI(filePath)}`;
}

async function uploadBuffer({ bucket = storageBucket, path: filePath, buffer, contentType, upsert = false }) {
  ensureSupabaseStorageConfig();

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(filePath)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': contentType || 'application/octet-stream',
      'x-upsert': String(Boolean(upsert)),
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upload failed (${response.status}): ${text}`);
  }

  return {
    bucket,
    path: filePath,
    publicUrl: objectPublicUrl(bucket, filePath),
  };
}

async function deleteObject(filePath, bucket = storageBucket) {
  if (!filePath) return;
  ensureSupabaseStorageConfig();

  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodeURI(filePath)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  });

  if (!response.ok && response.status !== 404) {
    const text = await response.text();
    throw new Error(`Supabase delete failed (${response.status}): ${text}`);
  }
}

function parseStoragePath(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/uploads/')) {
    return trimmed.replace(/^\/uploads\//, '');
  }

  if (trimmed.startsWith('uploads/')) {
    return trimmed.replace(/^uploads\//, '');
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const marker = `/storage/v1/object/public/${storageBucket}/`;
      const idx = url.pathname.indexOf(marker);
      if (idx !== -1) {
        return decodeURIComponent(url.pathname.slice(idx + marker.length));
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  return trimmed.replace(/^\/+/, '');
}

function toPublicUrl(filePath, bucket = storageBucket) {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  if (!supabaseUrl) return filePath;
  return objectPublicUrl(bucket, filePath);
}

module.exports = {
  storageBucket,
  makeStoragePath,
  uploadBuffer,
  deleteObject,
  parseStoragePath,
  toPublicUrl,
};
