// ─── Constants ────────────────────────────────────────────────────────────────

export const URL_MAX_LENGTH = 2048;
export const LABEL_MAX_LENGTH = 100;

export const MALICIOUS_PATTERNS = [
  /javascript\s*:/i,
  /data\s*:/i,
  /vbscript\s*:/i,
  /<script/i,
  /on\w+\s*=/i,
  /%6A%61%76%61%73%63%72%69%70%74/i, // URL-encoded "javascript"
  /%64%61%74%61/i,                    // URL-encoded "data"
];

export const VALIDATOR_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_host: true,
  allow_underscores: false,
  allow_trailing_dot: false,
  allow_protocol_relative_urls: false,
};

// ─── File validation ───────────────────────────────────────────────────────────

export const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

export const FILE_LIMITS = {
  logo: 1 * 1024 * 1024,       // 1 MB
  background: 2 * 1024 * 1024, // 2 MB
};

// ─── Sanitization ─────────────────────────────────────────────────────────────

export function sanitizeLabel(text) {
  return text.replace(/<[^>]*>/g, '').replace(/[<>"'&]/g, '').trim();
}

// ─── URL validation ───────────────────────────────────────────────────────────

export function validateURL(raw) {
  const trimmed = raw.trim();

  if (!trimmed) return { valid: false, error: 'URL is required.' };
  if (trimmed.length > URL_MAX_LENGTH) return { valid: false, error: `URL must be under ${URL_MAX_LENGTH} characters.` };

  let decoded;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(decoded)) {
      return { valid: false, error: 'URL contains unsafe content.' };
    }
  }

  const upgraded = trimmed.startsWith('http://');
  const normalized = upgraded ? trimmed.replace('http://', 'https://') : trimmed;
  const withProtocol = normalized.startsWith('https://') ? normalized : `https://${normalized}`;

  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return { valid: false, error: `"${trimmed}" is not a valid URL.` };
  }

  const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return { valid: false, error: 'URL must use http or https.' };
  }

  if (!parsed.hostname || !parsed.hostname.includes('.')) {
    return { valid: false, error: 'URL must have a valid domain.' };
  }

  return { valid: true, url: withProtocol, upgraded };
}

// ─── Link categorization ──────────────────────────────────────────────────────

export function categorizeLink(url) {
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
