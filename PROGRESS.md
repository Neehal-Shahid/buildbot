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
Admin Panel: https://buildbot-nine.vercel.app/admin.html  ← 404 bug still pending
Server API:  https://buildbot-production.up.railway.app/
Widget JS:   https://buildbot-production.up.railway.app/widget.js ✅ WORKING
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
buildbot/                          ← Root folder (on Desktop)
│
├── server/                        ← Node.js backend (deployed on Railway)
│   ├── index.js                   ← Main server entry point
│   ├── widget.js                  ← Widget file lives HERE (copied from widget/)
│   ├── package.json               ← Dependencies (multer: ^1.4.5-lts.1)
│   ├── .env                       ← Secret keys (NOT on GitHub)
│   ├── data/                      ← SQLite database lives here
│   │   └── buildbot.db            ← Auto-created on server start
│   └── routes/
│       ├── auth.js                ← Signup, Login, JWT, store-config endpoint
│       ├── upload.js              ← CSV upload → saves to database
│       ├── recommend.js           ← AI recommendation engine (Claude API)
│       ├── analytics.js           ← Usage stats for store owners
│       ├── payment.js             ← Payment submission & history
│       └── admin.js               ← Admin-only routes
│
├── dashboard/                     ← Frontend (deployed on Vercel)
│   ├── index.html                 ← Landing page + Signup + Login + Dashboard
│   ├── admin.html                 ← Admin panel (for Neehal only)
│   ├── config.js                  ← API URL switcher (localhost vs production)
│   ├── vercel.json                ← Vercel routing config
│   └── test.html                  ← Widget test page
│
└── widget/                        ← Source widget folder
    ├── widget.js                  ← Source file (must also copy to server/widget.js)
    └── test.html                  ← Test page for widget
```

---

## 4. IMPORTANT: WIDGET.JS WORKFLOW

**CRITICAL NOTE:** `widget.js` must exist in TWO places:
- `widget/widget.js` — source file you edit
- `server/widget.js` — the copy Railway serves

**Every time you edit widget.js, you must:**
1. Edit `widget/widget.js`
2. Copy the same content to `server/widget.js`
3. Push both to GitHub

---

## 5. TECHNOLOGY STACK

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) — WARNING: resets on Railway redeploy |
| AI Engine | Anthropic Claude API (claude-opus-4-5) |
| Auth | JWT + bcryptjs |
| File Upload | Multer (1.4.5-lts.1) + csv-parser |
| Frontend | Vanilla HTML/CSS/JS |
| Widget | Vanilla JS (IIFE) |
| Backend Hosting | Railway.app (free tier) |
| Frontend Hosting | Vercel.com (free tier) |
| Payments | JazzCash + EasyPaisa (manual) |

---

## 6. ENVIRONMENT VARIABLES (set on Railway dashboard)

```
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=buildbot-super-secret-jwt-key-2024
PORT=3001
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=your-admin-password
```

---

## 7. DATABASE SCHEMA

```sql
stores          → store_id, name, email, password(hashed), plan, plan_status,
                  trial_ends, brand_color, currency, created_at

products        → id, store_id, name, category, price, description, in_stock

recommendations → id, store_id, budget, purpose, extras, result(JSON), created_at

payments        → id, store_id, amount, method, transaction_ref, plan, status, created_at
```

---

## 8. KEY API ENDPOINTS

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
POST /api/payment/history
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

## 9. WHAT IS COMPLETE ✅

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
- [x] Widget.js serving correctly from Railway ✅
- [x] Widget appearing and AI recommendations working end-to-end ✅
- [x] Code on GitHub (private repo) ✅

---

## 10. CURRENT BUGS 🔧

### BUG 1: Database resets on every Railway redeploy — CRITICAL
- SQLite database file lives inside Railway container
- Every redeploy wipes the database → all stores/products deleted
- Solution: Migrate to Turso (free cloud SQLite, no card needed)
- Sign up at turso.tech with GitHub

### BUG 2: admin.html returns 404 on Vercel
- vercel.json exists but routing not working
- admin.html confirmed in dashboard/ folder
- Workaround: access locally via npx serve

### BUG 3: Embed code shows localhost URL
- Dashboard generates: http://localhost:3001/widget.js
- Should generate: https://buildbot-production.up.railway.app/widget.js
- Fix: One line change in dashboard/index.html enterApp() function

---

## 11. NEXT PRIORITIES

### Must fix soon:
- [ ] Fix database persistence (migrate to Turso)
- [ ] Fix embed code URL (localhost → Railway URL)
- [ ] Fix admin.html 404 on Vercel

### Near future features:
- [ ] Email notifications (welcome, payment approved, trial ending)
- [ ] Settings page saves brand color to database
- [ ] Store owner can delete/update individual products
- [ ] Add all to cart button in widget
- [ ] WooCommerce plugin for auto product sync
- [ ] Recommendation limit enforcement per plan
- [ ] Urdu language support
- [ ] WhatsApp notification to admin on new payment

---

## 12. HOW TO RUN LOCALLY

```bash
# Terminal 1 - Start server
cd Desktop/buildbot/server
node index.js

# Terminal 2 - Serve frontend
cd Desktop/buildbot/dashboard
npx serve .

# Open in browser:
# Dashboard:    http://localhost:3000
# Admin:        http://localhost:3000/admin.html
# Widget test:  http://localhost:3000/test.html

# OR serve widget folder:
cd Desktop/buildbot/widget
npx serve .
# Widget test:  http://localhost:3000/test.html
```

---

## 13. BUSINESS CONTEXT

- **Founder:** Neehal (non-developer, building with Claude AI)
- **Target:** Pakistan PC stores (initial launch)
- **Payment:** JazzCash / EasyPaisa (manual verification)
- **Hosting:** Free tiers only (no card available)
- **Domain:** buildbot.workwithneehal.com (not connected yet)
- **GitHub:** Private repo (buildbot)

---

## 14. HOW TO CONTINUE IN A NEW CHAT

Paste this entire file into a new Claude chat and say:

> "I am building BuildBot. Here is my PROGRESS.md with full context.
> I want to continue from where I left off. Today I want to work on: [WHAT YOU WANT]"
