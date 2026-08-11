// Quick client-side pre-check for Pakistani mobile numbers, mirroring the
// server's libphonenumber-js validation (server/routes/auth.js) closely
// enough to catch obvious typos before a round-trip — the server remains
// the authoritative check. Accepts local (03XXXXXXXXX, 11 digits) or
// international (+923XXXXXXXXX / 923XXXXXXXXX) formats.
const PK_MOBILE_RE = /^(\+92|92|0)3\d{9}$/;

export function isLikelyValidPakistaniMobile(raw: string): boolean {
  const digits = raw.trim().replace(/[\s()-]/g, "");
  return PK_MOBILE_RE.test(digits);
}
