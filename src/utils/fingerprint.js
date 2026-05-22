export function generateFingerprint() {
  try {
    return btoa([
      navigator.userAgent,
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
    ].join('|'));
  } catch {
    return 'unknown';
  }
}
