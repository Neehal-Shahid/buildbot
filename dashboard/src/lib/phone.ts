// Quick client-side pre-check for Pakistani mobile numbers, mirroring the
// server's libphonenumber-js validation (server/routes/auth.js) closely
// enough to catch obvious typos before a round-trip — the server remains
// the authoritative check.
//
// Deliberately kept *no stricter* than the server: a number this accepts
// may still be rejected server-side (libphonenumber knows the real PK
// operator prefixes), but anything the server would accept must pass
// here, otherwise the UI blocks a number that is actually valid. That is
// why "0092…" is allowed — 00 is Pakistan's international dialling
// prefix, so parsePhoneNumberFromString(raw, "PK") parses it fine.
//
// Accepted: 03XXXXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX, 00923XXXXXXXXX.
const PK_MOBILE_RE = /^(\+92|0092|92|0)3\d{9}$/;

export function isLikelyValidPakistaniMobile(raw: string): boolean {
  // Strip the separators people actually type: spaces, dashes, dots,
  // brackets and non-breaking spaces.
  const digits = raw.trim().replace(/[\s ()\-.]/g, "");
  return PK_MOBILE_RE.test(digits);
}
