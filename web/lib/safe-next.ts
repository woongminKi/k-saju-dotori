/**
 * Redirect-path validator that only allows internal absolute paths.
 * Blocks open redirects (protocol-relative URLs, external URLs, backslash/control-char tricks).
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return '/';
  // Control chars (tab/newline etc.), DEL and backslash are stripped/normalized by the URL parser
  // and can create bypasses, so block them outright.
  // e.g. "/\t/evil.com" -> URL strips the tab -> parsed as "//evil.com" (external).
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f\\]/.test(next)) return '/';
  if (!next.startsWith('/')) return '/';
  if (next.startsWith('//')) return '/';
  return next;
}
