import { supabase } from '@/lib/supabase';
import { SESSION_ID } from '@/services/sessionAnalytics';

export const AUDIT_EVENTS = {
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  DATA_CREATED: 'DATA_CREATED',
  DATA_UPDATED: 'DATA_UPDATED',
  DATA_DELETED: 'DATA_DELETED',
  FILE_UPLOADED: 'FILE_UPLOADED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  SECURITY_ALERT: 'SECURITY_ALERT',
  ERROR: 'ERROR',
};

let _userId = null;
let _companyId = null;

export function setAuditContext(userId, companyId) {
  _userId = userId;
  _companyId = companyId;
}

export async function auditLog(eventType, actionData = {}) {
  try {
    const entry = {
      event_type: eventType,
      user_id: _userId,
      company_id: _companyId,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      action_data: sanitizeData(actionData),
      session_id: SESSION_ID,
    };

    const { error } = await supabase.from('audit_logs').insert(entry);
    if (error) console.warn('[audit] insert failed:', error.code);
  } catch (e) {
    console.warn('[audit] logging failed silently');
  }
}

function sanitizeData(data) {
  const sanitized = { ...data };
  const SENSITIVE = ['password', 'token', 'api_key', 'secret', 'access_token', 'refresh_token'];
  for (const key of SENSITIVE) delete sanitized[key];
  return sanitized;
}
