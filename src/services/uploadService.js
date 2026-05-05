import { supabase } from '@/lib/supabase';
import { fileTypeFromBuffer } from 'file-type';

// ─── Client-side limits (mirrors server) ──────────────────────────────────────
const LIMITS = {
  logo: 1 * 1024 * 1024,       // 1 MB
  background: 2 * 1024 * 1024, // 2 MB
};

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

// ─── Exponential backoff retry ────────────────────────────────────────────────

async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry on validation errors or rate limits
      if (err.status === 400 || err.status === 401 || err.status === 429) throw err;
      const delay = Math.pow(2, attempt) * 500; // 500ms, 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// ─── Client-side pre-validation ───────────────────────────────────────────────

async function validateFile(file, kind) {
  // 1. MIME type allow-list
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Unsupported file type. Allowed: PNG, JPEG, WebP, SVG, GIF.`);
  }

  // 2. Size limit
  const limit = LIMITS[kind] ?? LIMITS.logo;
  if (file.size > limit) {
    const mb = (limit / 1024 / 1024).toFixed(0);
    throw new Error(`File is too large. Maximum size for ${kind} is ${mb}MB.`);
  }

  // 3. Verify actual file content via magic bytes (file-type package)
  if (file.type !== 'image/svg+xml') {
    const buffer = await file.arrayBuffer();
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED_MIME.has(detected.mime)) {
      throw new Error(`File content does not match its declared type. Upload rejected.`);
    }
    if (detected.mime !== file.type) {
      throw new Error(
        `File extension mismatch: declared ${file.type} but content is ${detected.mime}.`,
      );
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate client-side then upload via the secure-upload Edge Function.
 *
 * @param {File}   file     - The file to upload
 * @param {string} basePath - Storage path without extension, e.g. "acme.com/logo"
 * @param {'logo'|'background'} kind - Determines size limit
 * @returns {Promise<string>} Public URL with cache-bust suffix
 */
export async function uploadFile(file, basePath, kind = 'logo') {
  // Client-side pre-validation for fast UX feedback before hitting the server
  await validateFile(file, kind);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated.');

  const edgeFunctionUrl = `${process.env.VUE_APP_SUPABASE_URL}/functions/v1/secure-upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', basePath);
  formData.append('kind', kind);

  const response = await withRetry(async () => {
    const res = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown error' }));
      const err = new Error(body.error ?? `Upload failed (${res.status})`);
      err.status = res.status;
      throw err;
    }

    return res.json();
  });

  return response.url;
}
