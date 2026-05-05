import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.2.15/mod.ts';

// ─── Config ───────────────────────────────────────────────────────────────────

const BUCKET = 'company-assets';

const LIMITS: Record<string, number> = {
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

// Magic bytes per MIME type
const MAGIC: Record<string, { offset: number; bytes: number[] }> = {
  'image/jpeg': { offset: 0, bytes: [0xff, 0xd8, 0xff] },
  'image/png':  { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  'image/gif':  { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] },
  'image/webp': { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // 'WEBP' at byte 8
};

// ─── Rate limiting (in-memory, per-function instance) ─────────────────────────

const uploadAttempts = new Map<string, number[]>();
const RATE_LIMIT = 5;          // max uploads
const RATE_WINDOW_MS = 60_000; // per minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const attempts = (uploadAttempts.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (attempts.length >= RATE_LIMIT) return true;
  attempts.push(now);
  uploadAttempts.set(userId, attempts);
  return false;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function checkMagicBytes(buffer: Uint8Array, mimeType: string): boolean {
  const rule = MAGIC[mimeType];
  if (!rule) return true; // SVG validated separately
  return rule.bytes.every((b, i) => buffer[rule.offset + i] === b);
}

function sanitizeSvg(svgText: string): string {
  // Remove script tags and event handlers via regex (no DOM in Deno)
  let clean = svgText
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*\/>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]*/gi, '')
    .replace(/javascript\s*:/gi, 'removed:')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '');
  return clean;
}

function safeExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
  };
  return map[mimeType] ?? 'bin';
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── 1. Authentication ──────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // ── 2. Rate limiting ───────────────────────────────────────────────────────
  if (isRateLimited(user.id)) {
    return json({ error: 'Too many uploads. Please wait a minute and try again.' }, 429);
  }

  // ── 3. Parse multipart form data ───────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ error: 'Invalid form data' }, 400);
  }

  const file = formData.get('file') as File | null;
  const basePath = formData.get('path') as string | null;
  const kind = (formData.get('kind') as string | null) ?? 'logo';

  if (!file || !basePath) {
    return json({ error: 'Missing file or path' }, 400);
  }

  // ── 4. MIME type allow-list ────────────────────────────────────────────────
  if (!ALLOWED_MIME.has(file.type)) {
    return json({
      error: `Unsupported file type: ${file.type}. Allowed: PNG, JPEG, WebP, SVG, GIF.`,
    }, 400);
  }

  // ── 5. Size limit ──────────────────────────────────────────────────────────
  const limit = LIMITS[kind] ?? LIMITS.logo;
  if (file.size > limit) {
    const mb = (limit / 1024 / 1024).toFixed(0);
    return json({ error: `File too large. Maximum size for ${kind} is ${mb}MB.` }, 400);
  }

  // ── 6. Read buffer & magic byte check ─────────────────────────────────────
  const buffer = new Uint8Array(await file.arrayBuffer());

  if (!checkMagicBytes(buffer, file.type)) {
    return json({ error: 'File content does not match its declared type. Upload rejected.' }, 400);
  }

  // ── 7. Safe path (no directory traversal) ─────────────────────────────────
  const sanitizedBase = basePath.replace(/\.\./g, '').replace(/[^a-zA-Z0-9/_.-]/g, '');
  const ext = safeExtension(file.type);
  const path = `${sanitizedBase}.${ext}`;

  // ── 8. File processing ────────────────────────────────────────────────────
  let processedBuffer: Uint8Array = buffer;
  let contentType = file.type;

  if (file.type === 'image/svg+xml') {
    // SVG: sanitize, no sharp processing
    const text = new TextDecoder().decode(buffer);
    const clean = sanitizeSvg(text);
    processedBuffer = new TextEncoder().encode(clean);
  } else {
    // Raster images: strip EXIF, resize if oversized, re-encode via imagescript
    try {
      const img = await Image.decode(buffer);

      // Resize if wider than 3840px (4K) or taller than 2160px
      const MAX_W = 3840;
      const MAX_H = 2160;
      if (img.width > MAX_W || img.height > MAX_H) {
        const ratio = Math.min(MAX_W / img.width, MAX_H / img.height);
        img.resize(Math.round(img.width * ratio), Math.round(img.height * ratio));
      }

      // Re-encode as PNG (strips all EXIF metadata by re-encoding)
      processedBuffer = await img.encode();
      contentType = 'image/png';
    } catch {
      // If imagescript can't decode (e.g. animated GIF), fall back to original
      processedBuffer = buffer;
    }
  }

  // ── 9. Upload to Supabase Storage ─────────────────────────────────────────
  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { error: uploadError } = await adminClient.storage
    .from(BUCKET)
    .upload(path, processedBuffer, { upsert: true, contentType });

  if (uploadError) {
    console.error('[secure-upload] storage error:', uploadError.message);
    return json({ error: 'Upload failed. Please try again.' }, 500);
  }

  const { data: { publicUrl } } = adminClient.storage.from(BUCKET).getPublicUrl(path);

  return json({ url: `${publicUrl}?v=${Date.now()}` }, 200);
});
