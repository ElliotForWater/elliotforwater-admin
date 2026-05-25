import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── CORS headers ─────────────────────────────────────────────────────────────
// CRITICAL: To be changed with https://admin.elliotforwater.com
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

// ─── Rate limiting ────────────────────────────────────────────────────────────

export function createRateLimiter(maxAttempts: number, windowMs: number) {
  const attempts = new Map<string, number[]>();

  return function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const userAttempts = (attempts.get(userId) ?? []).filter(
      (t) => now - t < windowMs,
    );
    if (userAttempts.length >= maxAttempts) return true;
    userAttempts.push(now);
    attempts.set(userId, userAttempts);
    return false;
  };
}

// ─── Response helpers ─────────────────────────────────────────────────────────

export function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

// ─── Authentication helpers ───────────────────────────────────────────────────

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return { error: 'Missing authorization header', user: null, client: null };
  }

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError || !user) {
    return { error: 'Unauthorized', user: null, client };
  }

  return { error: null, user, client };
}

export function createAdminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}
