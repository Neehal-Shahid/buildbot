const crypto = require("crypto");

// Every route file used to do `process.env.JWT_SECRET || "buildbot-secret"`
// independently — meaning if the env var was ever unset (a fresh local
// checkout, a misconfigured deploy), the server would silently sign and
// verify every store-owner and admin session with a secret that's sitting
// in plain text in this repo's git history, letting anyone who has ever
// read this source code forge a valid token for any store or the admin
// panel. Centralized here so there's exactly one place this can go wrong,
// and the fallback is a secret generated fresh for this process (not a
// fixed, publicly-known string) — a missing env var now means "every
// session gets invalidated the next time the server restarts", which is
// loud and immediately obvious, instead of a silent, permanent hole.
let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(48).toString("hex");
  console.error(
    "WARNING: JWT_SECRET environment variable is not set. Using a random secret generated for this process only " +
      "— every session (store owner and admin) will be invalidated the next time the server restarts. " +
      "Set JWT_SECRET in your environment to fix this.",
  );
}

module.exports = { JWT_SECRET };
