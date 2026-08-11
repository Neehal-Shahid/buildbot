const admin = require("firebase-admin");

// Used only to verify Firebase phone-auth ID tokens server-side (store-owner
// WhatsApp/phone number verification) — never to sign in or manage users.
// Credentials come from a downloaded service-account JSON, but are read
// from env vars here (never committed to the repo). FIREBASE_PRIVATE_KEY is
// stored with literal \n escapes (how Railway/most hosts require multi-line
// env vars), so it's unescaped back into real newlines before use.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}

module.exports = admin;
