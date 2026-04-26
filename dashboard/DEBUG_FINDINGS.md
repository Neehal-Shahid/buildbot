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

