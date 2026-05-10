# BuildBot — Project Structure & File Reference

## What Is BuildBot?
B2B SaaS product. Store owners (PC parts shops in Pakistan) sign up, upload their product catalog, and embed a floating AI chat widget on their website. Shoppers enter budget + purpose → Claude AI recommends 3 PC builds using only that store's products.

---

## Live URLs
- **Dashboard (Frontend):** https://buildbot-nine.vercel.app — hosted on Vercel
- **Admin Panel:** https://buildbot-nine.vercel.app/admin.html
- **API + Widget:** https://buildbot-production.up.railway.app — hosted on Railway
- **Widget JS:** https://buildbot-production.up.railway.app/widget.js
- **Plugin ZIP:** https://buildbot-production.up.railway.app/buildbot-woocommerce.zip

---

## Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js |
| Database | Turso (cloud SQLite via @libsql/client) |
| Frontend | Vanilla HTML + CSS + JS (no framework) |
| Widget | Vanilla JS IIFE |
| AI | Anthropic Claude (claude-3-5-haiku-20241022) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Google Login | google-auth-library |
| Email | Resend API (HTTP, not SMTP) |
| File Upload | Multer (memory storage) |
| Frontend Host | Vercel (free tier, static files) |
| Backend Host | Railway (free tier, Node.js) |
| Database Host | Turso.tech (free tier) |
| Payments | JazzCash + EasyPaisa (manual, no gateway) |
| WP Plugin | PHP 7.4+, WooCommerce 5.0+ |

---

## Full Folder & File Tree

```
buildbot/                              ← Root folder (on Desktop)
│
├── PROGRESS.md                        ← Master project brain / AI handoff doc
├── PROJECT_STRUCTURE.md               ← This file
├── .gitignore                         ← Ignores node_modules, .env, *.db files
├── buildbot-template.csv              ← Sample CSV template for store owners to fill
├── build_plugin.ps1                   ← PowerShell script to zip the plugin folder
├── Design.JPG                         ← UI design reference image
├── BuildBot_Dashboard_Design_Plan.md  ← Dashboard UI/UX redesign plan document
├── cursor_ia_restructure_prompt.md    ← Prompt used for IA restructuring session
│
├── widget/
│   └── index.html                     ← Local smoke-test page (loads widget.js from Railway)
│
├── dashboard/                         ← Deployed on Vercel (static files)
│   ├── index.html                     ← Landing page + Login + Signup (SPA)
│   ├── dashboard.html                 ← Logged-in store owner app (all tabs)
│   ├── admin.html                     ← Admin panel (Neehal only)
│   ├── verify.html                    ← Email verification landing page
│   ├── reset-password.html            ← Password reset page
│   ├── config.js                      ← Sets window.BB_API (local vs production)
│   ├── vercel.json                    ← Vercel routing rules for .html pages
│   └── package.json                   ← Only has "serve" devDependency for local dev
│
├── plugin/
│   └── buildbot-woocommerce/
│       └── buildbot-woocommerce.php   ← WordPress/WooCommerce plugin (full PHP file)
│
└── server/                            ← Deployed on Railway (Node.js)
    ├── index.js                       ← Express entry point + cron job
    ├── database.js                    ← All Turso DB functions (storeDB, productDB, etc.)
    ├── email.js                       ← Resend email templates + sendEmail()
    ├── widget.js                      ← The embeddable widget JS served at /widget.js
    ├── widget.css                     ← Widget CSS served at /widget.css
    ├── buildbot-woocommerce.zip       ← Plugin zip for download at /buildbot-woocommerce.zip
    ├── plugin-update.json             ← Plugin auto-update version feed
    ├── .env                           ← Secret keys (NOT on GitHub)
    ├── package.json                   ← NPM dependencies
    ├── dev.db                         ← Local SQLite fallback (not used in production)
    ├── data/
    │   ├── buildbot.db                ← Local DB files (not used in production)
    │   ├── default.csv                ← Default product catalog CSV
    │   └── test-store.csv             ← Test store CSV
    └── routes/
        ├── auth.js                    ← Signup, Login, Google Auth, Password Reset, Settings
        ├── upload.js                  ← CSV upload + Product CRUD (add/edit/delete/stock)
        ├── recommend.js               ← AI recommendation engine + limit enforcement
        ├── analytics.js               ← Store usage stats endpoint
        ├── payment.js                 ← Payment submit + history + plan prices
        ├── admin.js                   ← All admin-only routes
        └── plugin.js                  ← WooCommerce plugin API endpoints
```

---

## File Descriptions

### Root Files
| File | Purpose |
|---|---|
| `PROGRESS.md` | Master AI handoff doc. Contains full project context, schema, endpoints, roadmap. Paste this into any new AI chat to resume work. |
| `buildbot-template.csv` | CSV template given to store owners. Columns: name, category, price, description. |
| `build_plugin.ps1` | PowerShell script: zips `plugin/buildbot-woocommerce/` into `buildbot-woocommerce.zip` and copies it to `server/`. |

---

### dashboard/ (Frontend — Vercel)

| File | Purpose |
|---|---|
| `index.html` | Landing page + Login + Signup all in one HTML file. SPA: shows landing when logged out, redirects to dashboard.html when logged in. Calls `window.BB_API` from config.js. |
| `dashboard.html` | Main store owner app after login. Contains all sidebar tabs: Overview, Store & Sync, Products, Analytics, Install Widget, Widget Settings, Billing, Account, Help. ~190KB of inline HTML+CSS+JS. Calls all store owner API endpoints. |
| `admin.html` | Admin panel. Login with ADMIN_EMAIL + ADMIN_PASSWORD from Railway env vars. Shows all stores, pending payments, revenue, approve/reject buttons. Calls all /api/admin/* endpoints. |
| `verify.html` | Shown when user clicks email verification link. Reads `?token=` from URL, calls `GET /api/verify-email?token=`. |
| `reset-password.html` | Shown when user clicks password reset link. Reads `?token=` from URL, calls `POST /api/reset-password`. |
| `config.js` | Sets `window.BB_API`. On localhost with `?localApi=1`, points to `http://localhost:3001/api`. Otherwise uses production Railway URL. Also wraps `window.fetch` to show/hide a global loading spinner. |
| `vercel.json` | Routes `/admin` → `admin.html`, `/dashboard` → `dashboard.html`, catch-all `/$1`. Tells Vercel to serve static HTML. |

---

### server/ (Backend — Railway)

| File | Purpose |
|---|---|
| `index.js` | Express entry point. Mounts all route files under `/api`. Serves `widget.js`, `widget.css`, `buildbot-woocommerce.zip`, `plugin-update.json` as static files. Runs `initDB()` on startup. Contains cron job that runs every 24h to send trial-ending emails (3 days and 1 day before trial expires). |
| `database.js` | Single file for all Turso DB operations. Exports: `client` (raw Turso client), `initDB` (creates all tables + runs migrations), `storeDB`, `productDB`, `analyticsDB`, `paymentDB`, `tokenDB`, `verifyDB`, `widgetDB`, `adminDB`. All DB logic is here — routes just call these functions. |
| `email.js` | Resend email integration. Exports `sendEmail()` + template functions: `welcomeEmail`, `emailVerificationEmail`, `paymentApprovedEmail`, `paymentRejectedEmail`, `trialEndingEmail`, `passwordResetEmail`, `adminPasswordResetEmail`. If `RESEND_TEST_EMAIL` env var is set, ALL emails go to that address instead of the real recipient. |
| `widget.js` | The embeddable widget IIFE. Served publicly at `/widget.js`. Shoppers load this on the store's website. It: loads widget.css, fetches store config from `/api/store-config/:id`, shows the chat bubble, collects budget/purpose/extras, calls `POST /api/recommend`, displays 3 build cards with modal detail view and PDF download. |
| `widget.css` | Styles for the widget. Served at `/widget.css`. Loaded dynamically by widget.js. Uses CSS variables (`--bb-bg`, `--bb-brand`, etc.). Light minimal theme with Inter font. |
| `buildbot-woocommerce.zip` | The plugin zip file. Built from `plugin/buildbot-woocommerce/` using `build_plugin.ps1`. Served for download at `/buildbot-woocommerce.zip`. |
| `plugin-update.json` | JSON file WordPress plugin reads to check for auto-updates. Contains version number and download URL. |
| `.env` | Secret environment variables. NOT on GitHub. Must be added manually in Railway dashboard. |

---

### server/routes/

| File | Endpoints It Handles | Purpose |
|---|---|---|
| `auth.js` | POST /signup, POST /login, POST /google-auth, GET /verify-email, POST /forgot-password, POST /reset-password, PUT /change-password, GET /me, PUT /settings, PUT /widget-settings, GET /store-config/:id, DELETE /account | All authentication, store profile, and settings logic. Exports `authMiddleware` used by all protected routes. |
| `upload.js` | POST /upload, GET /products/:storeId, GET /products/manage/:id, POST /product, PUT /product/:id, PUT /product/:id/stock, DELETE /product/:id | CSV bulk upload (Multer memory storage) and full product CRUD. Every write calls `storeDB.touchCatalog()` to invalidate recommendation cache. |
| `recommend.js` | POST /recommend | The AI engine. Checks store is active, checks plan limits, fetches products, checks cache, calls Claude API with product list + user inputs, returns 3 tiered builds. If `TEST_MODE=true` env var, returns fake builds (0 API cost). IP rate limiting: 15 req/hr per IP. |
| `analytics.js` | GET /analytics | Returns recommendation stats for the store: total, by purpose, avg budget, recent 10, daily last 7 days, product count. |
| `payment.js` | POST /payment/submit, GET /payment/history, GET /plans | Store owner submits JazzCash/EasyPaisa transaction ID. Admin approves manually. Hardcoded plan prices: Starter 2999, Growth 6999, Pro 14999 PKR. |
| `admin.js` | POST /admin/login, GET /admin/overview, GET /admin/stores, GET /admin/payments, POST /admin/approve-payment, POST /admin/reject-payment, POST /admin/disable-store, POST /admin/activate-store, POST /admin/delete-store, PUT /admin/profile, PUT /admin/password, GET /admin/me, GET /admin/db-audit | Full admin control. Uses separate JWT with `isAdmin: true` flag. approve-payment triggers email to store owner. delete-store cascades all related data. |
| `plugin.js` | POST /plugin/ping, POST /plugin/sync, POST /plugin/product/update, POST /plugin/product/delete, POST /plugin/widget-toggle, GET /plugin/widget-config/:id, POST /plugin/generate-key, GET /plugin/status, POST /plugin/disconnect | WooCommerce plugin API. Uses custom headers (X-BuildBot-Store-ID + X-BuildBot-Secret) instead of JWT. sync replaces all products. update/delete handles real-time WooCommerce hooks. Category auto-mapped from WooCommerce category name or product name keywords. |

---

### plugin/

| File | Purpose |
|---|---|
| `buildbot-woocommerce.php` | Full WordPress plugin. Store owner installs this on their WooCommerce site. They enter Store ID + Secret Key in WordPress admin. Plugin: tests connection via /api/plugin/ping, syncs all products via /api/plugin/sync, injects widget.js script on frontend, hooks into WooCommerce product save/delete events to call /api/plugin/product/update and /api/plugin/product/delete in real-time, auto-syncs every 6 hours via WP Cron, checks /plugin-update.json for auto-updates. |

---

## How Files Are Related

```
dashboard/config.js
  └── sets window.BB_API (used by ALL fetch() calls in index.html, dashboard.html, admin.html)

dashboard/index.html
  ├── reads window.BB_API from config.js
  ├── calls server/routes/auth.js  (signup, login, google-auth)
  └── on login → redirects to dashboard.html

dashboard/dashboard.html
  ├── reads window.BB_API from config.js
  ├── calls server/routes/auth.js  (me, settings, widget-settings, change-password)
  ├── calls server/routes/upload.js  (upload CSV, product CRUD)
  ├── calls server/routes/analytics.js  (stats)
  ├── calls server/routes/payment.js  (submit payment, history)
  ├── calls server/routes/plugin.js  (generate-key, status, disconnect)
  └── reads localStorage: bb_token (JWT), bb_store_mode (custom vs woo)

dashboard/admin.html
  ├── reads window.BB_API from config.js
  └── calls server/routes/admin.js  (all admin endpoints)

dashboard/verify.html
  └── calls GET /api/verify-email?token= (auth.js)

dashboard/reset-password.html
  └── calls POST /api/reset-password (auth.js)

server/index.js
  ├── imports database.js → calls initDB() on startup
  ├── imports and mounts all routes/ files
  ├── serves widget.js, widget.css, buildbot-woocommerce.zip, plugin-update.json
  └── runs cron job using email.js + database.js (trial ending emails)

server/database.js
  ├── connects to Turso using TURSO_URL + TURSO_TOKEN from .env
  └── imported by: index.js, auth.js, upload.js, recommend.js, analytics.js,
                   payment.js, admin.js, plugin.js

server/email.js
  ├── uses RESEND_API_KEY from .env
  ├── uses RESEND_TEST_EMAIL from .env (redirects all emails if set)
  └── imported by: index.js (cron), auth.js (signup/reset), admin.js (approve/reject)

server/widget.js
  ├── fetches GET /api/store-config/:id → auth.js
  ├── fetches POST /api/recommend → recommend.js
  └── served at /widget.js by index.js

server/routes/recommend.js
  ├── imports database.js (productDB, storeDB, analyticsDB)
  └── calls Anthropic API using ANTHROPIC_API_KEY from .env

plugin/buildbot-woocommerce.php
  ├── calls POST /api/plugin/ping
  ├── calls POST /api/plugin/sync
  ├── calls POST /api/plugin/product/update
  ├── calls POST /api/plugin/product/delete
  ├── calls POST /api/plugin/widget-toggle
  └── calls GET /api/plugin/widget-config/:id
```

---

## Database Tables (Turso Cloud SQLite)

| Table | What It Stores |
|---|---|
| `stores` | Every store owner account. Includes plan, trial_ends, brand_color, widget settings, woo_connected, plugin_secret, email_verified. |
| `admins` | Admin accounts (just Neehal). Seeded from ADMIN_EMAIL + ADMIN_PASSWORD env vars on first run. |
| `products` | Products for each store. Linked to stores via store_id FK. Has woo_id for WooCommerce sync matching. |
| `recommendations` | Every AI build generated. Stores budget, purpose, extras, result JSON. Used for analytics + caching. |
| `payments` | Payment submissions. Status: pending → approved/rejected by admin. |
| `tokens` | Email verification + password reset tokens. Has expiry + used flag. type = 'verify', 'reset', or 'admin_reset'. |
| `trial_emails_sent` | Tracks which trial warning emails have been sent (prevents duplicates). PK = (store_id, days_left). |

---

## Environment Variables (Railway — NOT on GitHub)

| Variable | Value / Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key for AI recommendations |
| `JWT_SECRET` | Secret for signing JWTs (store owner tokens) |
| `PORT` | 3001 |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID for Google Sign-In |
| `TURSO_URL` | `libsql://buildbot-neehal-shahid.aws-ap-south-1.turso.io` |
| `TURSO_TOKEN` | Turso auth token |
| `RESEND_API_KEY` | Resend email API key |
| `RESEND_TEST_EMAIL` | **⚠️ TESTING ONLY** — All emails go here instead of real recipient. Remove when going live. |
| `APP_URL` | `https://buildbot-nine.vercel.app` — used in email links |
| `TEST_MODE` | **⚠️ TESTING ONLY** — `true` makes recommend.js return fake AI builds (saves API credits). Remove when going live. |

---

## TEST_MODE & RESEND_TEST_EMAIL — How & When to Remove

### TEST_MODE=true (in Railway)
- **What it does:** `recommend.js` skips calling Claude API entirely. Returns 3 hardcoded fake builds with dummy parts and prices.
- **Why it exists:** To test the full widget UI + analytics without spending Anthropic API credits.
- **Side effect:** Store owners see fake data like "Test CPU Budget", "Test RAM 8GB".
- **How to remove:** Go to Railway dashboard → your project → Variables → delete `TEST_MODE`. Push any commit to redeploy. Now real Claude AI responses will be used.

### RESEND_TEST_EMAIL=muhammadneehal1805@gmail.com (in Railway)
- **What it does:** In `email.js`, every single email (welcome, verify, reset, payment approved, etc.) is sent to this Gmail address instead of the actual recipient.
- **Why it exists:** Resend free plan only allows sending from `onboarding@resend.dev` which works only to verified addresses during testing.
- **How to remove (go live with real emails):**
  1. Go to resend.com/domains
  2. Add your domain (e.g. workwithneehal.com)
  3. Add the DNS records it shows in Hostinger DNS panel
  4. Wait for verification (can take a few minutes)
  5. Update `FROM` in `email.js` from `onboarding@resend.dev` to `noreply@workwithneehal.com`
  6. Delete `RESEND_TEST_EMAIL` from Railway Variables
  7. Push to GitHub → redeploy

---

## Authentication Flow

```
Store Owner:
  1. Signup → POST /api/signup → stores JWT in localStorage as bb_token
  2. Email verify link → GET /api/verify-email?token= → sets email_verified=1
  3. Login → POST /api/login → checks email_verified, returns JWT
  4. All protected routes → Authorization: Bearer <JWT> header
  5. JWT payload: { storeId, email, name }

Admin:
  1. POST /api/admin/login → returns JWT with { isAdmin: true }
  2. All admin routes check for isAdmin flag in JWT

Plugin (WooCommerce):
  Uses custom headers instead of JWT:
  X-BuildBot-Store-ID: <store_id>
  X-BuildBot-Secret: bb_live_<random>
  Secret generated in dashboard → Store & Sync tab
```

---

## Widget Recommendation Flow

```
1. Store embeds: <script src="https://buildbot-production.up.railway.app/widget.js"
                         data-store="their-store-id"></script>
2. widget.js loads → fetches GET /api/store-config/:id (brand color, widget settings)
3. Floating ⚡ bubble appears on store website
4. Shopper clicks bubble → enters budget, purpose, extras (4 screens)
5. widget.js → POST /api/recommend { budget, purpose, extras, storeId }
6. recommend.js:
   a. Checks store is active (trial not expired / plan active)
   b. Checks plan limit (trial: 3/day, starter: 500/mo, growth: 2000/mo, pro: unlimited)
   c. Checks recommendation cache (same budget+purpose+extras = return saved result, 0 API cost)
   d. If TEST_MODE=true → return fake builds
   e. Else → calls Claude API with store's product list + user inputs
   f. Returns 3 builds: Budget, Balanced, Max
7. Widget shows 3 build cards
8. Shopper clicks build → modal with full parts list + prices
9. Optional: Download as PDF (client-side html2pdf)
```

---

## WooCommerce vs Manual Mode

`localStorage` key `bb_store_mode` in the dashboard:
- `custom` = Manual/CSV mode → owner manages products in BuildBot, "Install Widget" tab is visible, embed `<script>` tag shown
- `woo` = WooCommerce mode → plugin handles products + widget injection, "Install Widget" tab is hidden, CTAs redirect to "Store & Sync" tab

---

## Recommendation Limits (by Plan)

| Plan | Limit | Period | Price |
|---|---|---|---|
| Trial | 3 | Per day | Free (14 days) |
| Starter | 500 | Per month | Rs 2,999 |
| Growth | 2,000 | Per month | Rs 6,999 |
| Pro | Unlimited | — | Rs 14,999 |

---

## Recommendation Caching

- Every recommendation is stored in the `recommendations` table.
- On each new request, `analyticsDB.getCachedRecommendation()` checks if the exact same `(storeId, budget, purpose, extras)` was previously generated AFTER the store's last catalog update.
- If cache hit → return stored result (0 Anthropic API cost).
- Cache is invalidated automatically when: CSV uploaded, product added/edited/deleted/stock toggled, WooCommerce sync happens. All these call `storeDB.touchCatalog()` which updates `catalog_last_updated` timestamp.

---

## How to Run Locally

```bash
# Terminal 1 — Backend
cd Desktop/buildbot/server
npm install
node index.js
# → "Turso database connected and tables ready!"
# → http://localhost:3001

# Terminal 2 — Frontend
cd Desktop/buildbot/dashboard
npx serve .
# → http://localhost:3000

# Use ?localApi=1 in URL to hit local backend:
# http://localhost:3000/index.html?localApi=1
```

---

## Deployment

- **Backend (Railway):** Push to GitHub → Railway auto-deploys in ~2 min from `server/` folder
- **Frontend (Vercel):** Push to GitHub → Vercel auto-deploys in ~1 min from `dashboard/` folder
- **Plugin update:** Edit PHP → bump version → zip → copy to `server/` → update plugin-update.json → push

---

## What Is Complete ✅

- Store owner signup/login with JWT + email verification
- Google Sign-In (auto-verifies email)
- Forgot password + reset flow
- CSV bulk upload (memory storage, Railway-compatible)
- Full product CRUD (add/edit/delete/stock toggle)
- AI recommendations (3 builds — Budget/Balanced/Max)
- Plan limit enforcement
- TEST_MODE for free testing
- Widget customization (color, title, message, button text, bg color)
- Glassmorphism widget with auto-contrast text
- WooCommerce plugin (sync, real-time hooks, auto-update)
- JazzCash/EasyPaisa payment submission
- Admin panel (approve/reject payments, manage stores)
- Trial ending emails (auto, deduplicated)
- Event-based recommendation cache (invalidates on catalog change)
- IP-based rate limiting on widget

## What Needs to Be Done Before Real Launch 🔧

1. Remove `TEST_MODE` from Railway → real AI builds
2. Remove `RESEND_TEST_EMAIL` from Railway → real emails to customers
3. Verify domain at resend.com/domains + update `FROM` in email.js
4. Upgrade Railway to $5/mo hobby plan (prevents cold-start 10-15s delay)
5. Fix widget_bg not applying in widget.js (stored in DB but hardcoded in widget.js)
