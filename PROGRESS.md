# BuildBot — Project Context & Progress

> **Purpose of this file:** Upload this to any AI assistant (Claude, ChatGPT, etc.) to give it full project context before asking questions or requesting changes. This is the single source of truth for the current state of the project.

---

## Product Overview

**BuildBot** is an AI-powered PC build recommender widget for PC parts retailers in Pakistan. Store owners embed a small JavaScript widget on their website. Customers click it, enter their budget and purpose, and receive three tailored PC build recommendations (Budget / Balanced / Max) drawn from the store's own product catalog.

---

## Business Model

- **Type:** B2B SaaS
- **Trial:** 14-day free trial (configurable from admin panel)
- **Payment:** Monthly subscription via JazzCash / EasyPaisa — manually approved by admin
- **Plans (configurable from admin panel, no redeploy needed):**
  - Starter — Rs 2,999/mo
  - Growth — Rs 4,999/mo
  - Pro — Rs 7,999/mo
- **Admin:** Neehal (workwithneehal@gmail.com)

---

## Live URLs

| Resource | URL |
|---|---|
| Store Dashboard | https://buildbot-nine.vercel.app/ |
| Admin Panel | https://buildbot-nine.vercel.app/admin.html |
| Server API | https://buildbot-production.up.railway.app/ |
| Widget JS | https://buildbot-production.up.railway.app/widget.js |
| Plugin ZIP | https://buildbot-production.up.railway.app/buildbot-woocommerce.zip |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express.js (hosted on Railway) |
| Database | Turso (cloud SQLite, accessed via libsql client) |
| Frontend | Vanilla HTML + CSS + JS (hosted on Vercel, no framework) |
| Widget | Vanilla JS IIFE, served by Railway |
| AI Engine | Anthropic Claude (`claude-3-5-haiku-20241022`) |
| Auth | JWT + bcryptjs + Google OAuth |
| Email | Resend API (HTTP — Railway blocks SMTP) |
| File Upload | Multer (memory storage — Railway has no persistent disk) |
| WordPress Plugin | PHP 7.4+, WooCommerce 5.0+ |

---

## Folder Structure

```
buildbot/
├── PROGRESS.md                    ← This file
├── PROJECT_STRUCTURE.md           ← File/code reference for AI
├── buildbot-template.csv          ← Sample CSV for store owners
├── build_plugin.ps1               ← PowerShell: zips plugin, copies to server/
├── Design.JPG                     ← UI design reference image
├── Admin_Prompt.md                ← Admin-specific AI instructions
├── New_features_admin.md          ← Recent admin feature specs (implemented)
├── widget/
│   └── index.html                 ← Local widget smoke-test page (not production)
├── dashboard/                     ← Vercel (static frontend)
│   ├── index.html                 ← Landing + Login + Signup
│   ├── dashboard.html             ← Logged-in store owner app
│   ├── admin.html                 ← Admin panel (Neehal only)
│   ├── verify.html                ← Email verification landing page
│   ├── reset-password.html        ← Password reset page
│   ├── config.js                  ← API URL switcher + global loading spinner
│   └── vercel.json                ← Vercel routing rules
├── plugin/
│   └── buildbot-woocommerce/
│       └── buildbot-woocommerce.php  ← WordPress plugin source
└── server/                        ← Railway (Node.js backend)
    ├── index.js                   ← Express entry point + cron job
    ├── database.js                ← All Turso DB functions + configDB helper
    ├── email.js                   ← Resend email templates
    ├── widget.js                  ← Widget IIFE bundle (served at /widget.js)
    ├── widget.css                 ← Widget styles (served at /widget.css)
    ├── buildbot-woocommerce.zip   ← Plugin zip served for download
    ├── package.json
    ├── .env                       ← NOT on GitHub — set manually on Railway
    └── routes/
        ├── auth.js                ← Signup / Login / OAuth / Reset / Settings
        ├── upload.js              ← CSV upload + product CRUD
        ├── recommend.js           ← AI recommendations + limits + caching
        ├── analytics.js           ← Store usage stats
        ├── payment.js             ← Payment submission + history
        ├── admin.js               ← Admin-only routes (config, cleanup, drip)
        └── plugin.js              ← WooCommerce plugin API
```

---

## Environment Variables (Railway)

```
ANTHROPIC_API_KEY        ← Claude AI API key
JWT_SECRET               ← Secret for signing store owner JWTs
PORT=3001
ADMIN_EMAIL              ← Neehal's admin login email
ADMIN_PASSWORD           ← Neehal's admin login password
GOOGLE_CLIENT_ID         ← Google OAuth client ID
TURSO_URL                ← Turso database URL
TURSO_TOKEN              ← Turso auth token
RESEND_API_KEY           ← Resend email API key
RESEND_TEST_EMAIL        ← ⚠️ REMOVE before real launch (redirects all emails here)
APP_URL                  ← Base URL for email links
TEST_MODE=true           ← ⚠️ REMOVE before real launch (returns fake builds, saves API credits)
```

---

## Database Tables

### `stores`
Core store owner record.
```
store_id, name, email, password, plan, plan_status, trial_ends, plan_ends,
brand_color, currency, widget_title, welcome_msg, button_text, widget_bg,
widget_enabled, plugin_secret, woo_connected, woo_url, woo_last_sync,
woo_product_count, email_verified, catalog_last_updated, admin_notes,
google_id, created_at
```

### `products`
Products uploaded by each store (CASCADE DELETE with store).
```
id, store_id (FK), name, category, price, description, in_stock, woo_id, created_at
```

### `recommendations`
Each AI recommendation request log (CASCADE DELETE with store).
```
id, store_id (FK), budget, purpose, extras, result (JSON), created_at
```

### `payments`
Payment submissions from stores (CASCADE DELETE with store).
```
id, store_id (FK), amount, method, transaction_ref, plan, status, created_at
```

### `tokens`
Email verification and password reset tokens.
```
id, email, token, type, expires_at, used, created_at
```

### `trial_emails_sent`
Prevents duplicate trial warning emails. Both columns form the PRIMARY KEY.
```
store_id, days_left
```

### `admins`
Admin accounts (currently only Neehal).
```
id, email, password, name, created_at
```

### `platform_config`
Key-value store for runtime platform settings (editable from admin panel, no redeploy needed).
```
key TEXT PRIMARY KEY, value TEXT
```
**Keys:** `trial_days`, `trial_daily_limit`, `starter_price`, `growth_price`, `pro_price`, `payment_number`, `maintenance_mode`

---

## All API Endpoints

### Public (no auth)
```
POST   /api/signup
POST   /api/login
POST   /api/google-auth
GET    /api/verify-email?token=
POST   /api/forgot-password
POST   /api/reset-password
GET    /api/store-config/:id
GET    /api/products/:storeId
POST   /api/recommend
GET    /api/plans
GET    /widget.js
GET    /widget.css
GET    /buildbot-woocommerce.zip
GET    /plugin-update.json
GET    /                          ← Health check
```

### Store Owner (JWT Bearer token required)
```
GET    /api/me
PUT    /api/settings
PUT    /api/widget-settings
PUT    /api/change-password
POST   /api/upload                ← CSV upload
GET    /api/products/manage/:id
POST   /api/product
PUT    /api/product/:id
PUT    /api/product/:id/stock
DELETE /api/product/:id
GET    /api/analytics
POST   /api/payment/submit
GET    /api/payment/history
```

### WooCommerce Plugin (X-BuildBot-Store-ID + X-BuildBot-Secret headers)
```
POST   /api/plugin/ping
POST   /api/plugin/sync
POST   /api/plugin/product/update
POST   /api/plugin/product/delete
POST   /api/plugin/widget-toggle
GET    /api/plugin/widget-config/:id
```

### Admin (admin JWT required)
```
POST   /api/admin/login
GET    /api/admin/me
PUT    /api/admin/profile
PUT    /api/admin/password
POST   /api/admin/forgot-password
POST   /api/admin/reset-password

GET    /api/admin/overview
GET    /api/admin/stores
GET    /api/admin/payments

POST   /api/admin/approve-payment
POST   /api/admin/reject-payment

POST   /api/admin/disable-store
POST   /api/admin/activate-store
POST   /api/admin/delete-store
POST   /api/admin/set-plan
POST   /api/admin/extend-trial
POST   /api/admin/save-notes

GET    /api/admin/store-products/:storeId

POST   /api/admin/send-email
POST   /api/admin/broadcast
POST   /api/admin/run-drip

GET    /api/admin/db-audit
GET    /api/admin/platform-config
POST   /api/admin/platform-config
POST   /api/admin/db-cleanup
```

---

## Recommendation Limits

| Plan | Limit |
|---|---|
| Trial | 3 per day (configurable via `platform_config.trial_daily_limit`) |
| Starter | 500 per month |
| Growth | 2,000 per month |
| Pro | Unlimited |

> When `TEST_MODE=true` is set, `/api/recommend` returns a fake build instead of calling Claude — saves API credits during development.

---

## Email Templates (`server/email.js`)

| Template | Trigger |
|---|---|
| `welcomeEmail` | On signup |
| `emailVerificationEmail` | On signup (verify link) |
| `paymentApprovedEmail` | Admin approves payment |
| `paymentRejectedEmail` | Admin rejects payment |
| `trialEndingEmail` | 3 days and 1 day before trial expires |
| `onboardingDay4Email` | Day 4 of trial (nudge) |
| `onboardingDay10Email` | Day 10 of trial (nudge) |
| `planExpiredEmail` | Dunning: 1, 3, and 7 days after plan lapses |
| `adminPaymentStaleEmail` | Alert to admin when a payment sits pending too long |
| `passwordResetEmail` | Store owner password reset |
| `adminPasswordResetEmail` | Admin password reset |
| `adminManualEmail` | Admin sends a custom one-off email from Communications tab |

---

## Automated Email Cron (`server/index.js`)

- Runs every **60 minutes** via `setInterval`
- Also runs **once 30 seconds after server startup**
- Calls `runScheduledEmails()` exported from `server/routes/admin.js`
- Triggers: trial warnings, onboarding nudges, dunning emails, stale payment alerts
- Can also be manually triggered from admin panel → **Communications tab → Run Drip Now** → `POST /api/admin/run-drip`

---

## Widget Flow

```
Customer clicks ⚡ bubble
  → S1: Welcome screen
  → S2: Enter budget (Rs)
  → S3: Select purpose (Gaming / Work / Study / etc.)
  → S4: Select extras (checkboxes)
  → S5: Loading spinner (AI thinking)
  → S6: Results — 3 build cards (Budget / Balanced / Max)
         Each card lists parts from the store's catalog
         PDF download button on results screen
```

**Embedding a widget:**
```html
<script src="https://buildbot-production.up.railway.app/widget.js"
        data-store-id="YOUR_STORE_ID"></script>
```

Widget is served directly from Railway at `/widget.js`. The `widget/index.html` file in the repo is only a local smoke-test page and is **not** part of production.

---

## WooCommerce Plugin (`plugin/buildbot-woocommerce/buildbot-woocommerce.php`)

- **Auth:** Uses `X-BuildBot-Store-ID` + `X-BuildBot-Secret` headers (not JWT)
- **Real-time sync:** WooCommerce product add / update / delete hooks fire instantly and sync to BuildBot
- **Full sync:** Store owner can trigger a full catalog sync from the dashboard
- **Widget injection:** Plugin auto-injects the BuildBot widget script on all frontend pages
- **Auto-update:** Plugin checks `/plugin-update.json` for newer versions
- **Setup:** Store owner generates a Plugin Secret in the BuildBot dashboard → Store & Sync tab, then enters it in the WordPress plugin settings

> **Important:** The plugin uses `var` and `window.functionName` (not `const`/`let`) for any globals, to ensure compatibility with older PHP/JS environments.

---

## Admin Panel (`dashboard/admin.html`) — Sidebar Tabs

| Tab | Contents |
|---|---|
| **Overview** | Key stats (stores, recommendations, revenue, pending payments), pending payment alert banner, recent stores list |
| **All Stores** | Searchable table of all stores; action buttons (Activate / Disable / Delete / Manage) expand on hover |
| **Payments** | Pending approvals queue + full payment history with approve/reject buttons |
| **Platform Stats** | Trial vs paid breakdown, top stores by usage, plan distribution chart |
| **Settings** | Admin profile editor, change password, **Platform Configuration card** (trial days, prices, payment number, maintenance mode toggle) |
| **DB Health** | Database integrity audit + Cleanup Actions (delete expired tokens, delete orphaned records) |
| **Communications** | Broadcast email to all stores, Run Drip Now button, Send email to a specific store (dropdown selector) |
| **Revenue** | MRR stat, active paid count, trial count, churn risk count; Revenue by Plan bar chart; At-Risk stores table with Remind button |
| **Activity Log** | localStorage log of admin actions (approve, disable, email, etc.) — max 100 entries, clearable |

---

## Store Dashboard (`dashboard/dashboard.html`) — Sidebar Tabs

| Tab | Notes |
|---|---|
| Overview | Summary stats and status |
| Store & Sync | WooCommerce connection, plugin secret, manual sync |
| Products | CRUD, CSV upload, stock toggle, search/filter |
| Analytics | Usage charts and recommendation history |
| Install Widget | **Hidden** when WooCommerce plugin is connected (widget is injected automatically) |
| Widget Settings | Brand color, title, welcome message, button text, background, enable/disable toggle |
| Billing | Plan info, payment submission form, payment history |
| Account | Profile settings, change password, Google OAuth connection |
| Help | Documentation and support info |

---

## `config.js` Behavior (`dashboard/config.js`)

- **API URL switching:** Automatically points to `localhost:3001` when running locally, Railway production URL when live. Can be overridden via a query param or `localStorage` flag.
- **Global spinner:** Wraps `window.fetch` to show a loading spinner (top-right corner of the page) on every API call.

---

## Platform Config System

- Settings stored in the `platform_config` Turso table — editable from admin panel without redeployment
- Loaded on `enterAdmin()` and whenever the Settings tab is opened
- Saved via `POST /api/admin/platform-config` (whitelisted keys, numeric validation enforced server-side)
- **Configurable keys:** `trial_days`, `trial_daily_limit`, `starter_price`, `growth_price`, `pro_price`, `payment_number`, `maintenance_mode`

---

## DB Cleanup Routes

`POST /api/admin/db-cleanup` with body `{ "action": "tokens" | "orphans" }`

| Action | What it deletes |
|---|---|
| `tokens` | All expired and/or already-used tokens from the `tokens` table |
| `orphans` | Rows in `products`, `recommendations`, `payments`, and `trial_emails_sent` that have no matching store in `stores` |

---

## Revenue Tab (Admin Panel)

- Computed entirely **client-side** from `allStoresData` (no extra API call)
- **MRR** = sum of `planPrices[plan]` for each active paid store
- `planPrices` read from the `cfg-starter-price` / `cfg-growth-price` / `cfg-pro-price` input values in the Settings tab
- **At-Risk stores** = paid stores where `plan_ends` is within 7 days
- **Remind button** → calls `POST /api/admin/send-email` with a renewal reminder template

---

## Activity Log (Admin Panel)

- Stored in `localStorage` under key `bb_admin_log` (maximum 100 entries, oldest dropped first)
- A log entry is written on: payment approved, store disabled / deleted / activated, plan overridden, email sent, broadcast sent, drip triggered, config saved, DB cleanup run
- Cleared with the `clearActivityLog()` button in the Activity Log tab

---

## Important Rules & Gotchas

1. **`widget.js` lives in `server/widget.js`** — Railway serves it at `/widget.js`. The file at `widget/index.html` is only a local smoke-test and is never deployed.
2. **`.env` is NOT on GitHub** — all environment variables must be set manually in the Railway dashboard.
3. **Multer must use memory storage** — Railway's filesystem is ephemeral; uploaded files would be lost on restart if written to disk.
4. **Use Resend HTTP API for email** — Railway's free tier blocks outbound SMTP. Never use Nodemailer with SMTP.
5. **DB migrations run in `try/catch`** — a column or table might already exist from a previous deploy; errors from `ALTER TABLE` must be swallowed silently.
6. **WooCommerce plugin: use `var` and `window.functionName` for globals** — not `const`/`let`, for compatibility with older environments.
7. **Frontend is vanilla JS** — no React, no Vue, no build step. Everything is plain HTML/CSS/JS.
8. **`TEST_MODE=true` and `RESEND_TEST_EMAIL` must be removed** from Railway environment variables before the real public launch.

---

## What Is Complete ✅

- [x] Full store owner auth — signup, login, Google OAuth, email verification, password reset
- [x] AI-powered widget — glassmorphism UI, 3 build tiers, PDF download, rate limiting, graceful fallback
- [x] Product management — CRUD, CSV upload, stock toggle, search/filter
- [x] WooCommerce plugin — full sync, real-time hooks (add/update/delete), auto-update, smart category mapping
- [x] Payment flow — submission form, admin approve/reject, confirmation emails
- [x] Drip email system — trial warnings, onboarding nudges, dunning sequence, stale payment alerts to admin
- [x] Admin panel — 9 sidebar tabs: Overview, All Stores, Payments, Platform Stats, Settings, DB Health, Communications, Revenue, Activity Log
- [x] Platform Config — prices and settings stored in DB, editable from admin panel (no redeploy needed)
- [x] DB Cleanup routes — expired tokens and orphaned records
- [x] Expand-on-hover action buttons in All Stores table
- [x] Store-specific email from admin Communications tab (dropdown selector)
- [x] Revenue tab — MRR, At-Risk stores, Remind button
- [x] Activity Log — localStorage-based admin action history

---

## What Needs Doing Before Real Launch 🚀

- [ ] Remove `TEST_MODE=true` from Railway environment variables
- [ ] Remove `RESEND_TEST_EMAIL` from Railway environment variables
- [ ] Verify sending domain at [resend.com/domains](https://resend.com/domains) (required for real email delivery)
- [ ] Upgrade Railway plan to $5/mo Hobby tier (eliminates cold-start sleep delay)
