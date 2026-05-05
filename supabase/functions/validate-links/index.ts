import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ───────────────────────────────────────────────────────────────────

const LABEL_MAX_LENGTH = 100;
const URL_MAX_LENGTH = 2048;
const MAX_LINKS = 50;

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

const MALICIOUS_PATTERNS = [
  /javascript\s*:/i,
  /data\s*:/i,
  /vbscript\s*:/i,
  /<script/i,
  /on\w+\s*=/i,
  /%6A%61%76%61%73%63%72%69%70%74/i, // URL-encoded "javascript"
  /%64%61%74%61/i,                    // URL-encoded "data"
];

// ─── Rate limiting ────────────────────────────────────────────────────────────

const saveAttempts = new Map<string, number[]>();
const RATE_LIMIT = 10;         // max saves
const RATE_WINDOW_MS = 60_000; // per minute

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const attempts = (saveAttempts.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (attempts.length >= RATE_LIMIT) return true;
  attempts.push(now);
  saveAttempts.set(userId, attempts);
  return false;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function sanitizeLabel(text: string): string {
  // Strip all HTML tags and trim
  return text.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim();
}

function validateURL(raw: string): { valid: boolean; url?: string; error?: string } {
  const trimmed = raw.trim();

  if (!trimmed) return { valid: false, error: 'URL is required.' };
  if (trimmed.length > URL_MAX_LENGTH) return { valid: false, error: `URL must be under ${URL_MAX_LENGTH} characters.` };

  // Decode to catch encoding bypasses before pattern checks
  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  // Check malicious patterns on both raw and decoded URL
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(decoded)) {
      // Log suspicious attempt (don't expose detail to client)
      console.warn('[validate-links] suspicious URL rejected:', trimmed.slice(0, 100));
      return { valid: false, error: 'URL contains unsafe content.' };
    }
  }

  // Auto-upgrade HTTP → HTTPS
  const normalized = trimmed.startsWith('http://') ? trimmed.replace('http://', 'https://') : trimmed;
  const withProtocol = normalized.startsWith('https://') ? normalized : `https://${normalized}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: `"${trimmed}" is not a valid URL.` };
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { valid: false, error: `URL must use http or https.` };
  }

  // Must have a real hostname (not just localhost or IP for production links)
  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return { valid: false, error: `URL must have a valid domain.` };
  }

  return { valid: true, url: withProtocol };
}

function categorizeLink(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (/docs?\.|wiki\.|confluence/i.test(hostname)) return 'docs';
    if (/slack|teams|discord|meet\.|zoom/i.test(hostname)) return 'communication';
    if (/github|gitlab|bitbucket|jira|linear/i.test(hostname)) return 'dev';
    if (/drive\.google|sharepoint|notion|dropbox/i.test(hostname)) return 'files';
    if (/mail\.|outlook|gmail/i.test(hostname)) return 'email';
    return 'general';
  } catch {
    return 'general';
  }
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
    return json({ error: 'Too many requests. Please wait a minute and try again.' }, 429);
  }

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  let body: { links: Array<{ text: string; link: string }> };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { links } = body;

  if (!Array.isArray(links)) return json({ error: 'links must be an array' }, 400);
  if (links.length > MAX_LINKS) return json({ error: `Maximum ${MAX_LINKS} links allowed.` }, 400);

  // ── 4. Validate and sanitize each link ────────────────────────────────────
  const validated: Array<{ text: string; link: string; category: string }> = [];

  for (let i = 0; i < links.length; i++) {
    const { text, link } = links[i];

    // Label validation
    const label = sanitizeLabel(text ?? '');
    if (!label) return json({ error: `Link #${i + 1}: label is required.` }, 400);
    if (label.length > LABEL_MAX_LENGTH) {
      return json({ error: `Link #${i + 1}: label must be under ${LABEL_MAX_LENGTH} characters.` }, 400);
    }

    // URL validation
    const result = validateURL(link ?? '');
    if (!result.valid) return json({ error: `Link #${i + 1}: ${result.error}` }, 400);

    validated.push({
      text: label,
      link: result.url!,
      category: categorizeLink(result.url!),
    });
  }

  return json({ links: validated }, 200);
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
