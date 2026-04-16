# BuildBot — Project Progress & Context File
> Last Updated: April 2026
> Purpose: Paste this file into any new Claude chat to continue development instantly

---

## 1. WHAT IS BUILDBOT?

BuildBot is a **SaaS product** — an AI-powered PC build recommender widget that PC parts stores
can embed on their websites. It works like a floating chat bubble (bottom-right corner of any
website). When a customer clicks it, they enter:

1. Their **budget** (e.g. PKR 80,000)
2. Their **purpose** (Gaming, Office Work, Video Editing, Coding, etc.)
3. Any **extras** they want (Monitor, Mouse, Keyboard, etc.)

BuildBot then reads that store's product catalog and uses **Claude AI (Anthropic API)** to suggest
a complete, compatible PC build using only the products that store actually sells.

### Target Market
- PC parts stores in Pakistan (e.g. StarTech, TPlink resellers, local computer shops)
- Any store selling PC components on WordPress/WooCommerce or custom websites
- Store owners pay a monthly subscription to use BuildBot on their website

### Business Model
- Store owners sign up on BuildBot dashboard
- Get a 14-day free trial (no card needed)
- Pay monthly via JazzCash or EasyPaisa (Pakistan local payments)
- Three plans: Starter (Rs 2,999), Growth (Rs 6,999), Pro (Rs 14,999)
- Payments manually verified by BuildBot admin (Neehal) within 24 hours

---

## 2. LIVE URLS

```
Dashboard:   https://buildbot-nine.vercel.app/
Admin Panel: https://buildbot-nine.vercel.app/admin.html  ← 404 bug, not fixed yet
Server API:  https://buildbot-production.up.railway.app/
Widget JS:   https://buildbot-production.up.railway.app/widget.js
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
buildbot/                          ← Root folder (on Desktop)
│
├── server/                        ← Node.js backend
│   ├── index.js                   ← Main server entry point
│   ├── package.json               ← Dependencies (multer: ^1.4.5-lts.1)
│   ├── .env                       ← Secret keys (NOT on GitHub)
│   ├── data/                      ← SQLite database lives here
│   │   └── buildbot.db            ← Real database (auto-created)
│   └── routes/
│       ├── auth.js                ← Signup, Login, JWT, store-config endpoint
│       ├── upload.js              ← CSV upload → saves to database
│       ├── recommend.js           ← AI recommendation engine (Claude API)
│       ├── analytics.js           ← Usage stats for store owners
│       ├── payment.js             ← Payment submission & history
│       └── admin.js               ← Admin-only routes
│
├── dashboard/                     ← Frontend (store owner interface)
│   ├── index.html                 ← Landing page + Signup + Login + Dashboard
│   ├── admin.html                 ← Admin panel (for Neehal only)
│   ├── config.js                  ← API URL switcher (localhost vs production)
│   ├── vercel.json                ← Vercel routing config
│   └── test.html                  ← Widget test page
│
└── widget/                        ← The embeddable widget
    ├── widget.js                  ← Widget code (served by Railway)
    └── test.html                  ← Widget test page
```

---

## 4. TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| AI Engine | Anthropic Claude API (claude-opus-4-5) |
| Auth | JWT + bcryptjs |
| File Upload | Multer (1.4.5-lts.1) + csv-parser |
| Frontend | Vanilla HTML/CSS/JS |
| Widget | Vanilla JS (IIFE) |
| Backend Hosting | Railway.app (free tier) |
| Frontend Hosting | Vercel.com (free tier) |
| Payments | JazzCash + EasyPaisa (manual) |

---

## 5. ENVIRONMENT VARIABLES (set on Railway dashboard)

```
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=buildbot-super-secret-jwt-key-2024
PORT=3001
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=your-admin-password
```

---

## 6. DATABASE SCHEMA

```sql
stores          → store_id, name, email, password(hashed), plan, plan_status,
                  trial_ends, brand_color, currency, created_at

products        → id, store_id, name, category, price, description, in_stock

recommendations → id, store_id, budget, purpose, extras, result(JSON), created_at

payments        → id, store_id, amount, method, transaction_ref, plan, status, created_at
```

---

## 7. KEY API ENDPOINTS

```
PUBLIC:
POST /api/signup
POST /api/login
GET  /api/store-config/:id
GET  /api/products/:storeId
POST /api/recommend
GET  /widget.js

STORE OWNER (JWT required):
POST /api/upload
GET  /api/analytics
POST /api/payment/submit
GET  /api/payment/history
GET  /api/me

ADMIN (admin JWT required):
POST /api/admin/login
GET  /api/admin/overview
GET  /api/admin/stores
GET  /api/admin/payments
POST /api/admin/approve-payment
POST /api/admin/reject-payment
POST /api/admin/disable-store
POST /api/admin/activate-store
```

---

## 8. WHAT IS COMPLETE ✅

- [x] Node.js backend with all routes
- [x] SQLite database with 4 tables
- [x] Store owner signup & login (JWT auth)
- [x] CSV upload → saves to database
- [x] AI recommendation engine (Claude API)
- [x] Analytics tracking
- [x] Payment submission (JazzCash/EasyPaisa)
- [x] Store owner dashboard (5 tabs: Home, Products, Analytics, Billing, Settings)
- [x] Embeddable widget (floating button, 4-step form, progress bar, back buttons)
- [x] Widget fetches store branding (custom color, currency)
- [x] Admin panel (overview, stores, payments, platform analytics)
- [x] Backend live on Railway ✅
- [x] Frontend live on Vercel ✅
- [x] Code on GitHub (private repo) ✅

---

## 9. CURRENT BUGS (as of last session) 🔧

### BUG 1: Widget not showing on test page — TOP PRIORITY
- test.html served via `npx serve` at http://localhost:3000
- widget.js fetched from Railway (correct URL in code)
- Console shows ZERO errors, Network tab shows nothing
- Widget ⚡ button does not appear on page
- Suspected causes:
  1. Railway may not have redeployed latest widget.js after code change
  2. widget.js IIFE may be silently failing
  3. `document.currentScript` may return null when loaded async
- Fix to try: Add `console.log` at top of widget.js to confirm it runs,
  check Railway logs, try adding a small delay before init

### BUG 2: admin.html returns 404 on Vercel
- vercel.json exists in dashboard/ with routing rules
- Two different formats tried, neither worked
- admin.html file confirmed present in dashboard/ folder
- Fix to try: Check Vercel deployment logs to confirm admin.html is included,
  try a completely different vercel.json approach

### BUG 3: Embed code shows localhost URL
- Dashboard generates: http://localhost:3001/widget.js
- Should generate: https://buildbot-production.up.railway.app/widget.js
- Fix: Update hardcoded string in dashboard/index.html enterApp() function
- Simple one-line fix, not yet pushed

---

## 10. NEXT SESSION PLAN

Fix these 3 bugs in order:
1. Fix widget appearing (most important — core product feature)
2. Fix embed code URL (one line change)
3. Fix admin.html 404 on Vercel

Then move to features:
- Email notifications
- Settings saving to database
- Product management (delete/edit)
- WooCommerce integration
- Recommendation limits per plan

---

## 11. HOW TO RUN LOCALLY

```bash
# Terminal 1 - Start server
cd Desktop/buildbot/server
node index.js

# Terminal 2 - Serve frontend
cd Desktop/buildbot/dashboard
npx serve .

# Open in browser:
# Dashboard: http://localhost:3000
# Admin:     http://localhost:3000/admin.html
# Widget test: http://localhost:3000/test.html
```

---

## 12. BUSINESS CONTEXT

- **Founder:** Neehal (non-developer, building with Claude AI)
- **Target:** Pakistan PC stores (initial launch)
- **Payment:** JazzCash / EasyPaisa (manual verification)
- **Hosting:** Free tiers only (no card available)
- **Domain:** buildbot.workwithneehal.com (not connected yet)
- **GitHub:** Private repo (buildbot)

---

## 13. HOW TO CONTINUE IN A NEW CHAT

Paste this entire file into a new Claude chat and say:

> "I am building BuildBot. Here is my PROGRESS.md file with full context.
> I want to continue from where I left off. Today I want to work on: [WHAT YOU WANT]"
