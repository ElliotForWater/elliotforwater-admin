import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { sanitizeLabel, validateURL, categorizeLink, LABEL_MAX_LENGTH } from '@/utils/shared';
import { createRateLimiter, json, authenticateRequest, CORS_HEADERS } from './shared';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_LINKS = 50;
const isRateLimited = createRateLimiter(10, 60_000); // 10 requests per minute

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  // ── 1. Authentication ──────────────────────────────────────────────────────
  const { error: authError, user } = await authenticateRequest(req);
  if (authError || !user) return json({ error: authError || 'Unauthorized' }, 401);

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

