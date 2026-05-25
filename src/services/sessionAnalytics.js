import { supabase } from "@/lib/supabase";
import {
  subDays,
  differenceInMilliseconds,
  intervalToDuration,
} from "date-fns";

// Generates a unique ID for this browser session
export const SESSION_ID = crypto.randomUUID();

export async function recordSessionStart(userId, fingerprint) {
  if (!userId) return;

  // Close any stale active sessions before starting a new one
  await supabase
    .from("session_history")
    .update({
      is_active: false,
      ended_at: new Date().toISOString(),
      reason: "stale",
    })
    .eq("user_id", userId)
    .eq("is_active", true);

  const { error } = await supabase.from("session_history").insert({
    user_id: userId,
    session_id: SESSION_ID,
    started_at: new Date().toISOString(),
    fingerprint,
    is_active: true,
  });
  if (error && process.env.NODE_ENV !== "production")
    console.warn("[analytics] recordSessionStart:", error.message);
}

export async function recordSessionEnd(reason = "manual") {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("session_history")
    .select("started_at")
    .eq("session_id", SESSION_ID)
    .maybeSingle();

  const duration_ms = data?.started_at
    ? differenceInMilliseconds(new Date(), new Date(data.started_at))
    : null;

  const { error } = await supabase
    .from("session_history")
    .update({ ended_at: now, duration_ms, reason, is_active: false })
    .eq("session_id", SESSION_ID);

  if (error && process.env.NODE_ENV !== "production")
    console.warn("[analytics] recordSessionEnd:", error.message);
}

export async function getActiveSessions(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from("session_history")
    .select("session_id, started_at, fingerprint")
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) return [];
  return data || [];
}

export async function getAnalytics(userId) {
  if (!userId) return null;
  const weekAgo = subDays(new Date(), 7).toISOString();
  const { data, error } = await supabase
    .from("session_history")
    .select("started_at, ended_at, duration_ms, reason")
    .eq("user_id", userId)
    .not("ended_at", "is", null)
    .gte("started_at", weekAgo)
    .order("started_at", { ascending: false });

  if (error || !data?.length) return null;

  const avgDurationMs =
    data.reduce((sum, s) => sum + (s.duration_ms || 0), 0) / data.length;
  return {
    sessionsThisWeek: data.length,
    avgDurationMs,
    lastSession: data[0],
  };
}

export function formatDuration(ms) {
  if (!ms) return "—";
  const duration = intervalToDuration({
    start: new Date(Date.now() - ms),
    end: new Date(),
  });
  const parts = [];
  if (duration.hours) parts.push(`${duration.hours}h`);
  if (duration.minutes) parts.push(`${duration.minutes}m`);
  return parts.length > 0 ? parts.join(" ") : "0m";
}
