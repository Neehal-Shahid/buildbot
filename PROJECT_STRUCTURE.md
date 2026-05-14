# BuildBot — Project Structure & File Reference

> **PURPOSE OF THIS FILE:** When uploaded to an AI, it answers:
> - "Which file do I edit for X?"
> - "How does Y work?"
> - "What calls what?"
> - "Where is this function defined?"

---

## Table of Contents

1. [Repository Layout](#repository-layout)
2. [File-by-File Breakdown](#file-by-file-breakdown)
   - [server/index.js](#serverindexjs)
   - [server/database.js](#serverdatabasejs)
   - [server/email.js](#serveremailjs)
   - [server/widget.js](#serverwidgetjs)
   - [server/widget.css](#serverwidgetcss)
   - [server/routes/auth.js](#serverroutesauthjs)
   - [server/routes/upload.js](#serverroutesuploadjs)
   - [server/routes/recommend.js](#serverroutesrecommendjs)
   - [server/routes/analytics.js](#serverroutesanalyticsjs)
   - [server/routes/payment.js](#serverroutespaymentjs)
   - [server/routes/admin.js](#serverroutesadminjs)
   - [server/routes/plugin.js](#serverroutespluginjs)
   - [plugin/buildbot-woocommerce/buildbot-woocommerce.php](#pluginbuildbot-woocommercebuildbot-woocommercephp)
   - [dashboard/config.js](#dashboardconfigjs)
   - [dashboard/index.html](#dashboardindexhtml)
   - [dashboard/dashboard.html](#dashboarddashboardhtml)
   - [dashboard/admin.html](#dashboardadminhtml)
   - [dashboard/verify.html](#dashboardverifyhtml)
   - [dashboard/reset-password.html](#dashboardreset-passwordhtml)
   - [dashboard/vercel.json](#dashboardverceljson)
3. [How Files Connect](#how-files-connect)
4. [Data Flows](#data-flows)
5. [Authentication System](#authentication-system)
6. [Caching System](#caching-system)
7. [Recommendation Limits](#recommendation-limits)
8. [Platform Config Table](#platform_config-table)
9. [Deployment Notes](#deployment-notes)

---

## Repository Layout

```/dev/null/tree.txt#L1-20
buildbot/
├── server/
│   ├── index.js            ← Express entry point, cron
│   ├── database.js         ← ALL database logic (libsql/Turso)
│   ├── email.js            ← All email templates + Resend API calls
│   ├── widget.js           ← Shopper-facing IIFE (served as static file)
│   ├── widget.css          ← Widget styles (served as static file)
│   └── routes/
│       ├── auth.js         ← Store owner auth + settings
│       ├── upload.js       ← CSV/product CRUD
│       ├── recommend.js    ← AI recommendation engine (critical path)
│       ├── analytics.js    ← Store analytics endpoint
│       ├── payment.js      ← Payment submission + history
│       ├── admin.js        ← Admin panel routes + drip cron logic
│       └── plugin.js       ← WooCommerce plugin sync endpoints
├── plugin/
│   └── buildbot-woocommerce/
│       └── buildbot-woocommerce.php  ← WordPress plugin
├── dashboard/
│   ├── config.js           ← API base URL + global fetch wrapper
│   ├── index.html          ← Landing page + login/signup
│   ├── dashboard.html      ← Logged-in store owner app
│   ├── admin.html          ← Admin panel
│   ├── verify.html         ← Email verification landing
│   ├── reset-password.html ← Password reset form
│   └── vercel.json         ← Vercel SPA routing rewrites
└── widget/                 ← (build output / alternate widget assets)
```

---

## File-by-File Breakdown

---

### `server/index.js`

**Role:** Express application entry point. Boots the server, mounts all routes, and starts the email cron.

| Responsibility | Detail |
|---|---|
| Framework | Express |
| CORS | `cors({ origin: '*' })` — fully open |
| Static files served | `/widget.js`, `/widget.css`, `/buildbot-woocommerce.zip`, `/plugin-update.json` |
| Health check | `GET /` → 200 OK |
| Route mounting | All route files mounted under `/api` prefix |
| DB boot | Calls `initDB()` from `database.js`; `app.listen()` only starts after `initDB()` resolves |
| Cron import | `runScheduledEmails` imported from `routes/admin.js` |
| Cron schedule | Runs once 30 seconds after startup, then every 60 minutes via `setInterval` |

**Route mounting order:**
```/dev/null/mount-order.txt#L1-8
app.use('/api', authRouter)
app.use('/api', uploadRouter)
app.use('/api', recommendRouter)
app.use('/api', analyticsRouter)
app.use('/api', paymentRouter)
app.use('/api', adminRouter)
app.use('/api', pluginRouter)
```

---

### `server/database.js`

**Role:** Single source of truth for ALL database interaction. No raw SQL exists anywhere else in the codebase (except two direct `client.execute` calls in `admin.js` for cleanup/audit queries).

**Database:** Turso (libsql) — accessed via `createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })`

**Exports:**

```/dev/null/exports.txt#L1-12
{
  client,       // raw libsql client (used by admin.js cleanup/audit only)
  initDB,       // creates tables, runs migrations, seeds admin
  storeDB,
  productDB,
  analyticsDB,
  paymentDB,
  tokenDB,
  verifyDB,
  widgetDB,
  adminDB,
  configDB
}
```

#### Tables Created by `initDB()`

| Table | Purpose |
|---|---|
| `admins` | Admin accounts (separate from stores) |
| `stores` | Store owner accounts + branding + plan info |
| `products` | Product catalog per store |
| `recommendations` | Logged AI recommendation results (also used as cache) |
| `payments` | Payment submissions and approval status |
| `tokens` | Email verification + password reset tokens |
| `trial_emails_sent` | Dedup log for drip/trial emails |
| `platform_config` | Runtime key-value config (no redeploy needed) |

#### Migrations (run in try/catch after table creation)

Migrations add columns via `ALTER TABLE` and create the `platform_config` table if it does not exist. Columns added:

`plugin_secret`, `woo_connected`, `woo_url`, `woo_last_sync`, `woo_product_count`, `email_verified`, `widget_title`, `welcome_msg`, `button_text`, `widget_bg`, `widget_enabled`, `catalog_last_updated`, `woo_id`, `google_id`, `plan_ends`, `admin_notes`

Then: `CREATE TABLE platform_config` + `INSERT OR IGNORE` seed rows.

#### `initDB()` Seeding

If no rows exist in `admins`, inserts a default admin account using env-configured credentials.

---

#### `storeDB` Methods

| Method | What it does |
|---|---|
| `create` | Inserts new store row |
| `findByEmail` | Lookup by email |
| `findById` | Lookup by store ID |
| `updateBranding` | Updates `brand_color`, `currency` |
| `updatePlan` | Updates plan column |
| `isActive` | Returns boolean — checks `active` flag |
| `getAll` | Returns all store rows |
| `disableStore` | Sets `active = 0` |
| `activateStore` | Sets `active = 1` |
| `updatePassword` | Bcrypt hash stored |
| `updatePluginKey` | Sets `plugin_secret` |
| `updateWooStatus` | Updates `woo_connected`, `woo_url`, `woo_last_sync` |
| `findByPluginSecret` | Used by plugin auth |
| `getPluginKey` | Returns raw `plugin_secret` |
| `touchCatalog` | Sets `catalog_last_updated = NOW()` — **invalidates recommendation cache** |
| `deleteStoreAndData` | Deletes store + all related rows |
| `setPlan` | Admin override plan |
| `extendTrial` | Adds days to trial |
| `setNotes` | Saves `admin_notes` |
| `getTrialEndingIn(days)` | Returns stores whose trial ends in exactly N days |
| `getPlanLapsedBy(days)` | Returns stores whose plan expired N days ago |
| `getSignedUpDaysAgo(days)` | Returns stores created exactly N days ago |

---

#### `adminDB` Methods

| Method | What it does |
|---|---|
| `findByEmail` | Admin login lookup |
| `findById` | Admin profile lookup |
| `updatePassword` | Updates admin password hash |
| `updateProfile` | Updates admin name/email |

---

#### `productDB` Methods

| Method | What it does |
|---|---|
| `bulkInsert` | **Deletes all** products for store, then re-inserts. Used by CSV upload and WooCommerce sync. |
| `getByStore` | Returns all products for a store |
| `getCount` | Returns count of products for a store |

---

#### `analyticsDB` Methods

| Method | What it does |
|---|---|
| `logRecommendation` | Inserts recommendation record (also acts as cache entry) |
| `getCachedRecommendation` | Returns cached result if `created_at >= catalog_last_updated` |
| `getStats` | Returns total, byPurpose, avgBudget, recent, daily for a store |
| `getTotalRecs` | Platform-wide recommendation count |
| `checkLimit` | Returns `{ allowed, count, limit }` based on plan |

---

#### `paymentDB` Methods

| Method | What it does |
|---|---|
| `create` | Inserts pending payment |
| `approve` | Sets status=approved, adds 30 days to `plan_ends` |
| `reject` | Sets status=rejected |
| `getByStore` | Store's payment history |
| `getPending` | All pending payments (admin) |
| `getAll` | All payments (admin) |
| `getRevenue` | Sum of approved payments |
| `getStalePending(hours)` | Pending payments older than N hours |

---

#### `tokenDB` Methods

| Method | What it does |
|---|---|
| `save` | Deletes any existing token of same type for store, then inserts new one |
| `verify` | Looks up token, checks not used + not expired |
| `markUsed` | Sets `used = 1` |

---

#### Other DB Objects

| Object | Methods | Purpose |
|---|---|---|
| `verifyDB` | `setVerified`, `isVerified` | Email verification flag on store row |
| `widgetDB` | `updateSettings`, `getSettings` | Widget title/message/button/bg per store |
| `configDB` | `getAll`, `set`, `setMany`, `get` | Platform config key-value store; `getAll` returns flat `{key: value}` object |

---

### `server/email.js`

**Role:** All outbound email logic. Calls the Resend API. Contains every email template.

**Key behavior:**
- `sendEmail(template)` — sends via `POST https://api.resend.com/emails` with `Authorization: Bearer RESEND_API_KEY`
- If `TEST_MODE=true` OR `RESEND_TEST_EMAIL` env var is set → all emails are redirected to the test address

#### Email Templates

Each template is a function that returns `{ from, to, subject, html }`:

| Function | Trigger | Recipients |
|---|---|---|
| `welcomeEmail(name, email)` | Signup | Store owner |
| `emailVerificationEmail(name, email, token)` | Signup | Store owner — link: `APP_URL/verify.html?token=` |
| `paymentApprovedEmail(name, email, plan)` | Admin approves payment | Store owner |
| `paymentRejectedEmail(name, email, plan)` | Admin rejects payment | Store owner |
| `trialEndingEmail(name, email, daysLeft)` | Drip cron | Store owner |
| `onboardingDay4Email(name, email)` | Drip cron day 4 | Store owner — "You haven't gone live yet" nudge |
| `onboardingDay10Email(name, email)` | Drip cron day 10 | Store owner — upgrade urgency |
| `planExpiredEmail(name, email, daysExpired)` | Drip cron (dunning) | Store owner |
| `adminPaymentStaleEmail(name, email, plan, amount, hoursWaiting)` | Drip cron | Admin |
| `passwordResetEmail(name, email, token)` | Forgot password | Store owner |
| `adminPasswordResetEmail(name, email, token)` | Admin forgot password | Admin |
| `adminManualEmail(name, email, subject, message)` | Broadcast + single send | Any store owner |

---

### `server/widget.js`

**Role:** The shopper-facing recommendation widget. Served as a static file by Express. Runs entirely in the end-customer's browser on the store owner's site.

**Injection method:**
```/dev/null/snippet.html#L1-1
<script src="https://...railway.app/widget.js" data-store-id="STORE_ID"></script>
```

**Startup sequence:**
1. Reads `data-store-id` from its own `<script>` tag
2. Fetches `GET /api/store-config/:id` (branding, widget settings, `widgetEnabled`)
3. If `widgetEnabled = false` → silently exits, renders nothing
4. Dynamically loads `widget.css` from same origin
5. Creates floating ⚡ button + slide-out panel

**Widget Steps:**

| Step | ID | Content |
|---|---|---|
| S1 | welcome | Welcome message, start button |
| S2 | budget | Budget input |
| S3 | purpose | Purpose selector |
| S4 | extras | Extra preferences |
| S5 | loading | Spinner while calling API |
| S6 | results | 3 build cards: Budget / Balanced / Max |

**API call:** `POST /api/recommend` with `{ storeId, budget, purpose, extras }`

**Results rendering:**
- 3 build cards with detail modal
- PDF download via `html2pdf` (loaded dynamically on demand)
- If rate limit hit: shows customer-safe error message, does NOT expose technical details

---

### `server/widget.css`

**Role:** Styles for the widget panel, served as a static file.

- Uses CSS custom properties: `--bb-bg`, `--bb-accent`, etc. (overridable via widget settings)
- Glassmorphism effect: `backdrop-filter: blur(...)`
- Scoped to widget elements only — no global style pollution

---

### `server/routes/auth.js`

**Role:** All store owner identity and account management routes.

**Exports:** `{ router }`

**JWT Middleware (defined here, used by all protected routes in this file):**

```/dev/null/middleware.txt#L1-5
verifyToken(req, res, next)
  - Reads Authorization: Bearer <token>
  - Verifies with JWT_SECRET
  - Attaches req.store = decoded payload
  - 401 if missing/invalid
```

#### Routes

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/api/signup` | Public | `storeDB.create` → `tokenDB.save` → send welcome + verification email → return JWT |
| `POST` | `/api/login` | Public | `storeDB.findByEmail` → `bcrypt.compare` → `verifyDB.isVerified` check → sign JWT (7d) |
| `POST` | `/api/google-auth` | Public | Verify Google ID token → create or find store → return JWT |
| `GET` | `/api/verify-email` | Public | `verifyDB.setVerified` → `tokenDB.markUsed` |
| `POST` | `/api/forgot-password` | Public | `tokenDB.save` → `sendEmail(passwordResetEmail)` |
| `POST` | `/api/reset-password` | Public | `tokenDB.verify` → `storeDB.updatePassword` |
| `GET` | `/api/me` | Required | Returns fresh store data |
| `PUT` | `/api/settings` | Required | Updates `brand_color` + `currency` |
| `PUT` | `/api/widget-settings` | Required | Updates `widget_title`, `welcome_msg`, `button_text`, `widget_bg` |
| `PUT` | `/api/change-password` | Required | Verify old password → `storeDB.updatePassword` |
| `GET` | `/api/store-config/:id` | **Public** | Returns branding + widget settings + `widgetEnabled` (used by widget.js) |
| `GET` | `/api/plans` | **Public** | Returns plan info |

**JWT payload structure:**
```/dev/null/jwt-payload.txt#L1-7
{
  id, storeId, email,
  plan, planStatus, name
}
```

---

### `server/routes/upload.js`

**Role:** Product catalog management — CSV upload and individual product CRUD.

> **Cache invalidation note:** Every write operation calls `storeDB.touchCatalog(storeId)` to invalidate the recommendation cache.

#### Routes

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/api/upload` | Required | `multer.single('file')` → `papaparse` CSV parse → `productDB.bulkInsert` → `storeDB.touchCatalog` |
| `GET` | `/api/products/manage/:storeId` | Required | Returns all products including out-of-stock |
| `POST` | `/api/product` | Required | Add single product |
| `PUT` | `/api/product/:id` | Required | Edit single product |
| `PUT` | `/api/product/:id/stock` | Required | Toggle `in_stock` flag |
| `DELETE` | `/api/product/:id` | Required | Delete single product |

---

### `server/routes/recommend.js`

**Role:** The AI recommendation engine. This is the critical path called by `widget.js`.

**Exports:** `{ router }`

**Rate limiter:** `express-rate-limit` applied to `POST /api/recommend` — IP-based.

#### `POST /api/recommend` — Step-by-step execution

```/dev/null/recommend-flow.txt#L1-12
1.  Get store by storeId                         → storeDB.findById
2.  Check store is active                        → storeDB.isActive (403 if not)
3.  Check recommendation limit                   → analyticsDB.checkLimit
        → if exceeded: 429 with friendly message
4.  Check cache                                  → analyticsDB.getCachedRecommendation
        → if hit: return cached builds immediately
5.  Get products                                 → productDB.getByStore
6.  TEST_MODE=true?                              → return fake builds, skip Claude
7.  Filter products by budget (≤ budget × 1.2)
8.  Build system + user prompt for Claude
9.  POST to Anthropic API (claude-3-5-haiku-20241022)
10. Parse JSON from Claude response
11. Log recommendation                           → analyticsDB.logRecommendation
12. Return builds to widget
```

#### Other Routes

| Method | Path | Auth | What it does |
|---|---|---|---|
| `GET` | `/api/products/:storeId` | Public | Returns in-stock products for a store |

---

### `server/routes/analytics.js`

**Role:** Store owner analytics endpoint.

| Method | Path | Auth | What it does |
|---|---|---|---|
| `GET` | `/api/analytics` | Required | `analyticsDB.getStats(storeId)` → returns `{ total, byPurpose, avgBudget, recent, daily }` |

---

### `server/routes/payment.js`

**Role:** Store owner payment submission and history.

| Method | Path | Auth | What it does |
|---|---|---|---|
| `POST` | `/api/payment/submit` | Required | `paymentDB.create` (status=pending) → email admin |
| `GET` | `/api/payment/history` | Required | `paymentDB.getByStore` |

---

### `server/routes/admin.js`

**Role:** All admin panel API routes. Also owns the drip email cron logic.

**Exports:** `{ router, runScheduledEmails }`

**Imports from `database.js`:** `storeDB`, `paymentDB`, `analyticsDB`, `productDB`, `client`, `adminDB`, `tokenDB`, `configDB`

**Admin auth middleware:**

```/dev/null/adminauth.txt#L1-5
adminAuth(req, res, next)
  - Reads Authorization: Bearer <token>
  - Verifies JWT_SECRET
  - Checks decoded.isAdmin === true
  - 403 if not admin
```

#### Admin Routes

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/admin/login` | Verify against `admins` table → sign JWT with `isAdmin: true` (1d expiry) |
| `GET` | `/api/admin/overview` | `enrichStoresWithCounts` + `getTotalRecs` + `getRevenue` + `getPending` |
| `GET` | `/api/admin/stores` | All stores with product + rec counts |
| `GET` | `/api/admin/payments` | All payments |
| `POST` | `/api/admin/approve-payment` | `paymentDB.approve` → `sendEmail(paymentApprovedEmail)` |
| `POST` | `/api/admin/reject-payment` | `paymentDB.reject` → `sendEmail(paymentRejectedEmail)` |
| `POST` | `/api/admin/disable-store` | `storeDB.disableStore` |
| `POST` | `/api/admin/activate-store` | `storeDB.activateStore` |
| `POST` | `/api/admin/delete-store` | `storeDB.deleteStoreAndData` |
| `POST` | `/api/admin/set-plan` | `storeDB.setPlan` |
| `POST` | `/api/admin/extend-trial` | `storeDB.extendTrial` |
| `POST` | `/api/admin/save-notes` | `storeDB.setNotes` |
| `GET` | `/api/admin/store-products/:storeId` | `productDB.getByStore` |
| `POST` | `/api/admin/send-email` | `sendEmail(adminManualEmail)` to one store |
| `POST` | `/api/admin/broadcast` | Loop all active stores → `sendEmail(adminManualEmail)` to each |
| `POST` | `/api/admin/run-drip` | Calls `runScheduledEmails()` immediately, returns results |
| `GET` | `/api/admin/db-audit` | Raw SQL: orphan detection + token stats (uses `client.execute` directly) |
| `GET` | `/api/admin/platform-config` | `configDB.getAll()` |
| `POST` | `/api/admin/platform-config` | Validate keys whitelist + numeric values → `configDB.setMany()` |
| `POST` | `/api/admin/db-cleanup` | `action:'tokens'` → delete expired/used; `action:'orphans'` → delete no-store records |
| `GET` | `/api/admin/me` | Admin profile |
| `PUT` | `/api/admin/profile` | `adminDB.updateProfile` |
| `PUT` | `/api/admin/password` | `adminDB.updatePassword` |
| `POST` | `/api/admin/forgot-password` | `tokenDB.save` → `sendEmail(adminPasswordResetEmail)` |
| `POST` | `/api/admin/reset-password` | `tokenDB.verify` → `adminDB.updatePassword` |

---

#### `runScheduledEmails()` — Drip Cron Logic

Called by the `setInterval` in `index.js`. Also callable manually via `POST /api/admin/run-drip`.

```/dev/null/drip-flow.txt#L1-14
1. storeDB.getTrialEndingIn(3)
      → send trialEndingEmail (3 days left)
      → deduped: check trial_emails_sent before sending, insert after

2. storeDB.getTrialEndingIn(1)
      → send trialEndingEmail (1 day left)
      → same dedup logic

3. storeDB.getSignedUpDaysAgo(4)
      → if NOT woo_connected AND no products
      → send onboardingDay4Email

4. storeDB.getSignedUpDaysAgo(10)
      → send onboardingDay10Email

5. storeDB.getPlanLapsedBy(1), getPlanLapsedBy(3), getPlanLapsedBy(7)
      → send planExpiredEmail (dunning sequence)

6. paymentDB.getStalePending(6)
      → send adminPaymentStaleEmail to admin

Returns: { trialWarnings, onboarding, dunning, stalePayments, errors[] }
```

---

#### `enrichStoresWithCounts(stores)` — Helper

Batch queries product count and recommendation count for all stores in **two SQL queries** (not N queries). Attaches `product_count` and `rec_count` to each store object.

---

### `server/routes/plugin.js`

**Role:** WooCommerce plugin sync endpoints. Uses custom header authentication (not JWT).

**Authentication method:**
```/dev/null/plugin-auth.txt#L1-4
Request headers:
  X-BuildBot-Store-ID: <storeId>
  X-BuildBot-Secret: <plugin_secret>

Verified by: storeDB.findByPluginSecret(storeId, secret)
```

#### Routes

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/plugin/ping` | Test auth, return store name |
| `POST` | `/api/plugin/sync` | `productDB.bulkInsert` with WooCommerce products + `storeDB.touchCatalog` |
| `POST` | `/api/plugin/product/update` | Upsert single product by `woo_id` |
| `POST` | `/api/plugin/product/delete` | Delete single product by `woo_id` |
| `POST` | `/api/plugin/widget-toggle` | Enable/disable `widget_enabled` |
| `GET` | `/api/plugin/widget-config/:id` | Returns current `widget_enabled` status |

---

### `plugin/buildbot-woocommerce/buildbot-woocommerce.php`

**Role:** WordPress plugin that connects WooCommerce stores to BuildBot.

| Feature | Detail |
|---|---|
| Admin settings page | Store ID + Secret Key fields + "Test Connection" button |
| Activation check | Verifies WooCommerce is installed |
| Full sync | Fetches all WooCommerce products, `POST /api/plugin/sync` |
| Real-time hooks | `woocommerce_new_product`, `woocommerce_update_product`, `before_delete_post` |
| Widget injection | `wp_footer` hook adds `<script src="widget.js" data-store-id="...">` |
| Auto-update | Hooks into WordPress update API, checks `/plugin-update.json` |
| Category mapping | 50+ keyword rules mapping WooCommerce categories → BuildBot categories |

---

### `dashboard/config.js`

**Role:** Sets `window.BB_API` to the correct backend URL, and wraps `window.fetch` with a global loading spinner.

**URL selection logic:**
- `hostname === 'localhost'` AND (`?localApi=1` in URL OR `localStorage.bb_use_local_api === '1'`) → `http://localhost:3001`
- Otherwise → Railway production URL

**Global fetch wrapper:**
- Intercepts every `fetch()` call site-wide
- Shows top-right spinner on request start
- Hides spinner on response complete
- Transparent to all other code

---

### `dashboard/index.html`

**Role:** Landing page + authentication flows. Single HTML file with tabs shown/hidden via JS.

**Sections (tabs):**

| Section | Content |
|---|---|
| Landing | Hero, features list, pricing table |
| Login tab | Email + password, Google Sign-In button |
| Signup tab | Name, email, password + strength bar |
| Forgot password | Email input → sends reset link |

**Redirect logic:** On page load, if JWT found in `localStorage` → redirect to `dashboard.html`

---

### `dashboard/dashboard.html`

**Role:** The logged-in store owner application. Single HTML file, vanilla JS.

**All Tabs:**

| Tab | Key content |
|---|---|
| **Overview** | Stats cards, journey checklist, recent recommendations |
| **Store & Sync** | Catalog mode selector (Manual vs WooCommerce), plugin download, secret key display, sync status |
| **Products** | CRUD table, CSV upload button, search/filter, stock toggle. Shows read-only message when WooCommerce mode active. |
| **Analytics** | Stats + bar charts (purpose distribution, daily activity) |
| **Install Widget** | Embed code snippet, preview, mark-as-live button. **Hidden when WooCommerce mode is active.** |
| **Widget Settings** | Brand color, bg color, currency, title, welcome message, button text + live preview |
| **Billing** | Plan display, plan selector, JazzCash/EasyPaisa payment instructions, payment submission form, payment history |
| **Account** | Profile edit + change password |
| **Help** | Quick start guide + links |

#### Key JS Functions & Variables

| Symbol | Type | What it does |
|---|---|---|
| `bb_store_mode` | `localStorage` key | `'custom'` or `'woo'` — current catalog mode |
| `catalogModeIsManual()` | Function | Returns `true` if mode is `'custom'` |
| `updateInstallWidgetNavVisibility()` | Function | Shows/hides the "Install Widget" nav item based on mode |
| `publishWidgetCTA()` | Function | Routes to `embed` tab (manual mode) or `store` tab (woo mode) |
| `showTab(name)` | Function | Shows named tab, hides all others. **Guard:** if `name === 'embed'` and woo mode → redirects to `'store'` instead |

---

### `dashboard/admin.html`

**Role:** The admin panel. Single HTML file, vanilla JS. Protected by admin JWT.

#### Sidebar Tabs (9 total)

| # | Tab Name | Key content |
|---|---|---|
| 1 | **Overview** | Platform stats (stores, recs, revenue, pending), pending payments card with approve/reject buttons, recent stores table |
| 2 | **All Stores** | Searchable table with expand-on-hover action buttons per row. "Manage" opens modal for plan override, trial extension, admin notes |
| 3 | **Payments** | Pending payment table + full payment history |
| 4 | **Platform Stats** | Trial vs paid counts, top stores by rec count, plan distribution bar chart |
| 5 | **Settings** | Admin profile/password form + Platform Configuration card (6 config inputs + maintenance mode toggle) |
| 6 | **DB Health** | Integrity audit (orphan counts, token stats, table totals) + Cleanup Actions (2 buttons) |
| 7 | **Communications** | Broadcast email form, "Run Drip Now" button, "Send to Specific Store" with searchable dropdown |
| 8 | **Revenue** | MRR/paid/trial/risk stats, Revenue by Plan bars, At-Risk stores table with "Remind" button |
| 9 | **Activity Log** | localStorage-persisted action log with Clear button |

#### Key JS Functions

**Data loaders:**

| Function | What it does |
|---|---|
| `loadOverview()` | Fetches and renders overview tab data |
| `loadStores()` | Fetches all stores, stores in `allStoresData`, calls `renderStores` |
| `loadPayments()` | Fetches and renders payments tab |
| `loadPlatformAnalytics()` | Fetches and renders platform stats tab |
| `loadRevenueTab()` | Purely client-side — reads `allStoresData` + config price inputs |
| `loadPlatformConfig()` | `GET /api/admin/platform-config` → populates all `cfg-*` inputs |

**Renderers:**

| Function | What it does |
|---|---|
| `renderStores(stores)` | Renders the stores table with all action buttons |
| `filterStores()` | Client-side search filter over `allStoresData` |
| `renderActivityLog()` | Reads from `localStorage.bb_admin_log`, renders log entries |

**Action handlers:**

| Function | What it does |
|---|---|
| `enterAdmin()` | Called on successful login. Shows app, calls `loadOverview()` + `loadPlatformConfig()` |
| `confirmApprove(id)` | Confirm modal → `POST /api/admin/approve-payment` |
| `confirmDisable(id)` | Confirm modal → `POST /api/admin/disable-store` |
| `confirmDelete(id)` | Confirm modal → `POST /api/admin/delete-store` |
| `confirmActivate(id)` | Confirm modal → `POST /api/admin/activate-store` |
| `confirmManageStore(id)` | Opens manage modal for plan/trial/notes |
| `confirmBroadcast()` | Reads form from **comms tab directly** (not a modal — modal was removed to fix duplicate ID bug) |
| `openBroadcastModal()` | Legacy — kept but not called (modal commented out) |
| `runDripNow(btn)` | `POST /api/admin/run-drip` |
| `savePlatformConfig()` | `POST /api/admin/platform-config` with all `cfg-*` input values |
| `dbCleanup(action)` | `POST /api/admin/db-cleanup` with `action` parameter |
| `sendRenewalReminder(storeId, name)` | `POST /api/admin/send-email` with renewal email template |

**Store dropdown (for "Send to Specific Store"):**

| Function | What it does |
|---|---|
| `openStoreDropdown()` | Opens the searchable store selector |
| `filterStoreDropdown()` | Filters dropdown options on keypress |
| `renderStoreDropdown()` | Renders the filtered list |
| `scheduleCloseDropdown()` | Closes dropdown on blur with delay |
| `selectStoreForEmail(id, name)` | Sets selected store state |
| `clearSelectedStore()` | Clears selection |

**Tab switching:**

```/dev/null/showtab.txt#L1-10
showTab(name)
  - Hides all tab panels
  - Shows selected tab panel
  - Updates nav active state
  - Side effects per tab:
      'settings'  → loadPlatformConfig()
      'revenue'   → loadRevenueTab()
      'activity'  → renderActivityLog()
      'comms'     → loadStores() if allStoresData is empty
```

**Utility functions:**

| Function | What it does |
|---|---|
| `setBtnLoading(btn, bool)` | Shows spinner inside button, disables it while loading |
| `showAlert(id, msg, type)` | Shows inline alert element, auto-hides after 4 seconds |
| `showToast(title, msg, type)` | Shows bottom-right toast notification |
| `safeText(text)` | XSS-safe text escaping |
| `planBadge(plan)` | Returns colored badge HTML string for a plan name |
| `closeModal()` | Closes all `.modal-bg` elements |
| `logActivity(action, detail)` | Writes entry to `localStorage.bb_admin_log` |
| `clearActivityLog()` | Clears `localStorage.bb_admin_log` |

#### Action Button CSS System (Expand-on-Hover)

```/dev/null/action-btn-css.txt#L1-14
Base state (.action-btn):
  width: 28px
  min-width: 28px
  overflow: hidden

Hover state:
  min-width: 80px
  width: auto        ← button expands to reveal text label

Text label (.ab-text inside button):
  max-width: 0       ← hidden at rest
  max-width: 56px    ← revealed on hover

Variant classes:
  act-activate  → accent/indigo color
  act-disable   → warning/amber color
  act-delete    → danger/red color
  act-manage    → neutral color

Actions <td>:
  min-width: 160px   ← prevents row layout shift on expand
```

---

### `dashboard/verify.html`

**Role:** Email verification landing page.

- On load: reads `?token=` from URL
- `POST /api/verify-email?token=...`
- Shows success or error message
- Links back to login

---

### `dashboard/reset-password.html`

**Role:** Password reset form.

- Shows new password input
- On submit: `POST /api/reset-password` with `{ token, password }`
- Token read from URL `?token=`
- On success: redirects to login

---

### `dashboard/vercel.json`

**Role:** Vercel deployment configuration for the dashboard SPA.

- Rewrites: all unmatched routes → `index.html`
- Ensures direct navigation to `admin.html`, `verify.html`, `reset-password.html` all work

---

## How Files Connect

```/dev/null/connection-map.txt#L1-30
Browser (shopper)
  └─ widget.js (served as static file by Railway/Express)
       ├─ GET  /api/store-config/:id   → auth.js → database.js (widgetDB, storeDB)
       └─ POST /api/recommend          → recommend.js → database.js (analyticsDB, productDB, storeDB)
                                                      → Anthropic API (claude-3-5-haiku)

Browser (store owner)
  └─ dashboard/index.html
       └─ dashboard/config.js  (sets window.BB_API, wraps fetch)
  └─ dashboard/dashboard.html
       ├─ /api/auth/*           → auth.js    → database.js (storeDB, tokenDB, verifyDB, widgetDB)
       ├─ /api/upload, /api/product/* → upload.js → database.js (productDB, storeDB)
       ├─ /api/analytics        → analytics.js → database.js (analyticsDB)
       └─ /api/payment/*        → payment.js → database.js (paymentDB)

Browser (admin)
  └─ dashboard/admin.html
       └─ /api/admin/*          → admin.js → database.js (storeDB, paymentDB, adminDB, configDB, etc.)
                                           → email.js → Resend API

WordPress site
  └─ buildbot-woocommerce.php
       └─ /api/plugin/*         → plugin.js → database.js (productDB, storeDB)

Railway server (index.js)
  ├─ loads all route files
  ├─ after initDB() resolves → app.listen(PORT)
  └─ cron (setInterval 60min)
       └─ runScheduledEmails()  ← imported from admin.js
            ├─ database.js (storeDB, paymentDB)
            └─ email.js → Resend API
```

---

## Data Flows

### New Store Signup

```/dev/null/flow-signup.txt#L1-8
index.html (form submit)
  → POST /api/signup (auth.js)
  → storeDB.create
  → tokenDB.save (verification token)
  → sendEmail(welcomeEmail)
  → sendEmail(emailVerificationEmail)  ← link: APP_URL/verify.html?token=
  → JWT signed and returned
  → localStorage.bb_token = JWT
  → redirect to dashboard.html
```

### Store Login

```/dev/null/flow-login.txt#L1-6
POST /api/login (auth.js)
  → storeDB.findByEmail
  → bcrypt.compare(password, hash)
  → verifyDB.isVerified check (401 if not verified)
  → JWT signed (7 day expiry)
  → localStorage.bb_token = JWT
```

### Widget Recommendation (Critical Path)

```/dev/null/flow-recommend.txt#L1-12
widget.js loaded on store owner's site
  → fetch GET /api/store-config/:id    ← gets branding + checks widgetEnabled
  → if widgetEnabled=false: exit silently

Customer fills form → POST /api/recommend
  → storeDB.isActive           (403 if disabled)
  → analyticsDB.checkLimit     (429 if over plan limit)
  → analyticsDB.getCachedRecommendation
      → if cache HIT: return cached builds immediately
  → productDB.getByStore
  → filter products ≤ budget × 1.2
  → build Claude prompt
  → POST Anthropic API (claude-3-5-haiku-20241022)
  → parse JSON from Claude response
  → analyticsDB.logRecommendation (also stores as cache)
  → return builds to widget.js
```

### Admin Payment Approval

```/dev/null/flow-payment.txt#L1-7
Admin clicks "Approve" in admin.html
  → confirmApprove(paymentId)
  → POST /api/admin/approve-payment (admin.js)
  → paymentDB.approve  (sets status=approved, plan_ends = NOW + 30 days)
  → storeDB updates plan column
  → sendEmail(paymentApprovedEmail) to store owner
  → logActivity('Payment approved', plan) in localStorage
```

### CSV Upload

```/dev/null/flow-csv.txt#L1-7
Store owner uploads CSV in dashboard.html
  → POST /api/upload (upload.js)
  → multer (memory storage, no disk write)
  → papaparse parses CSV buffer
  → productDB.bulkInsert
      → DELETE all existing products for store
      → INSERT all new products
  → storeDB.touchCatalog  ← sets catalog_last_updated = NOW()
  → recommendation cache effectively invalidated
```

### Platform Config Save

```/dev/null/flow-config.txt#L1-6
Admin fills Settings tab in admin.html
  → savePlatformConfig()
  → reads all cfg-* input values
  → POST /api/admin/platform-config (admin.js)
  → validate: keys must be in whitelist, numeric keys must be numbers
  → configDB.setMany()
  → DB updated — no redeploy required
```

### Drip Email Cron

```/dev/null/flow-drip.txt#L1-12
index.js: setInterval(60 min) → runScheduledEmails()

1. storeDB.getTrialEndingIn(3) → check trial_emails_sent → trialEndingEmail (3d)
2. storeDB.getTrialEndingIn(1) → check trial_emails_sent → trialEndingEmail (1d)
3. storeDB.getSignedUpDaysAgo(4)
     → if !woo_connected AND no products → onboardingDay4Email
4. storeDB.getSignedUpDaysAgo(10) → onboardingDay10Email
5. storeDB.getPlanLapsedBy(1)  → planExpiredEmail
6. storeDB.getPlanLapsedBy(3)  → planExpiredEmail
7. storeDB.getPlanLapsedBy(7)  → planExpiredEmail
8. paymentDB.getStalePending(6) → adminPaymentStaleEmail to admin

Returns: { trialWarnings, onboarding, dunning, stalePayments, errors[] }
```

---

## Authentication System

### Store Owner JWT

| Property | Value |
|---|---|
| Storage key | `localStorage.bb_token` |
| Header | `Authorization: Bearer <token>` |
| Secret | `JWT_SECRET` env var |
| Expiry | 7 days |
| Verified by | `verifyToken` middleware in `auth.js` |
| Attaches to request | `req.store` |

**Payload structure:**
```/dev/null/store-jwt.txt#L1-7
{
  id,
  storeId,
  email,
  plan,
  planStatus,
  name
}
```

### Admin JWT

| Property | Value |
|---|---|
| Storage key | `localStorage.bb_admin_token` |
| Header | `Authorization: Bearer <token>` |
| Secret | `JWT_SECRET` env var |
| Expiry | 1 day |
| Verified by | `adminAuth` middleware in `admin.js` |
| Key check | `decoded.isAdmin === true` |

**Payload structure:**
```/dev/null/admin-jwt.txt#L1-5
{
  isAdmin: true,
  id, email, name
}
```

### WooCommerce Plugin Authentication

| Property | Value |
|---|---|
| Method | Custom headers (NOT JWT) |
| Headers | `X-BuildBot-Store-ID` + `X-BuildBot-Secret` |
| Secret stored | `plugin_secret` column in `stores` table |
| Verified by | `storeDB.findByPluginSecret(storeId, secret)` in `plugin.js` |
| Generated | In dashboard Store & Sync tab, displayed to store owner once |

---

## Caching System

BuildBot uses **event-based cache invalidation**, not time-based TTL.

| Property | Detail |
|---|---|
| Cache storage | `recommendations` table in Turso DB |
| Cache key | `(storeId, budget, purpose, extras)` combination |
| Cache validity check | `created_at >= catalog_last_updated` |
| Invalidation trigger | Any product change calls `storeDB.touchCatalog()` |
| Effective cache lifetime | Infinite — until any product is added, edited, deleted, or synced |

**Flow:**
```/dev/null/cache-flow.txt#L1-8
POST /api/recommend
  → analyticsDB.getCachedRecommendation(storeId, budget, purpose, extras)
      → SQL: SELECT ... WHERE key_match AND created_at >= store.catalog_last_updated
      → CACHE HIT: return immediately (no Claude call, no credit used)
      → CACHE MISS: continue to Claude API

Product change (upload/edit/delete/sync)
  → storeDB.touchCatalog(storeId)
      → UPDATE stores SET catalog_last_updated = datetime('now') WHERE id = ?
      → All cached recommendations for this store are now stale
```

---

## Recommendation Limits

Enforced in `recommend.js` via `analyticsDB.checkLimit(storeId, plan)`.

| Plan | Limit | Period |
|---|---|---|
| `trial` | 3 | Per day (`date(created_at) = date('now')`) |
| `starter` | 500 | Per calendar month |
| `growth` | 2000 | Per calendar month |
| `pro` | Unlimited | Returns `999999` |

When limit is exceeded:
- Server returns HTTP 429
- Widget displays a customer-friendly error message
- Claude API is **never called**

---

## `platform_config` Table

Runtime configuration. Changes take effect immediately — **no redeploy required**.

| Key | Default Value | Purpose |
|---|---|---|
| `trial_days` | `'14'` | Trial period length |
| `trial_daily_limit` | `'10'` | Daily rec limit for trial (currently stored, not yet enforced dynamically) |
| `starter_price` | `'2999'` | Starter plan price (PKR) |
| `growth_price` | `'4999'` | Growth plan price (PKR) |
| `pro_price` | `'7999'` | Pro plan price (PKR) |
| `payment_number` | `''` | JazzCash/EasyPaisa number shown for payments |
| `maintenance_mode` | `'false'` | Maintenance mode toggle |

> **Note:** `trial_days` and `trial_daily_limit` are seeded and editable, but the widget/recommend code currently uses hardcoded values. These are intended for future dynamic enforcement.

**Access pattern:**
- Admin reads: `GET /api/admin/platform-config` → `configDB.getAll()` → flat `{ key: value }` object
- Admin writes: `POST /api/admin/platform-config` → validates whitelist + numeric constraints → `configDB.setMany()`
- Server reads at runtime: `configDB.get('payment_number', '')` (with default fallback)

---

## Deployment Notes

### Environments

| Service | Host | Trigger |
|---|---|---|
| Backend | Railway | Push to GitHub → auto-deploys (~2 min) |
| Frontend | Vercel | Push to GitHub → auto-deploys (~1 min) |

### Plugin Distribution

1. Zip the `buildbot-woocommerce` folder
2. Copy zip to `server/` (served as `/buildbot-woocommerce.zip`)
3. Update version number in `buildbot-woocommerce.php` and `plugin-update.json`
4. Push to GitHub → WordPress sites auto-detect update via WP update API

### Local Development

```/dev/null/local-dev.txt#L1-10
# Start backend (port 3001)
cd server && node index.js

# Start frontend (port 3000)
cd dashboard && npx serve .

# Point frontend to local backend:
Option A: Add ?localApi=1 to URL
Option B: localStorage.setItem('bb_use_local_api', '1')

# Required env vars: TURSO_URL, TURSO_TOKEN, JWT_SECRET,
#   RESEND_API_KEY, ANTHROPIC_API_KEY, APP_URL
# Optional: TEST_MODE=true, RESEND_TEST_EMAIL
```

### Environment Variables Reference

| Variable | Used in | Purpose |
|---|---|---|
| `TURSO_URL` | `database.js` | Turso DB URL |
| `TURSO_TOKEN` | `database.js` | Turso auth token |
| `JWT_SECRET` | `auth.js`, `admin.js` | JWT signing secret |
| `RESEND_API_KEY` | `email.js` | Resend API authentication |
| `ANTHROPIC_API_KEY` | `recommend.js` | Claude API authentication |
| `APP_URL` | `email.js` | Base URL for email links (e.g. verify link) |
| `PORT` | `index.js` | Server port (Railway sets this automatically) |
| `TEST_MODE` | `recommend.js`, `email.js` | If `true`: skips Claude + redirects emails |
| `RESEND_TEST_EMAIL` | `email.js` | If set: all emails go to this address |
