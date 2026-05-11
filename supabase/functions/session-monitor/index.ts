import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Anomaly thresholds ───────────────────────────────────────────────────────

const MAX_SESSIONS_PER_HOUR = 10;
const MAX_CONCURRENT_SESSIONS = 3;

// ─── Rate limiting ────────────────────────────────────────────────────────────

const eventAttempts = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const attempts = (eventAttempts.get(userId) ?? []).filter((t) => now - t < 60_000);
  if (attempts.length >= 30) return true;
  attempts.push(now);
  eventAttempts.set(userId, attempts);
  return false;
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

async function detectAnomalies(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  event: string,
  fingerprint: string | null,
): Promise<string[]> {
  const alerts: string[] = [];
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // 1. Too many sessions in one hour
  const { count: recentCount } = await supabase
    .from('session_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('started_at', hourAgo);

  if ((recentCount ?? 0) > MAX_SESSIONS_PER_HOUR) {
    alerts.push(`High session frequency: ${recentCount} sessions in the last hour.`);
  }

  // 2. Too many concurrent active sessions
  const { count: activeCount } = await supabase
    .from('session_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true);

  if ((activeCount ?? 0) > MAX_CONCURRENT_SESSIONS) {
    alerts.push(`${activeCount} concurrent active sessions detected.`);
  }

  // 3. Fingerprint mismatch events
  if (event === 'FINGERPRINT_MISMATCH') {
    alerts.push('Session fingerprint mismatch — possible session hijacking attempt.');
  }

  return alerts;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return json(null, 204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
    });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Auth
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  if (isRateLimited(user.id)) return json({ error: 'Too many requests' }, 429);

  // Parse body
  let body: { event: string; fingerprint?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { event, fingerprint = null } = body;
  if (!event) return json({ error: 'event is required' }, 400);

  // Log event
  console.info(`[session-monitor] ${event} — user: ${user.id}`);

  // Detect anomalies
  const alerts = await detectAnomalies(supabase, user.id, event, fingerprint);

  if (alerts.length > 0) {
    console.warn(`[session-monitor] ANOMALY for user ${user.id}:`, alerts);
    // Future: send email via Resend or similar notification service
  }

  return json({ ok: true, alerts });
});

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders,
    },
  });
}
