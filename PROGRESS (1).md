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
Admin Panel: https://buildbot-nine.vercel.app/admin.html
Server API:  https://buildbot-production.up.railway.app/
Widget JS:   https://buildbot-production.up.railway.app/widget.js
```

---

## 3. TECH STACK

```
Backend:   Node.js + Express → Railway.app (free tier)
Database:  Turso (cloud SQLite) → free tier
Frontend:  Vanilla HTML/CSS/JS → Vercel (free tier)
Widget:    Vanilla JS (IIFE) → served by Railway
AI:        Anthropic Claude API (claude-opus-4-5)
Auth:      JWT + bcryptjs
Payments:  JazzCash + EasyPaisa (manual verification)
```

### Why This Stack is Good
- No framework complexity — vanilla HTML/CSS/JS is simple and stable
- Railway + Vercel + Turso all have free tiers
- Easy to maintain and add features without breaking things
- Claude can help with any bug or feature in any session

### Known Infrastructure Risk
- Railway free tier sleeps after 30 mins inactivity
- First request after sleep takes 10-15 seconds (widget slow to load)
- Fix when first paying customer arrives: upgrade to Railway $5/mo hobby plan

---

## 4. COMPLETE FOLDER STRUCTURE

```
buildbot/
├── .gitignore
├── PROGRESS.md                    ← This file
├── buildbot-template.csv          ← Sample CSV for store owners
│
├── widget/
│   └── test.html                  ← Local widget test page
│
├── dashboard/                     ← Deployed on Vercel
│   ├── index.html                 ← Landing + Login + Full Dashboard
│   ├── admin.html                 ← Admin panel (Neehal only)
│   ├── config.js                  ← API URL switcher
│   ├── vercel.json                ← Vercel routing config
│   └── test.html                  ← Widget test page
│
└── server/                        ← Deployed on Railway
    ├── index.js                   ← Express server entry point
    ├── database.js                ← All Turso DB functions
    ├── widget.js                  ← Widget file served by Railway
    ├── package.json               ← Dependencies
    ├── .env                       ← Secret keys (NOT on GitHub)
    └── routes/
        ├── auth.js                ← Signup, Login, /me, /settings, store-config
        ├── upload.js              ← CSV upload (memory storage for Railway)
        ├── recommend.js           ← AI recommendations + analytics logging
        ├── analytics.js           ← Store usage stats
        ├── payment.js             ← Payment submission + history
        └── admin.js               ← Admin only routes
```

---

## 5. IMPORTANT: WIDGET.JS WORKFLOW

widget.js must exist in TWO places:
- `widget/widget.js` — source file you edit (in widget folder)
- `server/widget.js` — copy that Railway serves

Every time you edit widget.js:
1. Edit `server/widget.js`
2. Push to GitHub
3. Railway redeploys automatically

---

## 6. ENVIRONMENT VARIABLES

### Railway (server):
```
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=buildbot-super-secret-jwt-key-2024
PORT=3001
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=your-admin-password
TURSO_URL=libsql://buildbot-yourname.turso.io
TURSO_TOKEN=your-turso-token
```

---

## 7. DATABASE SCHEMA (Turso)

```sql
stores          → id, store_id, name, email, password, plan, plan_status,
                  trial_ends, brand_color, currency, created_at

products        → id, store_id, name, category, price, description,
                  in_stock, created_at

recommendations → id, store_id, budget, purpose, extras, result, created_at

payments        → id, store_id, amount, method, transaction_ref,
                  plan, status, created_at
```

---

## 8. KEY API ENDPOINTS

```
PUBLIC:
POST /api/signup              → Create store account (14 day trial)
POST /api/login               → Login, get JWT token
GET  /api/store-config/:id    → Widget fetches branding
GET  /api/products/:storeId   → Get store products
POST /api/recommend           → AI build recommendation
GET  /widget.js               → Serves widget file

STORE OWNER (JWT required):
GET  /api/me                  → Get fresh store data
PUT  /api/settings            → Save brand color + currency
POST /api/upload              → Upload CSV catalog
GET  /api/analytics           → Store usage stats
POST /api/payment/submit      → Submit JazzCash/EasyPaisa proof
GET  /api/payment/history     → Payment history

ADMIN (admin JWT required):
POST /api/admin/login
GET  /api/admin/overview      → All stores + pending payments
GET  /api/admin/stores        → All stores with stats
GET  /api/admin/payments      → All payments
POST /api/admin/approve-payment
POST /api/admin/reject-payment
POST /api/admin/disable-store
POST /api/admin/activate-store
```

---

## 9. PRICING PLANS

```javascript
starter: { price: 2999,  recommendations: 500     }
growth:  { price: 6999,  recommendations: 2000    }
pro:     { price: 14999, recommendations: unlimited }
trial:   { price: 0,     duration: 14 days         }
```

---

## 10. WHAT IS COMPLETE ✅

- [x] Node.js backend with all routes
- [x] Turso cloud database (persists across Railway redeploys)
- [x] Store owner signup & login (JWT auth)
- [x] CSV upload using memory storage (works on Railway)
- [x] AI recommendation engine (Claude API)
- [x] Analytics tracking per store
- [x] Payment submission (JazzCash/EasyPaisa manual)
- [x] Store owner dashboard (5 tabs: Home, Products, Analytics, Billing, Settings)
- [x] Settings saves brand color + currency to Turso
- [x] Embeddable widget (floating button, 4 steps, progress bar)
- [x] Widget fetches store branding dynamically
- [x] Admin panel (overview, stores, payments, analytics)
- [x] Admin approve/reject payments, disable/enable stores
- [x] Each store only sees their own products (isolated)
- [x] enterApp() fetches fresh data from server on every login
- [x] Backend live on Railway ✅
- [x] Frontend live on Vercel ✅
- [x] Database live on Turso ✅
- [x] Code on GitHub (private repo) ✅

---

## 11. BUGS FIXED IN LAST SESSION ✅

- Fixed: Products showing wrong store's data (localStorage stale storeId)
- Fixed: Settings not saving to database (was calling GET /me instead of PUT /settings)
- Fixed: enterApp() now fetches fresh data from server on every login
- Fixed: admin.html 404 on Vercel (reverted to working vercel.json format)
- Fixed: Upload success/error message not showing
- Fixed: Duplicate uploads (button disabled during upload)
- Fixed: widget.js not found on Railway (moved to server/ folder)
- Fixed: CSV upload failing on Railway (switched to memory storage)

---

## 12. WHAT TO BUILD NEXT — PRIORITY ORDER

### 🔴 CRITICAL (build before charging anyone)

```
1. EMAIL NOTIFICATIONS
   → Welcome email when store signs up
   → Payment approved notification
   → Payment rejected notification
   → Trial ending soon (3 days before expiry)
   → Tool: Nodemailer + Gmail SMTP (free)
   → Files to create: server/email.js + update auth.js, payment.js

2. RECOMMENDATION LIMIT ENFORCEMENT
   → Starter: max 500/mo, Growth: max 2000/mo, Pro: unlimited
   → Currently everyone gets unlimited — you lose money
   → Fix: Check count in recommendations table before allowing
   → Files to update: server/routes/recommend.js, server/database.js

3. PASSWORD RESET
   → "Forgot password?" link on login page
   → Send reset link via email
   → Store owner clicks link, sets new password
   → Files: server/routes/auth.js + dashboard/index.html
```

### 🟡 IMPORTANT (needed to grow)

```
4. WOOCOMMERCE PLUGIN
   → Auto-sync products instead of manual CSV upload
   → Biggest pain point for store owners
   → WordPress plugin that calls /api/upload automatically

5. WIDGET CUSTOMIZATION
   → Store owner sets widget title, welcome message
   → Currently hardcoded as "BuildBot" for everyone

6. PRODUCT MANAGEMENT
   → Edit/delete individual products
   → Mark items out of stock
   → Currently only full CSV replace possible

7. BETTER ANALYTICS
   → Which products get recommended most
   → Weekly email report to store owner
```

### 🟢 GROWTH FEATURES

```
8.  REFERRAL SYSTEM
    → Get 1 free month for referring another store
    → Cheapest marketing possible

9.  WHITE LABEL
    → Remove "Powered by BuildBot" for extra fee
    → Easy extra revenue

10. URDU LANGUAGE SUPPORT
    → Huge advantage in Pakistan market
    → No competitor has this

11. WHATSAPP ALERTS (to you as admin)
    → New signup → WhatsApp message to Neehal
    → New payment → instant alert
    → Free using WhatsApp Business API

12. MULTIPLE WIDGET STYLES
    → Popup, sidebar, inline embed options

13. AUTO PRICE SCRAPING
    → Store pastes website URL
    → System scrapes prices daily
    → Catalog stays fresh automatically
```

---

## 13. HOW TO RUN LOCALLY

```bash
# Terminal 1 - Start server
cd Desktop/buildbot/server
node index.js
# Runs at http://localhost:3001
# Should print: Turso database connected and tables ready!

# Terminal 2 - Serve frontend
cd Desktop/buildbot/dashboard
npx serve .
# Runs at http://localhost:3000

# URLs:
# Dashboard:    http://localhost:3000
# Admin:        http://localhost:3000/admin.html
# Widget test:  http://localhost:3000/test.html
```

---

## 14. BUSINESS CONTEXT

- **Founder:** Neehal (non-developer, building with Claude AI)
- **Target:** Pakistan PC stores (initial launch)
- **Payment:** JazzCash / EasyPaisa (manual verification by admin)
- **Hosting:** Free tiers (Railway + Vercel + Turso)
- **Upgrade plan:** Railway $5/mo when first paying customer arrives
- **Domain:** buildbot.workwithneehal.com (not connected yet, using vercel URL)
- **GitHub:** Private repo (buildbot)

---

## 15. NEXT SESSION INSTRUCTIONS

Paste this file into a new Claude chat and say:

> "I am building BuildBot. Here is my PROGRESS.md with full context.
> I want to continue from where I left off. Today I want to work on: [WHAT YOU WANT]"

### Suggested next session:
> "I want to add email notifications — welcome email on signup,
> payment approved/rejected, and trial ending soon alerts"
