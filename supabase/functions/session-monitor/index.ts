import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { subHours } from 'https://esm.sh/date-fns@2';
import { createRateLimiter, json, authenticateRequest, CORS_HEADERS } from './shared';

// ─── Anomaly thresholds ───────────────────────────────────────────────────────

const MAX_SESSIONS_PER_HOUR = 10;
const MAX_CONCURRENT_SESSIONS = 3;

// ─── Rate limiting ────────────────────────────────────────────────────────────

const isRateLimited = createRateLimiter(30, 60_000); // 30 events per minute

// ─── Anomaly detection ────────────────────────────────────────────────────────

async function detectAnomalies(
  supabase: any,
  userId: string,
  event: string,
  fingerprint: string | null,
): Promise<string[]> {
  const alerts: string[] = [];
  const hourAgo = subHours(new Date(), 1).toISOString();

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
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Auth
  const { error: authError, user, client: supabase } = await authenticateRequest(req);
  if (authError || !user) return json({ error: authError || 'Unauthorized' }, 401);

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

