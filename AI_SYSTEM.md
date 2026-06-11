# BuildBot AI System — How It Works

A short guide for how recommendations are generated, what they cost, and how to keep usage efficient.

---

## The flow (customer clicks "Build")

1. **Widget** sends budget, purpose, extras, and store ID to `POST /api/recommend`.
2. **Server checks** store is active, plan limit not exceeded, and products exist.
3. **Cache check** — if the same store + budget + purpose + extras was already built *after the last catalog update*, we return the saved result. **No AI call. $0 cost.**
4. **TEST_MODE** (Railway env) — if `TEST_MODE=true`, returns fake builds. **No AI call.**
5. **Real AI** — builds a prompt from the store's in-stock products (name, category, price only — no descriptions), sends it to **Anthropic Claude**, parses JSON, returns 3 builds (Budget / Balanced / Max).
6. **Every request is logged** in the `recommendations` table (including cache hits) for analytics and limits.

---

## What data the AI reads

| Data | Source | Notes |
|------|--------|-------|
| Products | Turso `products` table | Only in-stock items priced ≤ customer budget |
| Store currency | `stores.currency` | Default PKR |
| Customer input | Widget form | Budget, purpose, optional extras (max 200 chars) |

**Not sent to AI:** passwords, emails, payment info, product descriptions (removed to save ~80% tokens).

---

## What it costs (Anthropic API)

Default model: **Claude Haiku 4.5** (`claude-haiku-4-5`)

| | Price (approx.) |
|--|-----------------|
| Input tokens | $1 per 1 million tokens |
| Output tokens | $5 per 1 million tokens |

**Typical real AI call** (medium catalog, 3 builds): ~4,000–8,000 output tokens + ~2,000–6,000 input tokens → **roughly $0.02–$0.06 USD per call** (~Rs 6–18 at 280 PKR/USD).

**Cached repeat** (same budget/purpose/extras): **$0**.

### Railway env vars (already supported in code)

| Variable | Purpose | Default |
|----------|---------|---------|
| `ANTHROPIC_API_KEY` | API authentication | required for real AI |
| `ANTHROPIC_MODEL` | Model name | `claude-haiku-4-5` |
| `ANTHROPIC_MAX_TOKENS` | Max response size | `8192` (you set `12000` on Railway — good) |
| `TEST_MODE` | Fake builds, no API | off in production |

Admin panel **API & Model** tab can override model and limits via database config (takes effect without redeploy).

---

## How efficient is the system?

| Feature | Saves money? |
|---------|--------------|
| **Response cache** | Yes — identical requests cost $0 |
| **No product descriptions in prompt** | Yes — ~80% fewer input tokens |
| **Haiku model** | Yes — cheapest capable Claude model |
| **Plan limits** (trial 3/day, starter 500/mo, etc.) | Yes — caps worst-case usage per store |
| **IP rate limit** (15/hour) | Yes — reduces abuse |
| **Catalog cache invalidation** | Trade-off — catalog changes reset cache (correct behavior) |

**Weak spots today:**
- Cache hits still count toward plan limits (fair for billing, but trials burn quota on repeats).
- Large catalogs (70+ products) increase input tokens and output size.
- Every store gets 3 full builds per request (expensive but good UX).

---

## Profit vs API cost (rough math)

Example with **Starter plan @ Rs 2,999/month, 500 recs**:

| | |
|--|--|
| Revenue per rec | Rs 2,999 ÷ 500 = **~Rs 6** |
| API cost per real AI rec | **~Rs 6–18** (if mostly uncached) |
| API cost per cached rec | **Rs 0** |

**If cache hit rate is low, Starter may lose money on API alone.** Growth/Pro plans have more headroom.

Use **Admin → API & Model** to see real numbers: MRR, estimated API spend, margin, and per-store breakdown.

---

## How to reduce API cost

1. **Encourage cache hits** — stores shouldn't re-upload catalog unnecessarily (`catalog_last_updated` clears cache).
2. **Lower plan limits** — e.g. trial 3/day → 2/day, starter 500 → 300 (Admin → API & Model).
3. **Keep Haiku** — don't switch to Sonnet/Opus unless needed (10×+ cost).
4. **Reduce `ANTHROPIC_MAX_TOKENS`** only if responses aren't truncating (8192–12000 is safe).
5. **Cap affordable products in prompt** — future optimization: send top N products by category instead of all under budget.
6. **Raise prices** — align plan price with expected AI usage (see profit table in admin).

---

## What admin should control (stores)

| Control | Where | Why |
|---------|-------|-----|
| Activate / disable store | All Stores | Stop abuse or non-paying stores |
| Set plan & status | Manage store | Trial → paid, or downgrade |
| Extend trial | Manage store | Sales/onboarding |
| Plan recommendation limits | API & Model | Platform-wide cost control |
| View rec count per store | All Stores / API & Model | Identify heavy users |
| Pause drip emails | Manage store | Comms control |
| Admin notes | Manage store | Internal context |
| **Future:** per-store API limit override | — | For enterprise or abuse cases |
| **Future:** per-store cache-only mode | — | Force $0 API for specific stores |

---

## Admin → API & Model tab

- Platform-wide and per-store API usage (AI vs cached)
- Token totals and estimated USD/PKR cost
- MRR vs API cost profit check
- Change model, max tokens, plan limits, and price assumptions
- API key status (set/missing — key never shown)

---

## Key files

| File | Role |
|------|------|
| `server/routes/recommend.js` | AI engine, cache, limits |
| `server/database.js` | `recommendations` log, `analyticsDB`, `configDB` |
| `server/routes/admin.js` | `/admin/api-usage`, config APIs |
| `dashboard/admin.html` | API & Model admin UI |
