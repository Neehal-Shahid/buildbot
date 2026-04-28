# BUILDBOT WIDGET — FULL REDESIGN + THREE BUILDS FEATURE
# Master Prompt v1
> Paste this entire file into Claude and say: "Build this exactly."

---

## WHAT YOU ARE BUILDING

You will make **two changes** to the BuildBot project:

### Change 1: `server/widget.js` — Complete Visual Redesign
Redesign the widget UI from scratch. Same screens (S1–S6), same flow, same logic. Only the CSS and HTML layout changes. No JS logic changes.

### Change 2: `server/routes/recommend.js` + `server/widget.js` — Three Builds Feature
Instead of returning one build recommendation, the AI now returns **three different builds** at different price tiers. The widget shows all three as selectable cards, and clicking any card opens a full-screen detail modal.

---

## CONTEXT: HOW THE CURRENT SYSTEM WORKS

**Widget flow (6 screens):**
- S1: Welcome screen → click "Get Started"
- S2: Budget input (number field + quick-select chips)
- S3: Purpose selection (chips: Gaming, Coding, etc.)
- S4: Extras (optional chips + text input)
- S5: Loading screen (spinner while API call runs)
- S6: Results screen (single build rendered by `renderResults()`)

**API call:**
`POST /api/recommend` with `{ budget, purpose, extras, storeId }`
Returns `{ success, recommendation, currency }` where `recommendation` is a single build object.

**Current recommendation object shape:**
```json
{
  "buildName": "string",
  "totalPrice": 0,
  "withinBudget": true,
  "budgetRemaining": 0,
  "parts": [
    { "category": "CPU", "name": "...", "price": 0, "quantity": 1, "totalPrice": 0, "reason": "..." }
  ],
  "missingCategories": [],
  "summary": "string",
  "tips": "string",
  "budgetAdvice": "string"
}
```

**What must NOT change:**
- All screen IDs: `bb-s1` through `bb-s6`
- All input IDs: `bb-budget`, `bb-extras-text`
- All button IDs: `bb-start-btn`, `bb-next-s2`, `bb-next-s3`, `bb-build-btn`, `bb-restart-btn`, `bb-close`
- All progress bar IDs: `prog-1` through `prog-4`
- The `initWidget()` → `injectStyles()` → `injectHTML()` → `bindEvents()` pattern
- The `STORE_ID`, `API`, `BRAND_COLOR`, `WIDGET_BG`, `CURRENCY`, `WIDGET_TITLE`, `WELCOME_MSG`, `BUTTON_TEXT` variables
- The `getContrastColor()` and `hexToRgba()` utility functions
- The IP rate limiter in `recommend.js`
- The limit check, cache check, store active check in `recommend.js`
- The `analyticsDB.logRecommendation()` call in `recommend.js`
- The `TEST_MODE` check in `recommend.js`

---

## PART 1: WIDGET VISUAL REDESIGN

### Design Philosophy
**"Floating Command Panel"** — Premium, dark, minimal. Feels like a Raycast or Linear panel, not a chatbot bubble. Clean card hierarchy. Breathing room. Nothing cramped. Everything intentional.

### Typography
Inject this Google Font via JS inside `injectStyles()`:
```javascript
const fontLink = document.createElement('link');
fontLink.rel  = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
document.head.appendChild(fontLink);
```
Use `font-family: 'Inter', -apple-system, sans-serif` everywhere in the widget. No Segoe UI.

### Widget Panel Dimensions
- Width: `380px`
- Max-height: `640px`
- Bottom offset: `96px` from bottom
- Right offset: `24px` from right
- Border-radius: `20px`

### Launcher Button (redesign)
```css
#bb-launcher {
  position: fixed;
  bottom: 28px;
  right: 24px;
  width: 56px;
  height: 56px;
  background: BRAND_COLOR;
  border-radius: 16px;       /* Square-ish pill, not circle */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px hexToRgba(BRAND_COLOR, 0.45), 0 2px 8px rgba(0,0,0,0.3);
  z-index: 999999;
  transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
  border: none;
  font-size: 22px;
}
#bb-launcher:hover {
  transform: scale(1.08) translateY(-2px);
  box-shadow: 0 16px 40px hexToRgba(BRAND_COLOR, 0.55), 0 4px 12px rgba(0,0,0,0.4);
}
#bb-launcher:active {
  transform: scale(0.96);
}
```

### Panel Open Animation
```css
@keyframes bb-panel-in {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}
#bb-panel.open {
  display: flex;
  animation: bb-panel-in 0.25s cubic-bezier(0.34,1.2,0.64,1) both;
}
```

### Header
```
Height: 64px
Background: hexToRgba(BRAND_COLOR, 0.95) with backdrop-filter: blur(20px)
Border-bottom: 1px solid hexToRgba(BRAND_COLOR, 0.25)
Layout: flex, space-between, center-aligned
Padding: 0 20px
```

Left side of header:
- Row 1: `⚡ [WIDGET_TITLE]` — Inter 600, 15px, full contrast color
- Row 2: `AI PC Build Recommender` — Inter 400, 11px, 60% opacity contrast color

Close button (right side):
```css
/* X button — ghost pill, not circle */
background: hexToRgba(contrastColor, 0.1);
border: 1px solid hexToRgba(contrastColor, 0.15);
border-radius: 8px;
width: 30px;
height: 30px;
color: contrastColor at 70% opacity;
font-size: 12px;
transition: background 0.15s, border-color 0.15s;
```
On hover: `background: hexToRgba(contrastColor, 0.2)`, `border-color: hexToRgba(contrastColor, 0.3)`.

### Progress Bar
Replace the 4-segment dot bar with a smooth single-track progress bar:
```css
#bb-progress {
  height: 2px;
  background: hexToRgba(BRAND_COLOR, 0.12);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
}
#bb-progress-fill {
  height: 100%;
  background: BRAND_COLOR;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  width: 0%;
}
```
Step mapping: S1=0%, S2=25%, S3=50%, S4=75%, S5=90%, S6=100%

Update `setProgress(step)` function accordingly:
```javascript
function setProgress(pct) {
  const fill = document.getElementById('bb-progress-fill');
  if (fill) fill.style.width = pct + '%';
}
```
Then update all `setProgress` calls: `goTo('s1','s2')` → `setProgress(25)`, etc.

### Body / Scroll Area
```css
#bb-body {
  padding: 24px 20px;
  overflow-y: auto;
  flex: 1;
  color: #e8e8f0;
  font-family: 'Inter', -apple-system, sans-serif;
  scroll-behavior: smooth;
}
/* Thin custom scrollbar */
#bb-body::-webkit-scrollbar { width: 3px; }
#bb-body::-webkit-scrollbar-track { background: transparent; }
#bb-body::-webkit-scrollbar-thumb {
  background: hexToRgba(BRAND_COLOR, 0.25);
  border-radius: 2px;
}
```

### Screen Transitions
Add a subtle fade+slide when switching screens:
```css
.bb-screen {
  display: none;
}
.bb-screen.active {
  display: block;
  animation: bb-screen-in 0.2s ease both;
}
@keyframes bb-screen-in {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### Typography Scale (inside widget)
```css
/* Section label */
.bb-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: hexToRgba('#ffffff', 0.35);
  margin-bottom: 10px;
  font-family: 'Inter', sans-serif;
}

/* Headings inside screens */
.bb-screen-title {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.3;
  margin-bottom: 8px;
  letter-spacing: -0.3px;
}

/* Body text */
.bb-screen-body {
  font-size: 13px;
  color: hexToRgba('#ffffff', 0.55);
  line-height: 1.7;
  margin-bottom: 24px;
}
```

### Inputs (Budget field)
```css
.bb-input {
  width: 100%;
  padding: 13px 16px;
  background: hexToRgba(WIDGET_BG, 0.5);
  border: 1px solid hexToRgba('#ffffff', 0.08);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
}
.bb-input:focus {
  border-color: BRAND_COLOR;
  background: hexToRgba(WIDGET_BG, 0.8);
  box-shadow: 0 0 0 3px hexToRgba(BRAND_COLOR, 0.12);
}
.bb-input::placeholder {
  color: hexToRgba('#ffffff', 0.2);
  font-weight: 400;
}
```

Currency badge (left side of budget row):
```css
.bb-currency {
  background: hexToRgba(BRAND_COLOR, 0.12);
  border: 1px solid hexToRgba(BRAND_COLOR, 0.25);
  border-radius: 10px;
  padding: 13px 14px;
  color: BRAND_COLOR;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}
```

### Chips (Purpose / Budget Quick-Select / Extras)
```css
.bb-chip {
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid hexToRgba('#ffffff', 0.08);
  background: hexToRgba('#ffffff', 0.04);
  color: hexToRgba('#ffffff', 0.6);
  font-size: 12px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}
.bb-chip:hover {
  border-color: hexToRgba(BRAND_COLOR, 0.5);
  color: #fff;
  background: hexToRgba(BRAND_COLOR, 0.08);
}
.bb-chip.sel {
  background: BRAND_COLOR;
  border-color: BRAND_COLOR;
  color: btnTextColor;
  box-shadow: 0 4px 14px hexToRgba(BRAND_COLOR, 0.35);
  transform: translateY(-1px);
}
```

### Primary Button (Next / Build My PC)
```css
.bb-btn {
  width: 100%;
  padding: 14px;
  background: BRAND_COLOR;
  color: btnTextColor;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  margin-top: 8px;
  letter-spacing: 0.1px;
  transition: all 0.2s cubic-bezier(0.34,1.2,0.64,1);
  box-shadow: 0 4px 16px hexToRgba(BRAND_COLOR, 0.35),
              inset 0 1px 0 hexToRgba('#ffffff', 0.15);
}
.bb-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 28px hexToRgba(BRAND_COLOR, 0.5),
              inset 0 1px 0 hexToRgba('#ffffff', 0.2);
}
.bb-btn:active { transform: translateY(0); }
.bb-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}
```

### Back Button
```css
.bb-back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: hexToRgba('#ffffff', 0.3);
  font-size: 12px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  margin-bottom: 20px;
  padding: 6px 0;
  transition: color 0.15s;
}
.bb-back:hover { color: hexToRgba('#ffffff', 0.7); }
.bb-back::before { content: '←'; font-size: 14px; }
```

### Welcome Screen (S1)
Layout: centered, text-heavy, premium.

```html
<!-- S1 HTML structure -->
<div class="bb-screen active" id="bb-s1">
  <div class="bb-welcome-wrap">
    <div class="bb-welcome-badge">⚡ AI-Powered</div>
    <div class="bb-welcome-icon">🖥️</div>
    <div class="bb-screen-title">Build Your Perfect PC</div>
    <div class="bb-screen-body">[WELCOME_MSG]</div>
    <button class="bb-btn" id="bb-start-btn">[BUTTON_TEXT] →</button>
    <div class="bb-welcome-trust">
      <span>🔒 Secure</span>
      <span>·</span>
      <span>⚡ Instant</span>
      <span>·</span>
      <span>🇵🇰 Built for Pakistan</span>
    </div>
  </div>
</div>
```

```css
.bb-welcome-wrap { text-align: center; padding: 8px 0; }
.bb-welcome-badge {
  display: inline-block;
  background: hexToRgba(BRAND_COLOR, 0.12);
  border: 1px solid hexToRgba(BRAND_COLOR, 0.25);
  color: BRAND_COLOR;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 14px;
  border-radius: 100px;
  margin-bottom: 20px;
  letter-spacing: 0.3px;
}
.bb-welcome-icon {
  font-size: 52px;
  margin-bottom: 16px;
  display: block;
}
.bb-welcome-trust {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 11px;
  color: hexToRgba('#ffffff', 0.2);
  margin-top: 16px;
  font-weight: 400;
}
```

### Budget Screen (S2)
Add a small helper text below the input:
```html
<div class="bb-input-hint">Enter your total budget in [CURRENCY]. You'll get 3 builds to choose from.</div>
```
```css
.bb-input-hint {
  font-size: 11px;
  color: hexToRgba('#ffffff', 0.25);
  margin-top: -8px;
  margin-bottom: 18px;
  line-height: 1.5;
}
```

### Purpose Screen (S3)
Add a step label above the chips:
```html
<div class="bb-step-label">Step 2 of 3</div>
<div class="bb-screen-title" style="font-size:17px;">What will you build it for?</div>
```

### Loading Screen (S5)
Replace the basic spinner with a more premium loading experience:
```html
<div class="bb-screen" id="bb-s5">
  <div class="bb-loading-wrap">
    <div class="bb-loading-ring">
      <div class="bb-ring-inner"></div>
    </div>
    <div class="bb-loading-title">Designing 3 builds for you</div>
    <div class="bb-loading-steps" id="bb-loading-steps">
      <div class="bb-load-step active" id="lsA">📦 Scanning your catalog...</div>
      <div class="bb-load-step" id="lsB">🤖 Asking the AI...</div>
      <div class="bb-load-step" id="lsC">⚡ Optimizing builds...</div>
    </div>
  </div>
</div>
```

```css
.bb-loading-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 20px 40px;
  text-align: center;
}
.bb-loading-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px solid hexToRgba(BRAND_COLOR, 0.1);
  border-top-color: BRAND_COLOR;
  animation: bb-spin 0.9s linear infinite;
  margin-bottom: 28px;
  position: relative;
}
.bb-ring-inner {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  border: 2px solid hexToRgba(BRAND_COLOR, 0.05);
  border-bottom-color: hexToRgba(BRAND_COLOR, 0.4);
  animation: bb-spin 1.4s linear infinite reverse;
}
.bb-loading-title {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 20px;
}
.bb-loading-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.bb-load-step {
  font-size: 12px;
  color: hexToRgba('#ffffff', 0.25);
  transition: color 0.3s, transform 0.3s;
}
.bb-load-step.active {
  color: hexToRgba('#ffffff', 0.7);
  transform: translateX(4px);
}
```

Animate the loading steps with JS (add this inside the `$('bb-build-btn').onclick` handler, after `goTo('s4','s5',90)` is called):
```javascript
// Animate loading steps
const steps = ['lsA','lsB','lsC'];
let stepIdx = 0;
const stepTimer = setInterval(() => {
  document.querySelectorAll('.bb-load-step').forEach(s => s.classList.remove('active'));
  if (stepIdx < steps.length) {
    const el = document.getElementById(steps[stepIdx]);
    if (el) el.classList.add('active');
    stepIdx++;
  }
}, 1200);
// Store timer ref to clear after result
window._bbStepTimer = stepTimer;
```
Then in both the success and error paths after the API returns, add:
```javascript
if (window._bbStepTimer) clearInterval(window._bbStepTimer);
```

### Powered By Footer
```css
.bb-powered {
  text-align: center;
  font-size: 10px;
  color: hexToRgba('#ffffff', 0.15);
  padding: 10px 20px 12px;
  border-top: 1px solid hexToRgba('#ffffff', 0.05);
  flex-shrink: 0;
  letter-spacing: 0.2px;
}
.bb-powered a {
  color: hexToRgba('#ffffff', 0.25);
  text-decoration: none;
  transition: color 0.15s;
}
.bb-powered a:hover { color: BRAND_COLOR; }
```

---

## PART 2: THREE BUILDS FEATURE

### 2A: `server/routes/recommend.js` Changes

**Change the AI prompt** to request three builds instead of one. Replace the `prompt` variable and the JSON format instruction:

```javascript
const prompt = `You are an expert PC build advisor for a Pakistani PC parts store.

CUSTOMER REQUIREMENTS:
- Budget: ${budget} ${currency}
- Purpose: ${purpose}
- Extras requested: ${extras || 'None'}

AVAILABLE PRODUCTS IN THIS STORE:
${productList}

YOUR TASK:
Create exactly THREE different PC build options using ONLY the products listed above.
Each build must be distinct in price tier and component balance.

BUILD TIERS TO CREATE:
1. "Budget Build" — Use 70-80% of the budget. Best value. No frills.
2. "Balanced Build" — Use 88-95% of the budget. Best performance per rupee.  
3. "Max Build" — Use as close to 100% of budget as possible. Best performance within budget.

IMPORTANT RULES:
1. ONLY use products that exist EXACTLY in the list above. Never invent products.
2. Each build must have different total prices (not the same components rearranged).
3. If budget is under 30,000 ${currency}: Set canBuild to false and explain in noBuildsReason.
4. If the store has no products affordable under budget: Set canBuild to false.
5. If you cannot make 3 distinct builds (e.g. store has too few products), make as many as you can (minimum 1).
6. QUANTITIES: You can recommend multiple units (e.g. 2x RAM). Multiply price by quantity.
7. Compatibility: Match CPU socket to motherboard, RAM type to board, PSU wattage to GPU.
8. PURPOSE OPTIMIZATION per build tier:
   - Gaming: GPU first, then CPU, then RAM
   - Video Editing: RAM (32GB if possible), CPU, fast SSD
   - Office/Studies: Value CPU, 8GB RAM, SSD — keep it cheap
   - Coding: 16GB RAM, fast CPU, SSD
   - Designing: GPU, RAM, display quality

Respond ONLY in this exact JSON format, no extra text, no markdown:
{
  "canBuild": true,
  "noBuildsReason": "",
  "builds": [
    {
      "tier": "Budget Build",
      "tagline": "One sentence — what makes this tier special",
      "buildName": "Descriptive name e.g. Entry Gaming Rig",
      "totalPrice": 0,
      "withinBudget": true,
      "budgetRemaining": 0,
      "parts": [
        {
          "category": "CPU",
          "name": "Exact product name from list",
          "price": 0,
          "quantity": 1,
          "totalPrice": 0,
          "reason": "Why this part was chosen for this build"
        }
      ],
      "missingCategories": [],
      "summary": "2-3 sentences: what this build is good for, who should pick it",
      "tips": "Compatibility notes, upgrade path, usage tips",
      "budgetAdvice": "What to do with remaining budget or why it's tight"
    },
    { ... second build ... },
    { ... third build ... }
  ]
}`;
```

**Change the AI call** `max_tokens` from `1500` to `3500` (three builds need more tokens):
```javascript
const message = await anthropic.messages.create({
  model:      'claude-3-5-haiku-20241022',
  max_tokens: 3500,
  messages:   [{ role: 'user', content: prompt }]
});
```

**Change the response** from `recommendation` to `builds`:
```javascript
// Replace this line:
const recommendation = JSON.parse(jsonMatch[0]);
await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', recommendation);
res.json({
  success: true,
  recommendation,   // ← OLD
  ...
});

// With this:
const parsed = JSON.parse(jsonMatch[0]);
// Log only the first/best build for analytics (backwards compatible)
await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', parsed.builds?.[0] || parsed);
res.json({
  success: true,
  builds:    parsed.builds || [],
  canBuild:  parsed.canBuild !== false,
  noBuildsReason: parsed.noBuildsReason || '',
  currency,
  usage: {
    used:      limitCheck.used + 1,
    limit:     limitCheck.limit,
    remaining: limitCheck.remaining - 1,
    period:    limitCheck.period
  }
});
```

**Update TEST_MODE** to return three fake builds:
```javascript
if (process.env.TEST_MODE === 'true') {
  const budgetNum = parseInt(budget);
  const fakeBuilds = [
    {
      tier: 'Budget Build',
      tagline: 'Maximum value, minimum spend',
      buildName: 'Entry Level ' + purpose + ' PC',
      totalPrice: Math.round(budgetNum * 0.75),
      withinBudget: true,
      budgetRemaining: Math.round(budgetNum * 0.25),
      parts: [
        { category: 'CPU',     name: 'Test CPU Budget',   price: Math.round(budgetNum*0.3), quantity:1, totalPrice: Math.round(budgetNum*0.3),  reason: 'Good value for ' + purpose },
        { category: 'RAM',     name: 'Test RAM 8GB',      price: Math.round(budgetNum*0.15),quantity:1, totalPrice: Math.round(budgetNum*0.15), reason: 'Minimum for smooth use' },
        { category: 'Storage', name: 'Test HDD 1TB',      price: Math.round(budgetNum*0.1), quantity:1, totalPrice: Math.round(budgetNum*0.1),  reason: 'Affordable storage' },
        { category: 'PSU',     name: 'Test PSU 450W',     price: Math.round(budgetNum*0.2), quantity:1, totalPrice: Math.round(budgetNum*0.2),  reason: 'Sufficient power' },
      ],
      missingCategories: ['Motherboard', 'Case'],
      summary: 'A basic build that covers the essentials. Best for tight budgets.',
      tips: 'AI is in TEST_MODE. Remove TEST_MODE from Railway to enable real builds.',
      budgetAdvice: 'You have budget left — consider adding a case or monitor later.'
    },
    {
      tier: 'Balanced Build',
      tagline: 'Best performance per rupee',
      buildName: 'Mid-Range ' + purpose + ' PC',
      totalPrice: Math.round(budgetNum * 0.88),
      withinBudget: true,
      budgetRemaining: Math.round(budgetNum * 0.12),
      parts: [
        { category: 'CPU',     name: 'Test CPU Mid',      price: Math.round(budgetNum*0.35),quantity:1, totalPrice: Math.round(budgetNum*0.35), reason: 'Great performance for ' + purpose },
        { category: 'RAM',     name: 'Test RAM 16GB',     price: Math.round(budgetNum*0.18),quantity:1, totalPrice: Math.round(budgetNum*0.18), reason: 'Sweet spot for multitasking' },
        { category: 'Storage', name: 'Test SSD 512GB',    price: Math.round(budgetNum*0.12),quantity:1, totalPrice: Math.round(budgetNum*0.12), reason: 'Fast NVMe storage' },
        { category: 'PSU',     name: 'Test PSU 550W',     price: Math.round(budgetNum*0.23),quantity:1, totalPrice: Math.round(budgetNum*0.23), reason: 'Headroom for upgrades' },
      ],
      missingCategories: ['GPU'],
      summary: 'The sweet spot. Best balance of performance and price for ' + purpose + '.',
      tips: 'TEST_MODE is on. This is fake data.',
      budgetAdvice: 'Small budget remaining — save for a GPU upgrade.'
    },
    {
      tier: 'Max Build',
      tagline: 'Everything your budget can buy',
      buildName: 'Full ' + purpose + ' Beast',
      totalPrice: Math.round(budgetNum * 0.97),
      withinBudget: true,
      budgetRemaining: Math.round(budgetNum * 0.03),
      parts: [
        { category: 'CPU',     name: 'Test CPU High-End', price: Math.round(budgetNum*0.38),quantity:1, totalPrice: Math.round(budgetNum*0.38), reason: 'Top performance for ' + purpose },
        { category: 'GPU',     name: 'Test GPU',          price: Math.round(budgetNum*0.3), quantity:1, totalPrice: Math.round(budgetNum*0.3),  reason: 'Handles demanding tasks' },
        { category: 'RAM',     name: 'Test RAM 32GB',     price: Math.round(budgetNum*0.15),quantity:1, totalPrice: Math.round(budgetNum*0.15), reason: 'Maximum RAM for future proofing' },
        { category: 'Storage', name: 'Test NVMe 1TB',     price: Math.round(budgetNum*0.14),quantity:1, totalPrice: Math.round(budgetNum*0.14), reason: 'Fast and spacious' },
      ],
      missingCategories: [],
      summary: 'Maximum performance within your budget. Built to last. Ideal for serious ' + purpose + '.',
      tips: 'TEST_MODE is on. Remove TEST_MODE from Railway env to get real AI builds.',
      budgetAdvice: 'Budget nearly fully used. You\'re getting the most out of your money.'
    }
  ];
  await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', fakeBuilds[1]);
  return res.json({
    success: true,
    builds: fakeBuilds,
    canBuild: true,
    noBuildsReason: '',
    currency,
    usage: {
      used:      limitCheck.used + 1,
      limit:     limitCheck.limit,
      remaining: limitCheck.remaining - 1,
      period:    limitCheck.period
    }
  });
}
```

**Update the cache handling** (getCachedRecommendation returns old single-build format — handle gracefully):
```javascript
// After the cache check, update the return to match new format:
if (cachedRec) {
  await analyticsDB.logRecommendation(storeId, budget, purpose, extras || '', cachedRec);
  // If cached rec is old single-build format (has .buildName), wrap it
  const isOldFormat = cachedRec.buildName !== undefined && !cachedRec.builds;
  return res.json({
    success: true,
    builds:   isOldFormat ? [{ ...cachedRec, tier: 'Recommended Build', tagline: 'Previously generated recommendation' }] : (cachedRec.builds || [cachedRec]),
    canBuild: true,
    noBuildsReason: '',
    currency,
    cached: true,
    usage: {
      used:      limitCheck.used + 1,
      limit:     limitCheck.limit,
      remaining: limitCheck.remaining - 1,
      period:    limitCheck.period
    }
  });
}
```

---

### 2B: `server/widget.js` — Results Screen Redesign

#### S6 Results — Three Build Cards

The S6 screen now shows three selectable build cards instead of one build detail. Clicking a card opens a full-screen detail modal.

**S6 HTML** (inside `injectHTML()`):
```html
<!-- S6: Results -->
<div class="bb-screen" id="bb-s6">
  <div id="bb-results"></div>
  <button class="bb-restart" id="bb-restart-btn">↩ Start Over</button>
</div>
```

**The detail modal** (add outside `#bb-panel`, as a sibling):
```html
<!-- Build Detail Modal (outside panel) -->
<div id="bb-modal-overlay">
  <div id="bb-modal-panel">
    <div id="bb-modal-header">
      <div>
        <div id="bb-modal-tier-badge"></div>
        <div id="bb-modal-title"></div>
        <div id="bb-modal-tagline"></div>
      </div>
      <button id="bb-modal-close">✕</button>
    </div>
    <div id="bb-modal-body">
      <div id="bb-modal-content"></div>
    </div>
  </div>
</div>
```

**Modal CSS:**
```css
#bb-modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 9999999;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
}
#bb-modal-overlay.open {
  display: flex;
  animation: bb-overlay-in 0.25s ease both;
}
@keyframes bb-overlay-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
#bb-modal-panel {
  background: WIDGET_BG;
  border: 1px solid hexToRgba(BRAND_COLOR, 0.2);
  border-radius: 24px 24px 0 0;
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Inter', -apple-system, sans-serif;
  animation: bb-modal-in 0.3s cubic-bezier(0.34,1.1,0.64,1) both;
  box-shadow: 0 -20px 60px rgba(0,0,0,0.5);
}
@keyframes bb-modal-in {
  from { transform: translateY(40px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
#bb-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 24px 20px;
  border-bottom: 1px solid hexToRgba('#ffffff', 0.06);
  flex-shrink: 0;
  background: hexToRgba(BRAND_COLOR, 0.07);
}
#bb-modal-tier-badge {
  display: inline-block;
  background: hexToRgba(BRAND_COLOR, 0.15);
  border: 1px solid hexToRgba(BRAND_COLOR, 0.3);
  color: BRAND_COLOR;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  padding: 4px 12px;
  border-radius: 100px;
  margin-bottom: 10px;
}
#bb-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
  letter-spacing: -0.3px;
}
#bb-modal-tagline {
  font-size: 13px;
  color: hexToRgba('#ffffff', 0.45);
  line-height: 1.5;
}
#bb-modal-close {
  background: hexToRgba('#ffffff', 0.07);
  border: 1px solid hexToRgba('#ffffff', 0.1);
  border-radius: 10px;
  width: 34px;
  height: 34px;
  color: hexToRgba('#ffffff', 0.5);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  flex-shrink: 0;
  margin-top: 4px;
}
#bb-modal-close:hover {
  background: hexToRgba('#ffffff', 0.12);
  color: #fff;
}
#bb-modal-body {
  overflow-y: auto;
  flex: 1;
  padding: 20px 24px 32px;
}
#bb-modal-body::-webkit-scrollbar { width: 3px; }
#bb-modal-body::-webkit-scrollbar-thumb {
  background: hexToRgba(BRAND_COLOR, 0.3);
  border-radius: 2px;
}
```

**Build cards CSS (shown in S6):**
```css
.bb-build-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}
.bb-build-card {
  background: hexToRgba('#ffffff', 0.03);
  border: 1px solid hexToRgba('#ffffff', 0.07);
  border-radius: 14px;
  padding: 16px 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}
.bb-build-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: BRAND_COLOR;
  opacity: 0;
  transition: opacity 0.2s;
}
.bb-build-card:hover {
  border-color: hexToRgba(BRAND_COLOR, 0.4);
  background: hexToRgba(BRAND_COLOR, 0.06);
  transform: translateX(2px);
}
.bb-build-card:hover::before { opacity: 1; }
.bb-build-card.featured {
  border-color: hexToRgba(BRAND_COLOR, 0.35);
  background: hexToRgba(BRAND_COLOR, 0.08);
}
.bb-build-card.featured::before { opacity: 1; }

.bb-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.bb-card-tier-badge {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: BRAND_COLOR;
  background: hexToRgba(BRAND_COLOR, 0.1);
  padding: 3px 10px;
  border-radius: 100px;
  border: 1px solid hexToRgba(BRAND_COLOR, 0.2);
}
.bb-card-price {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  letter-spacing: -0.4px;
}
.bb-card-name {
  font-size: 14px;
  font-weight: 600;
  color: hexToRgba('#ffffff', 0.85);
  margin-bottom: 4px;
}
.bb-card-tagline {
  font-size: 12px;
  color: hexToRgba('#ffffff', 0.35);
  margin-bottom: 10px;
  line-height: 1.4;
}
.bb-card-parts-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 12px;
}
.bb-card-part-pill {
  font-size: 10px;
  font-weight: 500;
  color: hexToRgba('#ffffff', 0.4);
  background: hexToRgba('#ffffff', 0.04);
  border: 1px solid hexToRgba('#ffffff', 0.07);
  padding: 3px 10px;
  border-radius: 100px;
}
.bb-card-cta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid hexToRgba('#ffffff', 0.05);
}
.bb-card-cta-text {
  font-size: 12px;
  font-weight: 600;
  color: BRAND_COLOR;
}
.bb-card-cta-arrow {
  font-size: 14px;
  color: BRAND_COLOR;
  transition: transform 0.15s;
}
.bb-build-card:hover .bb-card-cta-arrow { transform: translateX(3px); }

/* Budget remaining / within budget badge */
.bb-card-budget-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 100px;
  margin-bottom: 10px;
}
.bb-card-budget-tag.within {
  background: rgba(0,196,140,0.1);
  border: 1px solid rgba(0,196,140,0.25);
  color: #00c48c;
}
.bb-card-budget-tag.over {
  background: rgba(240,82,82,0.1);
  border: 1px solid rgba(240,82,82,0.25);
  color: #f05252;
}

/* Results screen header */
.bb-results-header {
  margin-bottom: 16px;
}
.bb-results-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}
.bb-results-sub {
  font-size: 12px;
  color: hexToRgba('#ffffff', 0.35);
  line-height: 1.5;
}

/* Restart button */
.bb-restart {
  width: 100%;
  padding: 12px;
  background: transparent;
  color: hexToRgba('#ffffff', 0.3);
  border: 1px solid hexToRgba('#ffffff', 0.07);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}
.bb-restart:hover {
  background: hexToRgba('#ffffff', 0.04);
  color: hexToRgba('#ffffff', 0.6);
  border-color: hexToRgba('#ffffff', 0.15);
}

/* No-builds / apology state */
.bb-no-builds {
  text-align: center;
  padding: 32px 12px;
}
.bb-no-builds-icon { font-size: 44px; margin-bottom: 16px; display: block; }
.bb-no-builds-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}
.bb-no-builds-msg {
  font-size: 13px;
  color: hexToRgba('#ffffff', 0.45);
  line-height: 1.7;
  margin-bottom: 20px;
}
.bb-no-builds-suggestion {
  font-size: 12px;
  color: hexToRgba('#ffffff', 0.25);
  background: hexToRgba('#ffffff', 0.03);
  border: 1px solid hexToRgba('#ffffff', 0.07);
  border-radius: 10px;
  padding: 12px 14px;
  line-height: 1.6;
  text-align: left;
}
```

**Modal detail content CSS:**
```css
/* Inside modal body */
.bb-modal-summary {
  font-size: 14px;
  color: hexToRgba('#ffffff', 0.6);
  line-height: 1.75;
  margin-bottom: 24px;
  padding: 14px 16px;
  background: hexToRgba('#ffffff', 0.03);
  border-radius: 10px;
  border-left: 3px solid BRAND_COLOR;
}
.bb-modal-section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.2px;
  text-transform: uppercase;
  color: hexToRgba('#ffffff', 0.3);
  margin-bottom: 10px;
  margin-top: 20px;
}
.bb-modal-part {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  background: hexToRgba('#ffffff', 0.03);
  border: 1px solid hexToRgba('#ffffff', 0.06);
  border-radius: 11px;
  margin-bottom: 6px;
  transition: border-color 0.15s;
}
.bb-modal-part:hover { border-color: hexToRgba(BRAND_COLOR, 0.25); }
.bb-modal-part-cat {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
  text-transform: uppercase;
  color: hexToRgba('#ffffff', 0.3);
  background: hexToRgba('#ffffff', 0.05);
  padding: 4px 9px;
  border-radius: 6px;
  white-space: nowrap;
  margin-top: 1px;
  flex-shrink: 0;
  min-width: 52px;
  text-align: center;
}
.bb-modal-part-info { flex: 1; min-width: 0; }
.bb-modal-part-name {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bb-modal-part-reason {
  font-size: 11px;
  color: hexToRgba('#ffffff', 0.35);
  line-height: 1.5;
}
.bb-modal-part-qty {
  font-size: 10px;
  color: #f0ad52;
  font-weight: 600;
}
.bb-modal-part-price {
  font-size: 13px;
  font-weight: 700;
  color: BRAND_COLOR;
  white-space: nowrap;
  flex-shrink: 0;
}
.bb-modal-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 18px;
  border-radius: 12px;
  margin: 16px 0 6px;
}
.bb-modal-total.within {
  background: rgba(0,196,140,0.08);
  border: 1px solid rgba(0,196,140,0.2);
}
.bb-modal-total.over {
  background: rgba(240,82,82,0.08);
  border: 1px solid rgba(240,82,82,0.2);
}
.bb-modal-total-label { font-size: 13px; color: hexToRgba('#ffffff', 0.5); }
.bb-modal-total-price {
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
}
.bb-modal-total.within .bb-modal-total-price { color: #00c48c; }
.bb-modal-total.over   .bb-modal-total-price { color: #f05252; }
.bb-modal-remaining {
  text-align: right;
  font-size: 12px;
  color: #00c48c;
  margin-bottom: 8px;
}
.bb-modal-tips {
  font-size: 12px;
  color: hexToRgba('#ffffff', 0.45);
  line-height: 1.7;
  padding: 12px 14px;
  background: hexToRgba(BRAND_COLOR, 0.06);
  border-left: 2px solid hexToRgba(BRAND_COLOR, 0.4);
  border-radius: 0 8px 8px 0;
  margin-bottom: 10px;
}
.bb-modal-missing {
  font-size: 12px;
  color: #f0ad52;
  padding: 10px 14px;
  background: rgba(240,173,82,0.07);
  border: 1px solid rgba(240,173,82,0.2);
  border-radius: 8px;
  margin-bottom: 10px;
  line-height: 1.5;
}
```

---

### 2C: Widget JS — `renderResults()` and `openBuildModal()` Functions

Replace the existing `renderResults()` function entirely, and add a new `openBuildModal()` function. Both go at the bottom of the IIFE, replacing the old `renderResults` and `renderError`.

```javascript
// ─── RENDER THREE BUILD CARDS ─────────────────────────────
function renderResults(builds, currency, canBuild, noBuildsReason) {
  const container = document.getElementById('bb-results');

  // ── No builds possible ──
  if (!canBuild || !builds || builds.length === 0) {
    container.innerHTML = `
      <div class="bb-no-builds">
        <span class="bb-no-builds-icon">😔</span>
        <div class="bb-no-builds-title">Sorry, we couldn't build a PC for this budget.</div>
        <div class="bb-no-builds-msg">
          ${noBuildsReason || "The products available in this store aren't enough to build a complete PC within your budget right now."}
        </div>
        <div class="bb-no-builds-suggestion">
          💡 Try increasing your budget, or contact the store directly — they may be able to help you find the right parts.
        </div>
      </div>`;
    return;
  }

  // ── Build cards ──
  const cardsHtml = builds.map((build, i) => {
    const isFeatured = i === 1; // Middle build = featured / "Balanced"
    const isOver     = !build.withinBudget;

    // Parts preview — show first 4 categories as pills
    const previewParts = (build.parts || []).slice(0, 4)
      .map(p => `<span class="bb-card-part-pill">${p.category}</span>`)
      .join('');

    return `
      <div class="bb-build-card ${isFeatured ? 'featured' : ''}" data-build-idx="${i}">
        <div class="bb-card-top">
          <span class="bb-card-tier-badge">${build.tier || 'Build ' + (i+1)}</span>
          <span class="bb-card-price">${currency} ${Number(build.totalPrice).toLocaleString()}</span>
        </div>
        <div class="bb-card-name">${build.buildName}</div>
        <div class="bb-card-tagline">${build.tagline || build.summary || ''}</div>
        <span class="bb-card-budget-tag ${isOver ? 'over' : 'within'}">
          ${isOver
            ? '⚠️ Slightly over budget'
            : build.budgetRemaining > 0
              ? `✓ ${currency} ${Number(build.budgetRemaining).toLocaleString()} remaining`
              : '✓ Within budget'
          }
        </span>
        <div class="bb-card-parts-preview">${previewParts}</div>
        <div class="bb-card-cta">
          <span class="bb-card-cta-text">View full build</span>
          <span class="bb-card-cta-arrow">→</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="bb-results-header">
      <div class="bb-results-title">⚡ ${builds.length} Builds Ready</div>
      <div class="bb-results-sub">Tap any build to see full details, parts list, and prices.</div>
    </div>
    <div class="bb-build-cards">${cardsHtml}</div>`;

  // ── Bind card click → open modal ──
  container.querySelectorAll('.bb-build-card').forEach(card => {
    card.onclick = () => {
      const idx   = parseInt(card.dataset.buildIdx);
      openBuildModal(builds[idx], currency);
    };
  });
}

// ─── OPEN BUILD DETAIL MODAL ──────────────────────────────
function openBuildModal(build, currency) {
  const overlay = document.getElementById('bb-modal-overlay');
  const isOver  = !build.withinBudget;

  // Header
  document.getElementById('bb-modal-tier-badge').textContent = build.tier || 'Recommended Build';
  document.getElementById('bb-modal-title').textContent      = build.buildName;
  document.getElementById('bb-modal-tagline').textContent    = build.tagline || '';

  // Parts list
  const partsHtml = (build.parts || []).map(p => {
    const qty        = p.quantity || 1;
    const totalPrice = p.totalPrice || (p.price * qty);
    return `
      <div class="bb-modal-part">
        <div class="bb-modal-part-cat">${p.category}</div>
        <div class="bb-modal-part-info">
          <div class="bb-modal-part-name">${p.name}</div>
          ${qty > 1 ? `<div class="bb-modal-part-qty">× ${qty} units</div>` : ''}
          <div class="bb-modal-part-reason">${p.reason || ''}</div>
        </div>
        <div class="bb-modal-part-price">${currency} ${Number(totalPrice).toLocaleString()}</div>
      </div>`;
  }).join('');

  const missingHtml = (build.missingCategories || []).length
    ? `<div class="bb-modal-missing">⚠️ Not available in store: ${build.missingCategories.join(', ')}</div>`
    : '';

  document.getElementById('bb-modal-content').innerHTML = `
    <div class="bb-modal-summary">${build.summary || ''}</div>

    <div class="bb-modal-section-label">Components</div>
    ${partsHtml}
    ${missingHtml}

    <div class="bb-modal-total ${isOver ? 'over' : 'within'}">
      <div class="bb-modal-total-label">${isOver ? '⚠️ Over budget' : '✅ Total Cost'}</div>
      <div class="bb-modal-total-price">${currency} ${Number(build.totalPrice).toLocaleString()}</div>
    </div>
    ${build.budgetRemaining > 0
      ? `<div class="bb-modal-remaining">↳ ${currency} ${Number(build.budgetRemaining).toLocaleString()} remains from your budget</div>`
      : ''}
    ${build.tips
      ? `<div class="bb-modal-section-label">Tips & Notes</div><div class="bb-modal-tips">💡 ${build.tips}</div>`
      : ''}
    ${build.budgetAdvice
      ? `<div class="bb-modal-tips">💰 ${build.budgetAdvice}</div>`
      : ''}`;

  overlay.classList.add('open');

  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  };
}

// ─── RENDER ERROR ─────────────────────────────────────────
function renderError(msg, limitReached) {
  document.getElementById('bb-results').innerHTML = `
    <div class="bb-no-builds">
      <span class="bb-no-builds-icon">${limitReached ? '⏳' : '😔'}</span>
      <div class="bb-no-builds-title">${limitReached ? 'Limit Reached' : 'Something went wrong'}</div>
      <div class="bb-no-builds-msg">${msg || "We couldn't generate recommendations right now."}</div>
      <div class="bb-no-builds-suggestion">Please try again later or contact the store directly.</div>
    </div>`;
}
```

---

### 2D: Update `bindEvents()` — Wire Up the New API Response + Modal Close

**In `$('bb-build-btn').onclick`**, update the API call handling:

```javascript
// Replace the existing success block:
if (data.success) {
  // OLD: renderResults(data.recommendation, data.currency || CURRENCY);
  // NEW:
  renderResults(
    data.builds || [],
    data.currency || CURRENCY,
    data.canBuild !== false,
    data.noBuildsReason || ''
  );
} else {
  renderError(data.error || 'Something went wrong.', data.limitReached);
}
```

**Add modal close button binding** inside `bindEvents()`, after all existing bindings:
```javascript
// Modal close button
const modalClose = document.getElementById('bb-modal-close');
if (modalClose) {
  modalClose.onclick = () => {
    document.getElementById('bb-modal-overlay').classList.remove('open');
  };
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('bb-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }
});
```

---

## PART 3: FINAL CHECKLIST

Before finishing, verify every item:

**`recommend.js`:**
- [ ] Prompt asks for 3 builds in Budget / Balanced / Max tiers
- [ ] `max_tokens` is `3500`
- [ ] Response returns `{ success, builds, canBuild, noBuildsReason, currency, usage }`
- [ ] TEST_MODE returns 3 fake builds matching the new shape
- [ ] Cache handling wraps old single-build format gracefully
- [ ] `analyticsDB.logRecommendation()` still called with `builds[0]` (or first build)
- [ ] IP rate limiter untouched
- [ ] Store active check untouched
- [ ] Limit check untouched

**`widget.js`:**
- [ ] `STORE_ID`, `API`, all brand variables unchanged
- [ ] `getContrastColor()` and `hexToRgba()` unchanged
- [ ] `initWidget()` → `injectStyles()` → `injectHTML()` → `bindEvents()` pattern unchanged
- [ ] All screen IDs (`bb-s1` through `bb-s6`) present
- [ ] All input IDs (`bb-budget`, `bb-extras-text`) present
- [ ] All button IDs (`bb-start-btn`, `bb-next-s2`, `bb-next-s3`, `bb-build-btn`, `bb-restart-btn`, `bb-close`) present
- [ ] `#bb-modal-overlay` and `#bb-modal-panel` injected as siblings of `#bb-panel`
- [ ] `renderResults()` renders 3 build cards, each clickable
- [ ] Clicking a card calls `openBuildModal(build, currency)`
- [ ] Modal shows: tier badge, build name, tagline, summary, all parts with reasons, total price, remaining budget, tips
- [ ] Modal close button (`#bb-modal-close`) works
- [ ] Clicking outside modal (on overlay) closes it
- [ ] Escape key closes modal
- [ ] `canBuild: false` shows the apology/no-builds state (not a crash)
- [ ] Loading screen has animated step text (lsA → lsB → lsC)
- [ ] Progress bar is a single fill track, not 4 dots
- [ ] Inter font injected via JS
- [ ] Widget launcher is a rounded square (border-radius: 16px), not a circle
- [ ] Screen transitions use the `bb-screen-in` animation
