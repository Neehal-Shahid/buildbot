# BuildBot Dashboard Debug Findings

Date: 2026-04-27
Scope: `dashboard/index.html`

## Executive Summary

- No syntax errors or linter errors were detected.
- Two runtime-risk issues were identified and fixed safely.
- Additional non-breaking improvement opportunities are listed below.

## Errors Found and Fixed

### 1) Landing navigation could throw null errors outside landing

- **Issue**: Multiple `onclick` handlers called `document.getElementById('...').scrollIntoView(...)` directly.
- **Risk**: If user clicks those links while not on landing, target sections may not be present/active and can cause runtime errors.
- **Fix Applied**:
  - Added helper `scrollToLandingSection(sectionId)`.
  - Helper first ensures landing is active via `showPage('landing')`, then scrolls safely.
  - Updated nav/footer/hero "See How It Works" handlers to use helper.
- **Status**: Fixed.

### 2) Duplicate settings loader call

- **Issue**: `showTab('settings')` called `loadWidgetSettings()` twice.
- **Risk**: Redundant network/UI work, potential inconsistent render timing.
- **Fix Applied**:
  - Removed duplicate call and kept a single settings block:
    - `loadWidgetSettings()`
    - `loadWooStatus()`
- **Status**: Fixed.

## Current Health Check

- Lint diagnostics: **No errors** in `dashboard/index.html`.
- Password toggle function:
  - Works for signup/login/change password fields.
  - Icon and accessibility label now switch correctly between show/hide states.

## Recommended Improvements (Safe, Non-Breaking)

1. **Guard optional DOM listeners**
   - Some startup listeners use direct `getElementById(...).addEventListener(...)`.
   - Consider optional chaining on all (`?.addEventListener`) for future-proofing if IDs change.

2. **Centralize repeated inline onclick logic**
   - Replace inline handlers gradually with JS event delegation for easier maintenance and fewer regressions.

3. **Add small UI regression checklist**
   - Validate: landing nav links, signup/login toggles, settings tab load, and section reveal animations after each style refactor.

4. **Performance polish**
   - Keep animated shadows/transforms only on hover-visible cards (already mostly done) to preserve smoothness on low-end devices.

## Manual Test Checklist

- [ ] From landing: click Features/Pricing links (top nav + footer) and verify smooth scroll.
- [ ] From login/signup: click nav Features/Pricing and verify it switches to landing then scrolls.
- [ ] Toggle password visibility in signup, login, and change-password modal/section.
- [ ] Open Settings tab and verify widget settings load once and Woo status loads.
- [ ] Scroll landing page and confirm reveal animations trigger section-by-section.

## Second Debug Pass (Auth + Landing Motion)

### Additional Risks Found and Fixed

1. **Potential null-pointer crashes in startup listeners**
   - **Issue**: Several `getElementById(...).addEventListener(...)` calls were unguarded.
   - **Fix**: Converted to optional chaining and guarded dependent elements before property writes.
   - **Impact**: Prevents app boot failures if any settings controls are absent/renamed.

2. **Auth page scroll behavior not locked**
   - **Issue**: signup/login/forgot pages could still scroll depending on viewport/content.
   - **Fix**:
     - Added page mode classes on route switch:
       - `body.auth-locked`
       - `body.landing-mode`
     - Set auth pages to viewport-locked height and hidden overflow.
   - **Impact**: Auth screens now remain fixed and non-scrollable as requested.

3. **No landing scroll position feedback**
   - **Issue**: Long landing lacked progress feedback.
   - **Fix**:
     - Added fixed right-side vertical progress indicator.
     - Implemented `updateLandingProgress()` on scroll/resize/page-switch.
   - **Impact**: Clear visual indication of reading progress through the page.

4. **Static card interaction feel**
   - **Issue**: Premium sections still felt mostly static.
   - **Fix**:
     - Added lightweight 3D mouse-parallax on hero and widget cards via `initInteractiveEffects()`.
   - **Impact**: Landing feels more alive and modern without external libraries.

### Notes

- No third-party libraries were installed; all effects are native CSS/JS.
- This keeps bundle/runtime stable and avoids dependency regressions.

## Deep Debugging Pass (Dashboard + Admin + API)

### Fixed in this pass

1. **False 500s after successful product mutations**
   - File: `server/routes/upload.js`
   - Cause: `storeDB` used but not imported.
   - Fix: Added `storeDB` import.

2. **Woo disconnect broken in dashboard**
   - Files: `dashboard/index.html`, `server/routes/plugin.js`
   - Cause: frontend attempted browser-side SQL via undefined `client`.
   - Fix: Added authenticated backend endpoint `POST /api/plugin/disconnect` and updated frontend to call it.

3. **Google auth redirect crash**
   - File: `dashboard/index.html`
   - Cause: called undefined `initApp()`.
   - Fix: switched to `enterApp()`.

4. **Session reliability issue after login**
   - File: `dashboard/index.html`
   - Cause: app rendered in `enterApp()` even when `/me` failed.
   - Fix: converted to strict `async/await`; only enter app on successful `/me`, otherwise force re-login.

5. **Overbroad localStorage clearing**
   - File: `dashboard/index.html`
   - Cause: `localStorage.clear()` removed unrelated data.
   - Fix: replaced with targeted key removals (`bb_token`, `bb_store`).

6. **Corrupt localStorage parse crash risk**
   - File: `dashboard/index.html`
   - Fix: added safe parser `readStoreFromStorage()` with fallback cleanup.

7. **Admin reset token expiry mismatch**
   - File: `server/database.js`
   - Cause: `admin_reset` treated as 24h token.
   - Fix: `admin_reset` now expires in 1 hour (same as reset).

8. **Email verification not enforced on login**
   - File: `server/routes/auth.js`
   - Fix: added `verifyDB.isVerified(email)` gate in `/login` with clear user-facing error.

9. **Admin UI XSS/inline JS break risk**
   - File: `dashboard/admin.html`
   - Cause: unescaped dynamic values interpolated into inline `onclick` and HTML.
   - Fix: added `safeText()` and URI-encoding/decoding for names in action handlers.

10. **Pending-payment alert stale state**
    - File: `dashboard/admin.html`
    - Fix: explicit `else` branch now hides badge/card and clears pending rows when none remain.

11. **Config inconsistency for verify/reset pages**
    - Files: `dashboard/verify.html`, `dashboard/reset-password.html`
    - Fix: both now load `config.js` and use `window.BB_API`.

12. **Recommend API weak budget validation**
    - File: `server/routes/recommend.js`
    - Fix: strict numeric budget validation + normalized numeric usage in cache/logging/prompt.

## Deep Debugging Pass 2 (Database + Delete Reliability)

### Database/backend issues fixed

1. **Non-deterministic cascade behavior on store delete paths**
   - Root issue: not all delete flows used explicit cleanup (some depended on FK cascade behavior).
   - Fix:
     - Added `storeDB.deleteStoreAndData(storeId)` in `server/database.js`.
     - It performs ordered cleanup of recommendations, payments, products, trial email records, tokens, then store row using a single batch write.
     - Wired both:
       - `POST /admin/delete-store` (admin path)
       - `DELETE /account` (store-owner self-delete path)

2. **Admin delete-store robustness**
   - File: `server/routes/admin.js`
   - Fixes:
     - `storeId` now trimmed/validated.
     - Returns `404` when store does not exist.
     - Uses shared DB cleanup method instead of duplicated ad-hoc queries.

3. **Admin performance bottleneck on overview/stores**
   - File: `server/routes/admin.js`
   - Root issue: N+1 query loops per store for product/recommendation counts.
   - Fix:
     - Added `enrichStoresWithCounts()` with grouped count queries over all store IDs.
     - Applied in both `/admin/overview` and `/admin/stores`.
   - Result: reduced DB round-trips and improved admin page load reliability.

4. **Admin JWT secret fallback inconsistency**
   - File: `server/routes/admin.js`
   - Fix: `JWT_SECRET` now has fallback (`buildbot-secret`) to avoid runtime failures in local/misconfigured environments.

## Deep Debugging Pass 3 (DB Audit + Plugin Reliability)

### Added

1. **Admin DB integrity audit endpoint**
   - File: `server/routes/admin.js`
   - Endpoint: `GET /admin/db-audit` (admin-token required)
   - Output: table counts + orphan checks + token hygiene counters

2. **Admin “DB Health” UI**
   - File: `dashboard/admin.html`
   - Added a `DB Health` tab to run the audit and render a readable report.

### Fixed

1. **WooCommerce plugin disconnect cleanup**
   - Files: `plugin/buildbot-woocommerce/buildbot-woocommerce.php`, `plugin/buildbot-woocommerce.php`
   - Disconnect now resets stale “connected state” stats (last sync, counts, category stats) so the WP admin UI stays consistent.

2. **WooCommerce product delete hook reliability**
   - Files: `plugin/buildbot-woocommerce/buildbot-woocommerce.php`, `plugin/buildbot-woocommerce.php`
   - `wp_trash_post` can fire when `wc_get_product()` returns null; we now fall back to the WP post title so delete events still reach the backend.

3. **Plugin auto-update version mismatch**
   - File: `server/plugin-update.json`
   - Issue: manifest version was ahead of the shipped plugin version (`BUILDBOT_VERSION`), causing WordPress to always prompt an update.
   - Fix: aligned manifest `"version"` to `1.5.0` to match the current plugin files.

## UX Pass (Admin + Dashboard)

### Improvements

1. **Dashboard sidebar cleanup**
   - File: `dashboard/index.html`
   - Sidebar is now a proper flex column (no absolute-positioned logout) with small section separators for clearer information hierarchy.

2. **Standardized empty states**
   - File: `dashboard/index.html`
   - Added reusable `.empty-state` styling and applied it to the Products table empty case for a cleaner, more “real SaaS” feel.

3. **Admin sidebar grouping**
   - File: `dashboard/admin.html`
   - Added small section separators (“Platform”, “Admin”) and flex-column sidebar spacing to reduce visual clutter.

4. **Consistent loading/empty/error states**
   - File: `dashboard/index.html`
   - Analytics charts now show Loading/No data/Error states instead of staying stale.
   - Billing “Payment History” now shows Loading + a premium empty state when there are no payments, plus a clear error message on failure.

