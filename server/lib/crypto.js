const crypto = require("crypto");

// Reversible encryption for secrets BuildVolt has to store *and later use
// again* (an OSPOS database password, so scheduled auto-sync can reconnect
// without asking the store owner to retype it every time) — this is
// deliberately different from bcrypt, which is one-way and used everywhere
// else in this codebase for things BuildVolt only ever needs to verify
// (account passwords, OTPs), never read back.
//
// Key: derived from ENCRYPTION_KEY if set, otherwise from JWT_SECRET (the
// same "reuse an existing required secret rather than add a new required
// env var" approach already used for plugin_secret's fallback elsewhere in
// this codebase). Setting a dedicated ENCRYPTION_KEY is stronger — anyone
// who later rotates JWT_SECRET (invalidating all sessions) would otherwise
// also silently break every stored OSPOS credential — but is optional so
// deployment doesn't gain a new hard requirement.
const SOURCE_SECRET =
  process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "buildbot-secret";
const KEY = crypto.createHash("sha256").update(SOURCE_SECRET).digest();
const ALGO = "aes-256-gcm";

function encrypt(plainText) {
  if (plainText === null || plainText === undefined || plainText === "") return "";
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // iv : authTag : ciphertext, each base64, colon-joined for easy storage
  // as a single TEXT column.
  return [iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":");
}

function decrypt(stored) {
  if (!stored) return "";
  const [ivB64, authTagB64, dataB64] = stored.split(":");
  if (!ivB64 || !authTagB64 || !dataB64) return "";
  const decipher = crypto.createDecipheriv(ALGO, KEY, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
