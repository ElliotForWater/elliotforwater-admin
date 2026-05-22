import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sanitizeLabel, validateURL, categorizeLink, LABEL_MAX_LENGTH } from '@/utils/linkValidation';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_LINKS = 50;

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

// ─── Validation helpers (imported from shared utilities) ─────────────────────

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
