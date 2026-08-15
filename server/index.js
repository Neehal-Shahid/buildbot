const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { initDB } = require("./database");
const uploadRoute = require("./routes/upload");
const recommendRoute = require("./routes/recommend");
const { router: authRoute } = require("./routes/auth");
const analyticsRoute = require("./routes/analytics");
const adminRoute = require("./routes/admin");
const pluginRoute = require("./routes/plugin");
const osposRoute = require("./routes/ospos");

const app = express();
const PORT = process.env.PORT || 3001;

// Railway sits directly in front of this app as a single reverse-proxy
// hop, so Express needs to know that to compute req.ip/req.ips correctly
// from X-Forwarded-For — without this, any per-IP rate limiter (here and
// in routes/recommend.js) either sees Railway's own IP for every request
// (useless limiting) or, if a route reads the header directly instead,
// trusts whatever IP a client claims in that header verbatim, letting a
// single caller reset their own limit by sending a different value on
// every request.
app.set("trust proxy", 1);

app.use(cors({ origin: "*" }));
// Limit JSON body to 1MB to prevent payload-based DoS attacks
app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/api", authRoute);
app.use("/api", uploadRoute);
app.use("/api", recommendRoute);
app.use("/api", analyticsRoute);
app.use("/api", adminRoute);
app.use("/api", pluginRoute);
app.use("/api", osposRoute);

// Serve widget script
// Without an explicit charset, browsers can fall back to Latin-1 when
// parsing the script, corrupting every non-ASCII character embedded in
// its string literals (arrows, emoji, curly quotes) into mojibake —
// most visible in generated PDFs, since html2canvas renders exactly what
// the page actually parsed, not what the source file's bytes intended.
app.get("/widget.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.sendFile(path.join(__dirname, "widget.js"));
});

// Serve widget styles
app.get("/widget.css", (req, res) => {
  res.setHeader("Content-Type", "text/css; charset=utf-8");
  res.sendFile(path.join(__dirname, "widget.css"));
});

function getPluginManifest(req) {
  const jsonPath = path.join(__dirname, "plugin-update.json");
  if (!fs.existsSync(jsonPath)) return null;

  const manifest = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  const host = req.get("x-forwarded-host") || req.get("host");
  if (host) {
    manifest.download_url = `${proto}://${host}/buildvolt-woocommerce.zip`;
  }
  return manifest;
}

// Serve WooCommerce plugin zip (WordPress updater downloads this)
app.get("/buildvolt-woocommerce.zip", (req, res) => {
  const zipPath = path.join(__dirname, "buildvolt-woocommerce.zip");
  if (!fs.existsSync(zipPath)) {
    return res.status(404).json({ error: "Plugin file not found" });
  }
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.download(zipPath, "buildvolt-woocommerce.zip");
});

// Plugin update manifest (WordPress checks this for new versions)
app.get("/plugin-update.json", (req, res) => {
  const manifest = getPluginManifest(req);
  if (!manifest) {
    return res.status(404).json({ error: "Update file not found" });
  }
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.json(manifest);
});

// Health check. Includes Railway's auto-injected git commit SHA (present
// on Railway deploys, undefined locally) so it's possible to confirm
// exactly which commit is actually live with a single unauthenticated
// curl, instead of guessing from which routes 404 — the previous method
// used to debug several "my change isn't live yet" reports this session.
app.get("/", (req, res) => {
  res.json({
    status: "BuildVolt server is running!",
    version: "2.0",
    commit: process.env.RAILWAY_GIT_COMMIT_SHA || null,
  });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────
// Catches any unhandled async errors thrown from route handlers
// Prevents the server from hanging or returning HTML error pages
app.use((err, req, res, next) => {
  console.error("Unhandled route error:", err.message || err);
  if (!res.headersSent) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PROCESS-LEVEL CRASH GUARDS ───────────────────────────
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception — server will keep running:", err.message);
});
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

// Start server only after DB is ready
initDB().then(async () => {
  // Clean up stale unverified accounts and expired pending signups
  try {
    const { storeDB, pendingSignupDB } = require("./database");
    const removed = await storeDB.deleteUnverifiedOlderThan(7);
    if (removed > 0)
      console.log(
        `Cleaned up ${removed} legacy unverified account(s) older than 7 days`,
      );
    const removedPending = await pendingSignupDB.deleteOlderThan(7);
    if (removedPending > 0)
      console.log(`Cleaned up ${removedPending} expired pending signup(s)`);
  } catch (e) {
    console.error("Unverified account cleanup failed:", e.message);
  }

  app.listen(PORT, () => {
    console.log(`BuildVolt server running on http://localhost:${PORT}`);
  });

  // ─── SCHEDULED EMAIL JOB ────────────────────────────────────
  // Set CRON_ENABLED=false on secondary Railway instances to avoid duplicate cron runs
  const cronEnabled = process.env.CRON_ENABLED !== "false";

  if (cronEnabled) {
    const { runScheduledEmails } = require("./routes/admin");

    setTimeout(async () => {
      try {
        await runScheduledEmails();
      } catch (e) {
        console.error("Startup email job error:", e.message);
      }
    }, 30 * 1000);

    setInterval(
      async () => {
        try {
          await runScheduledEmails();
        } catch (e) {
          console.error("Hourly email job error:", e.message);
        }
      },
      60 * 60 * 1000,
    );

    // ─── SCHEDULED OSPOS AUTO-SYNC JOB ─────────────────────────
    // Keeps every store that has completed at least one manual OSPOS
    // import (Products tab) current automatically from then on — see
    // server/routes/ospos.js. OSPOS has no webhook/API to push changes to
    // BuildVolt (unlike the WooCommerce plugin, which syncs instantly on
    // every product save — see server/routes/plugin.js), so polling on an
    // interval is the only option; three hours balances freshness against
    // the load repeated connections put on the store's own (often
    // shared-hosting) database.
    const { pullAllAutoSyncStores } = require("./routes/ospos");

    setTimeout(async () => {
      try {
        const results = await pullAllAutoSyncStores();
        if (results.length > 0) console.log("OSPOS auto-sync (startup):", results);
      } catch (e) {
        console.error("Startup OSPOS auto-sync error:", e.message);
      }
    }, 45 * 1000);

    setInterval(
      async () => {
        try {
          const results = await pullAllAutoSyncStores();
          if (results.length > 0) console.log("OSPOS auto-sync (scheduled):", results);
        } catch (e) {
          console.error("Scheduled OSPOS auto-sync error:", e.message);
        }
      },
      3 * 60 * 60 * 1000,
    );
  } else {
    console.log("Email + OSPOS auto-sync cron disabled (CRON_ENABLED=false)");
  }
});
