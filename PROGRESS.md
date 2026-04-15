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
- Any store selling PC components — on WordPress/WooCommerce or custom websites
- Store owners pay a monthly subscription to use BuildBot on their website

### Business Model
- Store owners sign up on BuildBot dashboard
- Get a 14-day free trial (no card needed)
- Pay monthly via **JazzCash or EasyPaisa** (Pakistan local payments)
- Three plans: Starter (Rs 2,999), Growth (Rs 6,999), Pro (Rs 14,999)
- Payments are manually verified by the BuildBot admin (Neehal) within 24 hours

---

## 2. HOW THE PRODUCT WORKS (Full Flow)

```
STORE OWNER FLOW:
1. Goes to BuildBot dashboard (dashboard/index.html)
2. Signs up with store name, email, password
3. Gets a unique Store ID (e.g. "techzone-lahore")
4. Uploads their product catalog as a CSV file
5. Gets an embed code (one script tag)
6. Pastes embed code on their website before </body>
7. Widget appears on their website instantly

CUSTOMER FLOW (on the store's website):
1. Sees purple ⚡ floating button (bottom-right)
2. Clicks it → BuildBot widget opens
3. Enters budget, purpose, extras (step by step with progress bar)
4. Clicks "Build My PC"
5. AI reads the store's catalog + customer needs
6. Returns a complete build recommendation with parts, prices, reasons
7. Customer sees total cost, each part, and tips

ADMIN FLOW (Neehal's panel):
1. Goes to dashboard/admin.html
2. Logs in with admin credentials
3. Sees all registered stores, platform stats
4. Reviews pending payments (JazzCash/EasyPaisa submissions)
5. Approves payments → store plan activates instantly
6. Can disable/enable any store
```

---

## 3. COMPLETE FOLDER STRUCTURE

```
buildbot/                          ← Root folder (on Desktop)
│
├── server/                        ← Node.js backend (THE BRAIN)
│   ├── index.js                   ← Main server entry point
│   ├── package.json               ← Dependencies
│   ├── .env                       ← Secret keys (NOT on GitHub)
│   ├── data/                      ← SQLite database lives here
│   │   └── buildbot.db            ← Real database (auto-created)
│   └── routes/
│       ├── auth.js                ← Signup, Login, JWT tokens, store-config endpoint
│       ├── upload.js              ← CSV upload → saves to database
│       ├── recommend.js           ← AI recommendation engine (calls Claude API)
│       ├── analytics.js           ← Usage stats for store owners
│       ├── payment.js             ← Payment submission & history
│       └── admin.js               ← Admin-only routes
│
├── dashboard/                     ← Frontend (store owner interface)
│   ├── index.html                 ← Landing page + Signup + Login + Full Dashboard
│   ├── admin.html                 ← Admin panel (for Neehal only)
│   └── config.js                  ← API URL config (localhost vs production)
│
└── widget/                        ← The embeddable widget
    ├── widget.js                  ← The actual widget code (served by server)
    └── test.html                  ← Test page to preview widget locally
```

---

## 4. TECHNOLOGY STACK

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | Node.js + Express | Runs the server |
| Database | SQLite (better-sqlite3) | Free, no setup, file-based |
| AI Engine | Anthropic Claude API (claude-opus-4-5) | Powers recommendations |
| Auth | JWT (jsonwebtoken) + bcryptjs | Secure login sessions |
| File Upload | Multer + csv-parser | Handle CSV uploads |
| Frontend | Vanilla HTML/CSS/JS | No framework needed, fast |
| Widget | Vanilla JS (IIFE) | Embeds on any website |
| Hosting (planned) | Render (backend) + Vercel (frontend) | Free tier |
| Payments | JazzCash + EasyPaisa | Pakistan local payments |

---

## 5. DATABASE SCHEMA

Four tables in `server/data/buildbot.db`:

```sql
stores          → store_id, name, email, password(hashed), plan, plan_status,
                  trial_ends, brand_color, currency, created_at

products        → id, store_id, name, category, price, description, in_stock

recommendations → id, store_id, budget, purpose, extras, result(JSON), created_at

payments        → id, store_id, amount, method, transaction_ref, plan, status, created_at
```

---

## 6. KEY API ENDPOINTS

```
PUBLIC (no auth needed):
POST /api/signup              → Create store owner account
POST /api/login               → Login, returns JWT token
GET  /api/store-config/:id    → Widget fetches store branding
GET  /api/products/:storeId   → Get store's product list
POST /api/recommend           → AI build recommendation (checks if store is active)
GET  /api/plans               → Get pricing plans info
GET  /widget.js               → Serves the embeddable widget file

STORE OWNER (requires JWT token in Authorization header):
POST /api/upload              → Upload CSV catalog
GET  /api/analytics           → Get store's usage stats
POST /api/payment/submit      → Submit payment proof
GET  /api/payment/history     → Get payment history
GET  /api/me                  → Get current store info

ADMIN ONLY (requires admin JWT):
POST /api/admin/login         → Admin login
GET  /api/admin/overview      → Platform stats + pending payments
GET  /api/admin/stores        → All stores with stats
GET  /api/admin/payments      → All payments
POST /api/admin/approve-payment → Approve payment + activate plan
POST /api/admin/reject-payment  → Reject payment
POST /api/admin/disable-store   → Disable a store
POST /api/admin/activate-store  → Re-enable a store
```

---

## 7. ENVIRONMENT VARIABLES (.env)

```
ANTHROPIC_API_KEY=sk-ant-...        ← Claude AI key
JWT_SECRET=buildbot-super-secret-jwt-key-2024
PORT=3001
ADMIN_EMAIL=your@email.com          ← Your email for admin login
ADMIN_PASSWORD=your-admin-password  ← Your admin password
```

---

## 8. PRICING PLANS

```javascript
const PLANS = {
  starter: { price: 2999,  label: 'Starter', recommendations: 500 },
  growth:  { price: 6999,  label: 'Growth',  recommendations: 2000 },
  pro:     { price: 14999, label: 'Pro',      recommendations: 999999 }
}
```

Trial: 14 days free, no card needed.

---

## 9. CSV FORMAT FOR STORE OWNERS

Store owners upload their catalog as CSV with these columns:

```csv
name,category,price,description
Intel Core i5-13400F,CPU,45000,Great mid range processor
ASUS Prime B660M-K,Motherboard,18000,LGA1700 compatible motherboard
Corsair Vengeance 16GB DDR4,RAM,8500,Reliable 16GB RAM kit
WD Blue 1TB SSD,Storage,14000,Fast and reliable SSD
MSI GeForce RTX 3060,GPU,65000,Great for gaming and editing
Corsair CV550 550W PSU,PSU,8500,Reliable power supply
Deepcool Matrexx 50 Case,Case,6500,Good airflow mid tower case
```

Valid categories: CPU, Motherboard, RAM, Storage, GPU, PSU, Case, Monitor, Accessory

---

## 10. WHAT IS COMPLETE ✅

- [x] Node.js backend server with all routes
- [x] SQLite database with all 4 tables
- [x] Store owner signup & login (JWT auth)
- [x] CSV upload → saves to database
- [x] AI recommendation engine (Claude API)
- [x] Analytics tracking (every recommendation logged)
- [x] Payment submission system (JazzCash/EasyPaisa)
- [x] Store owner dashboard (landing + signup + login + 5 tabs)
- [x] Dashboard tabs: Home, Products, Analytics, Billing, Settings
- [x] Embeddable widget (floating button, 4-step form, progress bar)
- [x] Widget fetches store branding (custom color, currency)
- [x] Admin panel (overview, all stores, payments, platform analytics)
- [x] Admin can approve/reject payments, disable/enable stores
- [x] Code pushed to GitHub (private repository)
- [x] PROGRESS.md created

---

## 11. WHAT NEEDS TO BE DONE NEXT 🔧

### IMMEDIATE — Deployment (In Progress)
- [ ] Deploy backend to **Render.com** (free Node.js hosting)
  - Problem: Render asked for card. Alternative: **Railway** or **Cyclic.sh**
  - Best free alternative without card: **Railway** (sign up with GitHub, no card for trial)
- [ ] Deploy frontend to **Vercel.com** (free static hosting, sign up with GitHub)
- [ ] Connect subdomain **buildbot.workwithneehal.com** → Vercel (CNAME on Hostinger)
- [ ] Update `dashboard/config.js` with real Render/Railway URL
- [ ] Update `widget/widget.js` API URL for production
- [ ] Test full flow on live URLs

### NEAR FUTURE — Feature Upgrades
- [ ] Email notifications (welcome email on signup, payment approved, trial ending soon)
- [ ] Settings page actually saves brand color to database (PUT /api/settings endpoint needed)
- [ ] Widget currency respects store setting dynamically
- [ ] Store owner can delete/update individual products
- [ ] "Add all to cart" button in widget (links to store's product pages)
- [ ] WooCommerce plugin for auto product sync
- [ ] Recommendation limit enforcement (Starter: 500/mo, Growth: 2000/mo)

### GROWTH FEATURES
- [ ] Urdu language support in widget
- [ ] WhatsApp notification to admin on new payment
- [ ] Multiple widget styles (popup, sidebar, inline embed)
- [ ] Customer can save/share their build (unique link)
- [ ] Comparison mode (compare two builds side by side)
- [ ] Auto price scraping to keep catalog fresh
- [ ] Affiliate/referral system for resellers

### BUSINESS FEATURES
- [ ] White-label option (stores brand it as their own tool)
- [ ] API access for developers (Pro plan)
- [ ] Sub-admin accounts (for resellers)
- [ ] Automated payment verification via JazzCash API

---

## 12. KNOWN ISSUES / BUGS

- Settings page (brand color + currency) sends to wrong endpoint — needs a
  `PUT /api/settings` route in auth.js that updates the stores table
- Widget API URL is still hardcoded as localhost in widget.js —
  needs to be updated to production URL before going live
- Render.com requires card for deployment — need to use Railway instead
- No email system connected yet (nodemailer installed but not configured)

---

## 13. HOW TO RUN LOCALLY

```bash
# Start the server
cd Desktop/buildbot/server
node index.js
# Server runs at http://localhost:3001

# Open dashboard
# Double-click: Desktop/buildbot/dashboard/index.html

# Open admin panel
# Double-click: Desktop/buildbot/dashboard/admin.html

# Test widget
# Double-click: Desktop/buildbot/widget/test.html
```

---

## 14. DEPLOYMENT PLAN (Next Session)

```
Backend:   Railway.app (free, Node.js, GitHub connect, no card needed for trial)
Frontend:  Vercel.com  (free, static hosting, GitHub connect)
Domain:    buildbot.workwithneehal.com → Vercel (CNAME on Hostinger DNS)

Steps:
1. Sign up Railway with GitHub
2. Deploy server/ folder to Railway
3. Add all .env variables on Railway dashboard
4. Get Railway URL (e.g. buildbot-server.up.railway.app)
5. Update config.js and widget.js with Railway URL
6. Push to GitHub
7. Deploy dashboard/ folder to Vercel
8. Add custom domain on Vercel
9. Add CNAME on Hostinger DNS panel
10. Test everything end to end
```

---

## 15. BUSINESS CONTEXT

- **Founder:** Neehal (non-developer, building with Claude AI assistance)
- **Target country:** Pakistan (initial launch)
- **Payment:** JazzCash / EasyPaisa (manual verification by admin)
- **Hosting budget:** $0 (using free tiers)
- **Domain:** buildbot.workwithneehal.com (subdomain on existing Hostinger plan)
- **GitHub repo:** Private repository (buildbot)
- **No card available** for paid services — must use free tiers only

---

## 16. HOW TO CONTINUE IN A NEW CHAT

Paste this entire file into a new Claude chat and say:

> "I am building BuildBot. Here is my complete project context in PROGRESS.md.
> I want to continue from where I left off. Today I want to work on: [WHAT YOU WANT]"

Claude will read this file and immediately understand the full project
without you needing to explain anything again.
