(function () {
  const script =
    document.currentScript || document.querySelector("script[data-store-id]");
  const STORE_ID = script ? script.getAttribute("data-store-id") : null;

  function resolveApiBase() {
    const explicit = script?.getAttribute("data-api-url");
    if (explicit) return explicit.replace(/\/$/, "");
    if (script?.src) {
      try {
        return new URL(script.src).origin + "/api";
      } catch (_) {
        /* fall through */
      }
    }
    return "https://buildbot-production-3f70.up.railway.app/api";
  }

  const API = resolveApiBase();

  let BRAND_COLOR = "#7c6af7";
  let WIDGET_BG = "#0f1117"; // Default; can be overridden per-store via store-config
  let CURRENCY = "PKR";
  let WIDGET_TITLE = "BuildVolt";
  let WELCOME_MSG =
    "Tell me your budget — I'll show you every compatible PC build this store can offer, from the cheapest option up to your max.";
  let BUTTON_TEXT = "Get Started";

  // Store build data for PDF access
  let _lastBuilds = [];
  let _lastCurrency = "PKR";
  let _currentBuild = null;
  let _budgetPresets = [50000, 80000, 120000, 200000];
  // Kept so "Order This Build" can ask the server to recompute the exact
  // same build fresh (see placeOrderForBuild) — never trust prices already
  // sitting in the page by the time the customer clicks order.
  let _lastBudget = null;

  // Ordering: WooCommerce-connected stores get one-click cart checkout;
  // everyone else falls back to a WhatsApp order handoff if the store set
  // one up. See store-config's wooConnected/wooUrl/whatsappNumber.
  let ORDER_METHOD = "none"; // "woo" | "whatsapp" | "none"
  let WOO_URL = "";
  let WHATSAPP_NUMBER = "";

  if (!STORE_ID) {
    console.error("BuildVolt: No data-store-id found.");
    return;
  }

  // ─── AUTO CONTRAST ────────────────────────────────────────
  function getContrastColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  }

  // ─── HTML ESCAPING ────────────────────────────────────────
  // Every string below is either store-editable (widget title/welcome
  // text) or ultimately traces back to a product row a store owner
  // uploaded/typed (name, category, description-derived reason text) or a
  // customer-submitted budget/purpose — none of it is safe to drop into
  // innerHTML unescaped. A product named `<img src=x onerror=...>` (from
  // a CSV/PDF bulk import, or any store account, malicious or
  // compromised) would otherwise execute in every visitor's browser who
  // views a build containing it. Applied at each interpolation site
  // rather than at the source, since some of these same values (e.g.
  // WIDGET_TITLE in the WhatsApp order message) are also used as plain
  // text where HTML-escaping them would be wrong.
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[ch]);
  }

  // ─── INIT ─────────────────────────────────────────────────
  async function initWidget() {
    try {
      const res = await fetch(`${API}/store-config/${STORE_ID}`);
      const storeConfig = await res.json();

      if (!res.ok || storeConfig.success === false) {
        return;
      }

      if (storeConfig.active === false || storeConfig.widgetEnabled === false) {
        return;
      }

      if (storeConfig.brandColor) BRAND_COLOR = storeConfig.brandColor;
      if (storeConfig.widgetBg) WIDGET_BG = storeConfig.widgetBg;
      if (storeConfig.currency) CURRENCY = storeConfig.currency;
      if (storeConfig.widgetTitle) WIDGET_TITLE = storeConfig.widgetTitle;
      if (storeConfig.welcomeMsg) WELCOME_MSG = storeConfig.welcomeMsg;
      if (storeConfig.buttonText) BUTTON_TEXT = storeConfig.buttonText;

      if (storeConfig.wooConnected && storeConfig.wooUrl) {
        ORDER_METHOD = "woo";
        WOO_URL = String(storeConfig.wooUrl).replace(/\/$/, "");
      } else if (storeConfig.whatsappNumber) {
        ORDER_METHOD = "whatsapp";
        WHATSAPP_NUMBER = storeConfig.whatsappNumber;
      }

      // Store budget presets for later use
      if (
        storeConfig.budgetPresets &&
        Array.isArray(storeConfig.budgetPresets)
      ) {
        _budgetPresets = storeConfig.budgetPresets;
      }

      injectStyles();
      injectHTML();
      bindEvents();
    } catch (err) {
      console.error("BuildVolt: Failed to load store config.", err);
    }
  }

  // ─── STYLES ───────────────────────────────────────────────
  function injectStyles() {
    const btnTextColor = getContrastColor(BRAND_COLOR);
    const borderRgba = hexToRgba(BRAND_COLOR, 0.2);

    // Dynamic Variables
    const s = document.createElement("style");
    s.textContent = `
      :root, #bb-launcher, #bb-panel, #bb-modal-overlay, #bb-modal-panel {
        --bb-brand: ${BRAND_COLOR};
        --bb-brand-rgb: ${hexToRgb(BRAND_COLOR)};
        --bb-bg: ${WIDGET_BG};
        --bb-bg-rgb: ${hexToRgb(WIDGET_BG)};
        --bb-btn-text: ${btnTextColor};
        --bb-contrast-rgb: ${hexToRgb(btnTextColor)};
        --bb-border: ${borderRgba};
      }
    `;
    document.head.appendChild(s);

    const fontLink = document.createElement("link");
    fontLink.rel = "stylesheet";
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(fontLink);

    // Load External CSS
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      script.getAttribute("data-css-url") || API.replace("/api", "/widget.css");
    document.head.appendChild(link);

    // Load html2pdf for PDF generation
    const scriptTag = document.createElement("script");
    scriptTag.src =
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    document.head.appendChild(scriptTag);
  }

  // ─── HTML ─────────────────────────────────────────────────
  function injectHTML() {
    const launcher = document.createElement("button");
    launcher.id = "bb-launcher";
    launcher.title = "Build your PC";
    launcher.innerHTML = "⚡";

    const panel = document.createElement("div");
    panel.id = "bb-panel";
    panel.innerHTML = `
      <div id="bb-header">
        <div>
          <div class="bb-title">⚡ ${escapeHtml(WIDGET_TITLE)}</div>
          <div class="bb-sub">PC Build Recommender</div>
        </div>
        <button id="bb-close">✕</button>
      </div>

      <div id="bb-progress">
        <div id="bb-progress-fill"></div>
      </div>

      <div id="bb-body">
        <!-- S1: Welcome -->
        <div class="bb-screen active" id="bb-s1">
          <div class="bb-welcome-wrap">
            <div class="bb-welcome-badge">⚡ Instant Match</div>
            <div class="bb-welcome-icon">🖥️</div>
            <div class="bb-screen-title">Build Your Perfect PC</div>
            <div class="bb-screen-body">${escapeHtml(WELCOME_MSG)}</div>
            <button class="bb-btn" id="bb-start-btn">${escapeHtml(BUTTON_TEXT)} →</button>
            <div class="bb-welcome-trust">
              <span>🔒 Secure</span>
              <span>·</span>
              <span>⚡ Instant</span>
              <span>·</span>
              <span>🇵🇰 Built for Pakistan</span>
            </div>
          </div>
        </div>

        <!-- S2: Budget -->
        <div class="bb-screen" id="bb-s2">
          <button class="bb-back" id="bb-back-s2">← Back</button>
          <div class="bb-label">What's your budget?</div>
          <div class="bb-budget-row">
            <div class="bb-currency" id="bb-curr-label">${escapeHtml(CURRENCY)}</div>
            <input class="bb-input" id="bb-budget" type="number" placeholder="e.g. 80000" style="margin:0;flex:1;"/>
          </div>
          <div class="bb-field-error" id="bb-budget-error"></div>
          <div class="bb-input-hint">Enter your total budget in ${escapeHtml(CURRENCY)}. You'll see up to 10 compatible builds this store can offer, all close to your budget.</div>
          <div class="bb-label">Quick select</div>
          <div class="bb-chips" id="bb-budget-chips"></div>
          <button class="bb-btn" id="bb-next-s2">Next →</button>
        </div>

        <!-- S4: Build -->
        <div class="bb-screen" id="bb-s4">
          <button class="bb-back" id="bb-back-s4">← Back</button>
          <div class="bb-step-label">Step 2 of 2</div>
          <div class="bb-screen-title" style="font-size:17px;">Ready to build your PC?</div>
          <div class="bb-screen-body">BuildVolt will scan the store's inventory and show you up to 10 compatible PC builds, all priced close to your budget.</div>
          <button class="bb-btn" id="bb-build-btn">⚡ Build My PC</button>
        </div>

        <!-- S5: Loading -->
        <div class="bb-screen" id="bb-s5">
          <div class="bb-loading-wrap">
            <div class="bb-loading-ring">
              <div class="bb-ring-inner"></div>
            </div>
            <div class="bb-loading-title">Designing your builds</div>
            <div class="bb-loading-steps" id="bb-loading-steps">
              <div class="bb-load-step active" id="lsA">📦 Scanning your catalog...</div>
              <div class="bb-load-step" id="lsB">🧠 Matching parts to your budget...</div>
              <div class="bb-load-step" id="lsC">⚡ Checking compatibility...</div>
              <div class="bb-load-step" id="lsD">✅ Finalizing recommendations...</div>
            </div>
          </div>
        </div>

        <!-- S6: Results -->
        <div class="bb-screen" id="bb-s6">
          <div id="bb-results"></div>
          <div class="bb-actions">
            <button class="bb-restart" id="bb-restart-btn">↩ Start Over</button>
          </div>
        </div>

      </div>

      <div class="bb-powered">
        Powered by <a href="https://buildvolt.online" target="_blank">BuildVolt</a>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const overlay = document.createElement("div");
    overlay.id = "bb-modal-overlay";
    overlay.innerHTML = `
      <div id="bb-modal-panel">
        <div id="bb-modal-header">
          <div>
            <div id="bb-modal-title"></div>
            <div id="bb-modal-tagline"></div>
          </div>
          <div style="display:flex;align-items:center;">
            <button id="bb-modal-download">📄 PDF</button>
            <button id="bb-modal-close">✕</button>
          </div>
        </div>
        <div id="bb-modal-body">
          <div id="bb-modal-content"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // ─── EVENTS ───────────────────────────────────────────────
  function bindEvents() {
    // No longer asked as a separate step — budget alone drives the 3 tiers
    // (Budget/Balanced/Max), so this stays fixed at the neutral default
    // getPurposeProfile() already falls back to for unrecognized text.
    let selectedPurpose = "general";
    const $ = (id) => document.getElementById(id);

    // Helper functions for error handling
    function showError(id, msg) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.style.display = "block";
    }
    function hideError(id) {
      document.getElementById(id).style.display = "none";
    }

    // Initialize budget chips from presets
    const presets = _budgetPresets;
    const budgetChipsContainer = document.getElementById("bb-budget-chips");
    if (budgetChipsContainer) {
      budgetChipsContainer.innerHTML = presets
        .map(
          (val) =>
            `<button class="bb-chip" data-val="${val}" aria-pressed="false">${Number(val).toLocaleString()}</button>`,
        )
        .join("");
    }

    $("bb-launcher").onclick = () => {
      $("bb-panel").classList.toggle("open");
      $("bb-launcher").classList.toggle("open");
    };
    $("bb-close").onclick = () => {
      $("bb-panel").classList.remove("open");
      $("bb-launcher").classList.remove("open");
    };

    function setProgress(pct) {
      const fill = document.getElementById("bb-progress-fill");
      if (fill) fill.style.width = pct + "%";
    }

    function goTo(from, to, step) {
      $(`bb-${from}`).classList.remove("active");
      $(`bb-${to}`).classList.add("active");
      const stepMap = { 0: 0, 1: 25, 2: 50, 3: 75, 4: 90, 5: 100 };
      setProgress(stepMap[step]);
    }

    $("bb-start-btn").onclick = () => goTo("s1", "s2", 1);

    // Budget chips event handlers
    if (budgetChipsContainer) {
      budgetChipsContainer.querySelectorAll(".bb-chip").forEach((chip) => {
        chip.onclick = () => {
          budgetChipsContainer.querySelectorAll(".bb-chip").forEach((c) => {
            c.classList.remove("sel");
            c.setAttribute("aria-pressed", "false");
          });
          chip.classList.add("sel");
          chip.setAttribute("aria-pressed", "true");
          $("bb-budget").value = chip.dataset.val;
        };
      });
    }

    $("bb-next-s2").onclick = () => {
      const budgetValue = $("bb-budget").value;
      if (!budgetValue || budgetValue <= 0) {
        showError("bb-budget-error", "Please enter your budget!");
        $("bb-budget").classList.add("error");
        return;
      }
      hideError("bb-budget-error");
      $("bb-budget").classList.remove("error");
      goTo("s2", "s4", 2);
    };

    $("bb-back-s2").onclick = () => goTo("s2", "s1", 0);

    // Hide budget error when user types or selects a chip
    $("bb-budget").oninput = () => {
      hideError("bb-budget-error");
      $("bb-budget").classList.remove("error");
    };

    $("bb-back-s4").onclick = () => goTo("s4", "s2", 1);

    $("bb-build-btn").onclick = async () => {
      const budget = $("bb-budget").value;
      const allExtras = "";

      goTo("s4", "s5", 4);

      // Animate loading steps
      const steps = ["lsA", "lsB", "lsC", "lsD"];
      let stepIdx = 0;
      let bbTimer = null;

      function advanceStep() {
        // Mark current active step as done
        const currentActive = document.querySelector(".bb-load-step.active");
        if (currentActive) {
          currentActive.classList.remove("active");
          currentActive.classList.add("done");
        }

        // Activate next step
        if (stepIdx < steps.length) {
          const el = document.getElementById(steps[stepIdx]);
          if (el) el.classList.add("active");
          stepIdx++;
        }
      }

      // Start animation
      advanceStep(); // Run immediately
      bbTimer = setInterval(advanceStep, 1800);

      try {
        const res = await fetch(`${API}/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            budget,
            purpose: selectedPurpose,
            extras: allExtras,
            storeId: STORE_ID,
          }),
        });
        const data = await res.json();
        if (bbTimer) clearInterval(bbTimer);

        // Mark all steps as complete
        document.querySelectorAll(".bb-load-step").forEach((s) => {
          s.classList.remove("active");
          s.classList.add("done");
        });

        $("bb-s5").classList.remove("active");
        $("bb-s6").classList.add("active");
        setProgress(100);

        if (!res.ok || !data.success) {
          renderError(data.error || "Something went wrong.", data.limitReached);
          return;
        }

        _lastBuilds = data.builds || [];
        _lastCurrency = data.currency || CURRENCY;
        _lastBudget = budget;
        renderResults(
          data.builds || [],
          data.currency || CURRENCY,
          data.canBuild !== false,
          data.noBuildsReason || "",
          data.inventoryCeilingNote || "",
        );
      } catch {
        if (bbTimer) clearInterval(bbTimer);

        // Mark all steps as complete
        document.querySelectorAll(".bb-load-step").forEach((s) => {
          s.classList.remove("active");
          s.classList.add("done");
        });

        $("bb-s5").classList.remove("active");
        $("bb-s6").classList.add("active");
        setProgress(100);
        renderError("Could not connect. Please try again.", false, () =>
          $("bb-build-btn").click(),
        );
      }
    };

    $("bb-restart-btn").onclick = () => {
      selectedPurpose = "general";
      $("bb-budget").value = "";
      document.querySelectorAll(".bb-chip").forEach((c) => {
        c.classList.remove("sel");
        c.setAttribute("aria-pressed", "false");
      });
      document
        .querySelectorAll(".bb-load-step")
        .forEach((s) => s.classList.remove("active", "done"));
      goTo("s6", "s1", 0);
    };

    // Modal close button
    const modalClose = document.getElementById("bb-modal-close");
    if (modalClose) {
      modalClose.onclick = () => {
        document.getElementById("bb-modal-overlay").classList.remove("open");
      };
    }

    // Close modal on overlay click
    document.getElementById("bb-modal-overlay").onclick = (e) => {
      if (e.target === document.getElementById("bb-modal-overlay")) {
        document.getElementById("bb-modal-overlay").classList.remove("open");
      }
    };

    // Modal download button
    const modalDownload = document.getElementById("bb-modal-download");
    if (modalDownload) {
      modalDownload.onclick = async () => {
        if (_currentBuild) {
          await generatePDF(_currentBuild, _lastCurrency, modalDownload);
        }
      };
    }

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const overlay = document.getElementById("bb-modal-overlay");
        if (overlay) overlay.classList.remove("open");
      }
    });

    // Delegated (not per-render) so it keeps working across every
    // openBuildModal() re-render without stacking duplicate listeners.
    // Reads the name back out of a data-attribute rather than building the
    // search URL inline in the generated HTML, so a product name with
    // quotes/special characters can never break out of an inline handler.
    document.getElementById("bb-modal-content").addEventListener("click", (e) => {
      const row = e.target.closest(".bb-modal-part-clickable");
      if (!row) return;
      const name = row.dataset.partName;
      if (!name) return;
      window.open(
        `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(name)}`,
        "_blank",
        "noopener",
      );
    });
  }

  // ─── RENDER BUILD CARDS (2 or 3, depending on inventory) ──
  function renderResults(builds, currency, canBuild, noBuildsReason, inventoryCeilingNote) {
    const container = document.getElementById("bb-results");

    // ── No builds possible ──
    if (!canBuild || !builds || builds.length === 0) {
      container.innerHTML = `
        <div class="bb-no-builds">
          <span class="bb-no-builds-icon">😔</span>
          <div class="bb-no-builds-title">Sorry, we couldn't build a PC for this budget.</div>
          <div class="bb-no-builds-msg">
            ${escapeHtml(noBuildsReason) || "The products available in this store aren't enough to build a complete PC within your budget right now."}
          </div>
          <div class="bb-no-builds-suggestion">
            💡 Try increasing your budget, or contact the store directly — they may be able to help you find the right parts.
          </div>
        </div>`;
      return;
    }

    // ── Build cards ──
    // Sorted cheapest → priciest already (buildIndex order); no ranking
    // badges — the price itself and the position in the list communicate
    // that, and a "Best Available" label on a build that happens to be
    // GPU-less because that's genuinely the priciest thing the store's
    // stock allows would read as a recommendation it isn't.
    const anyBuildHasGpu = builds.some((b) =>
      (b.parts || []).some((p) => p.category === "GPU"),
    );
    const cardsHtml = builds
      .map((build, i) => {
        const isFeatured = i === 0;
        const isOver = !build.withinBudget;

        // Parts preview — show first 4 categories as pills
        const previewParts = (build.parts || [])
          .slice(0, 4)
          .map((p) => `<span class="bb-card-part-pill">${escapeHtml(p.category)}</span>`)
          .join("");

        return `
        <div class="bb-build-card ${isFeatured ? "featured" : ""}" data-build-idx="${i}">
          <div class="bb-card-top">
            <span class="bb-card-price">${currency} ${Number(build.totalPrice || 0).toLocaleString()}</span>
          </div>
          <div class="bb-card-name">${escapeHtml(build.buildName) || "Custom PC Build"}</div>
          <div class="bb-card-tagline">${escapeHtml(build.tagline) || escapeHtml(build.summary) || "A custom build selected for your needs."}</div>
          <span class="bb-card-budget-tag ${isOver ? "over" : "within"}">
            ${
              isOver
                ? "⚠️ Slightly over budget"
                : build.budgetRemaining > 0
                  ? `✓ ${currency} ${Number(build.budgetRemaining).toLocaleString()} remaining`
                  : "✓ Within budget"
            }
          </span>
          ${
            build.gpuExcludedForBudget
              ? `<span class="bb-card-gpu-warn" style="display:inline-block;margin-top:6px;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;background:#fff3cd;color:#8a6100;">⚠️ ${
                  anyBuildHasGpu
                    ? "No graphics card in this option — see pricier builds below for one with a GPU"
                    : "No graphics card — this store's current stock can't fit one in any build within your budget"
                }</span>`
              : ""
          }
          <div class="bb-card-parts-preview">${previewParts}</div>
          <div class="bb-card-cta">
            <span class="bb-card-cta-text">View full build</span>
            <span class="bb-card-cta-arrow">→</span>
          </div>
        </div>`;
      })
      .join("");

    container.innerHTML = `
      <div class="bb-results-header">
        <div class="bb-results-title">⚡ ${builds.length} Builds Ready</div>
        <div class="bb-results-sub">Tap any build to see full details, parts list, and prices.</div>
        ${
          inventoryCeilingNote
            ? `<div class="bb-inventory-ceiling-note">💡 ${escapeHtml(inventoryCeilingNote)}</div>`
            : ""
        }
      </div>
      <div class="bb-build-cards">${cardsHtml}</div>`;

    // ── Bind card click → open modal ──
    container.querySelectorAll(".bb-build-card").forEach((card) => {
      card.onclick = () => {
        const idx = parseInt(card.dataset.buildIdx);
        openBuildModal(builds[idx], currency);
      };
    });
  }

  // ─── OPEN BUILD DETAIL MODAL ──────────────────────────────
  function openBuildModal(build, currency) {
    const overlay = document.getElementById("bb-modal-overlay");
    const isOver = !build.withinBudget;
    const isCompatible = build.compatible !== false;

    // Set current build for modal download
    _currentBuild = build;

    // Header
    document.getElementById("bb-modal-title").textContent =
      build.buildName || "Custom PC Build";
    document.getElementById("bb-modal-tagline").textContent =
      build.tagline || "A custom build selected for your needs.";

    // Compatibility badge — three states, not two: incompatible (missing
    // required parts), compatible-but-unverified (no conflict found, but
    // the CPU/motherboard socket couldn't actually be confirmed from the
    // listing text), and fully verified. Only the last one gets to claim
    // "verified compatible".
    const compatibilityBadge = !isCompatible
      ? `<div class="bb-compatibility-badge incompatible">⚠️ ${escapeHtml(build.compatibilityNote) || "Compatibility issues detected"}</div>`
      : build.compatibilityNote
        ? `<div class="bb-compatibility-badge unverified">ℹ️ ${escapeHtml(build.compatibilityNote)}</div>`
        : `<div class="bb-compatibility-badge compatible">✅ All parts verified compatible</div>`;

    // Parts list
    const partsHtml = (build.parts || [])
      .map((p) => {
        const qty = p.quantity || 1;
        const totalPrice = p.totalPrice || p.price * qty;
        return `
        <div class="bb-modal-part bb-modal-part-clickable" data-part-name="${escapeHtml(p.name)}" title="See images of this exact part on Google">
          <div class="bb-modal-part-cat">${escapeHtml(p.category)}</div>
          <div class="bb-modal-part-info">
            <div class="bb-modal-part-name">${escapeHtml(p.name)} <span class="bb-modal-part-search">🔍</span></div>
            ${qty > 1 ? `<div class="bb-modal-part-qty">× ${qty} units</div>` : ""}
            ${p.reason ? `<div class="bb-modal-part-reason">${escapeHtml(p.reason)}</div>` : ""}
          </div>
          <div class="bb-modal-part-price">${currency} ${Number(totalPrice).toLocaleString()}</div>
        </div>`;
      })
      .join("");

    const missingHtml =
      build.missingCategories && build.missingCategories.length > 0
        ? `<div class="bb-modal-missing">⚠️ Not available in store: ${escapeHtml(build.missingCategories.join(", "))}</div>`
        : "";

    document.getElementById("bb-modal-content").innerHTML = `
      ${compatibilityBadge}

      ${
        build.summary
          ? `
        <div class="bb-modal-summary">${escapeHtml(build.summary)}</div>
      `
          : ""
      }

      <div class="bb-modal-section-label">Components</div>
      ${partsHtml}
      ${missingHtml}

      <div class="bb-modal-total ${isOver ? "over" : "within"}">
        <div class="bb-modal-total-label">${isOver ? "⚠️ Over budget" : "✅ Total Cost"}</div>
        <div class="bb-modal-total-price">${currency} ${Number(build.totalPrice).toLocaleString()}</div>
      </div>
      ${
        build.budgetRemaining > 0
          ? `<div class="bb-modal-remaining">↳ ${currency} ${Number(build.budgetRemaining).toLocaleString()} remains from your budget</div>`
          : ""
      }
      ${renderOrderSectionHtml(build)}
      ${
        build.tips
          ? `<div class="bb-modal-section-label">Tips & Notes</div><div class="bb-modal-tips">💡 ${escapeHtml(build.tips)}</div>`
          : ""
      }
      ${
        build.budgetAdvice
          ? `<div class="bb-modal-tips">💰 ${escapeHtml(build.budgetAdvice)}</div>`
          : ""
      }`;

    const orderBtn = document.getElementById("bb-order-btn");
    if (orderBtn)
      orderBtn.onclick = () => placeOrderForBuild(build, orderBtn);

    overlay.classList.add("open");
  }

  // ─── ORDER THIS BUILD ──────────────────────────────────────
  // WooCommerce stores: navigates to the store's own domain so the
  // add-to-cart request carries that site's real cart/session cookies —
  // never a cross-origin fetch from here. Everyone else: hands the full
  // build off to the store's WhatsApp as a pre-filled order message.
  function renderOrderSectionHtml(build) {
    if (ORDER_METHOD === "woo") {
      const parts = build.parts || [];
      const withWoo = parts.filter((p) => p.wooId);
      if (!withWoo.length) return "";
      const note =
        withWoo.length < parts.length
          ? `<div class="bb-order-note">${withWoo.length} of ${parts.length} parts will be added to cart — ask the store about the rest.</div>`
          : "";
      return `<button class="bb-order-btn" id="bb-order-btn">🛒 Order This Build</button>${note}`;
    }
    if (ORDER_METHOD === "whatsapp") {
      return `<button class="bb-order-btn" id="bb-order-btn">💬 Order via WhatsApp</button>`;
    }
    return "";
  }

  // WhatsApp can't send a message the customer isn't allowed to edit —
  // that's a hard platform limit, no workaround exists. So before opening
  // WhatsApp (or the WooCommerce cart link), this registers the build
  // server-side from the store's real catalog (never trusting whatever's
  // sitting in the page by now) and gets back an order reference number.
  // If a customer edits prices in the WhatsApp message before sending, the
  // store owner can still look up that reference in their dashboard and
  // see the real, untampered order.
  async function placeOrderForBuild(build, btn) {
    // Locked for the rest of this function's life, not just during the
    // fetch — re-enabling the button right after the round-trip (and
    // before the WhatsApp tab actually opened / the WooCommerce redirect
    // actually fired) left a real window where a second click, or a
    // customer clicking again after WhatsApp opened in a background tab
    // not realizing the first click already worked, fired a second
    // /order-request for the same build and created a duplicate order
    // reference. Re-opening the build's modal rebinds a fresh button (see
    // openBuildModal), so this only blocks repeat clicks on this one.
    if (btn.dataset.bbOrdering === "1") return;
    if (ORDER_METHOD === "woo" && !(build.parts || []).some((p) => p.wooId))
      return;

    btn.dataset.bbOrdering = "1";
    const origText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Please wait…";

    let orderId = null;
    let orderSig = null;
    let orderedBuild = build;
    try {
      const res = await fetch(`${API}/order-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: STORE_ID,
          budget: _lastBudget,
          buildIndex: build.buildIndex,
          orderMethod: ORDER_METHOD,
        }),
      });
      const data = await res.json();
      if (data.success) {
        orderId = data.orderId;
        orderSig = data.orderSig;
        orderedBuild = data.build;
      }
    } catch (err) {
      /* fall through — still let the order proceed with local data */
    }

    if (ORDER_METHOD === "woo") {
      const items = (orderedBuild.parts || [])
        .filter((p) => p.wooId)
        .map((p) => ({ id: p.wooId, qty: p.quantity || 1 }));
      if (!items.length) {
        // Nothing to actually check out with — no customer-facing action
        // is about to happen, so this is a real failure the customer
        // should be able to retry, not a placed order.
        btn.disabled = false;
        btn.textContent = origText;
        btn.dataset.bbOrdering = "";
        return;
      }
      btn.textContent = "Redirecting…";
      const url = `${WOO_URL}/?buildvolt_add_to_cart=1&items=${encodeURIComponent(JSON.stringify(items))}`;
      window.location.href = url;
      return;
    }

    if (ORDER_METHOD === "whatsapp") {
      // Without a saved order_requests row, the store owner has no
      // server-side record to cross-check the WhatsApp message against —
      // and since WhatsApp always requires the customer to tap Send
      // themselves before it goes anywhere, that message text could still
      // be edited (e.g. the price) with nothing to catch it against. Safer
      // to make the customer retry than to send an unverifiable order.
      if (!orderId) {
        btn.disabled = false;
        btn.textContent = origText;
        btn.dataset.bbOrdering = "";
        alert("Could not prepare your order — please try again.");
        return;
      }
      // The itemized parts/total used to be spelled out here too, but
      // that's exactly the customer-editable text the link below already
      // makes unnecessary — the store owner opens the link and sees the
      // real order regardless of what happens to everything else in this
      // message. Keeping the message itself short also means there's less
      // for a customer to bother editing before hitting Send in the first
      // place.
      const orderUrl = `${API.replace(/\/api$/, "")}/o/${orderId}/${orderSig}`;
      const lines = [
        `Hi! I'd like to order this PC build from ${WIDGET_TITLE}:`,
        orderUrl,
      ];
      const waNumber = WHATSAPP_NUMBER.replace(/[^\d]/g, "");
      const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines.join("\n"))}`;
      window.open(waUrl, "_blank", "noopener");
      // WhatsApp opens in a separate tab, so this page (and this button)
      // stays right where it was — left disabled with a clear "done"
      // label instead of springing back to "Order via WhatsApp", which
      // read as an invitation to click it again.
      btn.textContent = "✅ Sent to WhatsApp";
    }
  }

  // ─── PDF GENERATION (single build, from the detail modal) ──
  async function generatePDF(build, currency, btn) {
    // Wait for html2pdf to be loaded
    if (!window.html2pdf) {
      btn.innerHTML = "⏳ Loading…";
      // Poll for html2pdf availability
      let attempts = 0;
      const maxAttempts = 20; // Wait up to 2 seconds
      while (!window.html2pdf && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }
      if (!window.html2pdf) {
        btn.innerHTML = "❌ Error";
        setTimeout(() => {
          btn.innerHTML = btn.originalText || "📄 PDF";
        }, 2000);
        return;
      }
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = "⏳ Generating…";
    btn.disabled = true;

    try {
      let htmlContent = "";

      {
        const isCompatible = build.compatible !== false;
        // Same three states as the modal badge — see the comment there.
        const compatibilityBadge = !isCompatible
          ? `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #fef3e2; color: #b45309; border: 1px solid #b45309; border-radius: 8px; font-size: 11px; font-weight: 600; margin-bottom: 12px;">
              ⚠️ ${escapeHtml(build.compatibilityNote) || "Compatibility issues detected"}
            </div>`
          : build.compatibilityNote
            ? `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #fef3e2; color: #b45309; border: 1px dashed #b45309; border-radius: 8px; font-size: 11px; font-weight: 600; margin-bottom: 12px;">
              ℹ️ ${escapeHtml(build.compatibilityNote)}
            </div>`
            : `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; background: #edf7f2; color: #1a7a4a; border: 1px solid #1a7a4a; border-radius: 8px; font-size: 11px; font-weight: 600; margin-bottom: 12px;">
              ✅ All parts verified compatible
            </div>`;

        const partsTable = (build.parts || [])
          .map((p) => {
            const qty = p.quantity || 1;
            const totalPrice = p.totalPrice || p.price * qty;
            return `
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 7px 8px; vertical-align: top; width: 110px;">
                <span style="background: #f5f5f5; color: #666666; padding: 3px 7px; border-radius: 6px; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${escapeHtml(p.category)}
                </span>
              </td>
              <td style="padding: 7px 8px; vertical-align: top;">
                <div style="font-weight: 600; color: #111111; margin-bottom: 2px; font-size: 12px;">${escapeHtml(p.name)}</div>
                ${p.reason ? `<div style="font-size: 10px; color: #666666; line-height: 1.3;">${escapeHtml(p.reason)}</div>` : ""}
                ${qty > 1 ? `<div style="display: inline-block; background: #fef3e2; color: #b45309; padding: 1px 5px; border-radius: 4px; font-size: 9px; font-weight: 600; margin-top: 2px;">×${qty}</div>` : ""}
              </td>
              <td style="padding: 7px 8px; vertical-align: top; text-align: right; width: 110px; font-weight: 600; color: #111111; font-size: 12px;">
                ${currency} ${Number(totalPrice).toLocaleString()}
              </td>
            </tr>
          `;
          })
          .join("");

        const missingCategoriesHtml =
          build.missingCategories && build.missingCategories.length > 0
            ? `<div style="background: #fef3e2; border: 1px solid #b45309; border-radius: 8px; padding: 8px 10px; margin: 10px 0; font-size: 11px; color: #b45309;">
              ⚠️ Not available in store: ${escapeHtml(build.missingCategories.join(", "))}
            </div>`
            : "";

        const tipsHtml = build.tips
          ? `<div style="background: #f8f9fa; border-left: 3px solid #7c6af7; border-radius: 0 8px 8px 0; padding: 8px 10px; margin: 10px 0; font-size: 11px; color: #666666; line-height: 1.4;">
              💡 ${escapeHtml(build.tips)}
            </div>`
          : "";

        const totalBoxStyle = build.withinBudget
          ? "background: #edf7f2; border: 1px solid #1a7a4a; color: #1a7a4a;"
          : "background: #fef3e2; border: 1px solid #b45309; color: #b45309;";

        htmlContent += `
          <div style="padding: 26px 28px; font-family: 'Inter', sans-serif; color: #111111; background: #ffffff;">
            <!-- Build Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
              <div>
                <h2 style="font-size: 20px; font-weight: 700; color: #111111; margin: 0 0 4px 0;">${escapeHtml(build.buildName)}</h2>
                <p style="font-size: 12px; color: #666666; margin: 0; line-height: 1.4;">${escapeHtml(build.tagline) || escapeHtml(build.summary) || ""}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 18px; font-weight: 700; color: #111111;">${currency} ${Number(build.totalPrice).toLocaleString()}</div>
              </div>
            </div>

            <!-- Compatibility Badge -->
            ${compatibilityBadge}

            <!-- Why This Build -->
            ${
              build.summary
                ? `
              <div style="background: #f5f5f5; border-left: 3px solid #7c6af7; border-radius: 0 8px 8px 0; padding: 10px 12px; margin-bottom: 14px;">
                <h3 style="font-size: 11px; font-weight: 700; color: #111111; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">Why This Build?</h3>
                <p style="font-size: 11px; color: #666666; margin: 0; line-height: 1.4;">${escapeHtml(build.summary)}</p>
              </div>
            `
                : ""
            }

            <!-- Components Table -->
            <h3 style="font-size: 11px; font-weight: 700; color: #111111; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Components</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #111111; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;">Category</th>
                  <th style="padding: 6px 8px; text-align: left; font-weight: 600; color: #111111; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;">Part Name + Reason</th>
                  <th style="padding: 6px 8px; text-align: right; font-weight: 600; color: #111111; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${partsTable}
              </tbody>
            </table>

            <!-- Missing Categories -->
            ${missingCategoriesHtml}

            <!-- Total Cost -->
            <div style="${totalBoxStyle} border-radius: 10px; padding: 12px 14px; margin: 12px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 13px; font-weight: 600;">
                  ${build.withinBudget ? "✅ Total Cost" : "⚠️ Over Budget"}
                </div>
                <div style="font-size: 18px; font-weight: 800;">
                  ${currency} ${Number(build.totalPrice).toLocaleString()}
                </div>
              </div>
              ${
                build.budgetRemaining > 0
                  ? `
                <div style="text-align: right; margin-top: 4px; font-size: 11px; color: #1a7a4a; font-weight: 600;">
                  ${currency} ${Number(build.budgetRemaining).toLocaleString()} remains from your budget
                </div>
              `
                  : ""
              }
            </div>

            <!-- Tips -->
            ${tipsHtml}

            <!-- Budget Advice -->
            ${
              build.budgetAdvice
                ? `
              <div style="background: #f8f9fa; border-left: 3px solid #7c6af7; border-radius: 0 8px 8px 0; padding: 8px 10px; margin: 10px 0; font-size: 11px; color: #666666; line-height: 1.4;">
                💰 ${escapeHtml(build.budgetAdvice)}
              </div>
            `
                : ""
            }

            <!-- Footer -->
            <div style="margin-top: 16px; padding-top: 10px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #666666;">
              <div>Generated by BuildVolt</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        `;
      }

      const filename = `BuildVolt_${build.buildName?.replace(/[^a-zA-Z0-9]/g, "_") || "Build"}.pdf`;

      // html2pdf's .from(htmlString) path hands the string to html2canvas
      // with no real layout context, so its width gets inferred rather
      // than matching the A4 page it's about to become — that mismatch was
      // what was actually cropping/distorting the PDF, not just page-break
      // placement. Building a real element, attaching it to the document
      // (off-screen, not display:none — an unrendered element has no
      // layout for html2canvas to measure at all) so it gets the exact
      // same layout engine pass a visible page would, is the reliable way
      // html2pdf is meant to be driven.
      // Giving the target element ANY explicit position (fixed OR
      // absolute) made html2pdf's internal capture measure it as zero
      // height every time, however it was offset — confirmed by directly
      // inspecting html2pdf's own debug log ("Canvas renderer initialized
      // 794x0"), regardless of on/off-screen placement. Only plain static
      // in-flow elements measured correctly. The fix: keep the actual
      // target element unpositioned (so its own layout is normal and
      // correctly measurable) and instead hide it by putting it inside an
      // outer wrapper with height:0 + overflow:hidden — the wrapper clips
      // what's visible on the page without affecting the target's own
      // height calculation, since overflow clipping on a parent doesn't
      // change a child's own offsetHeight.
      const outer = document.createElement("div");
      outer.style.cssText = "height: 0; overflow: hidden;";
      const container = document.createElement("div");
      container.style.cssText = "width: 794px; background: #ffffff;";
      container.innerHTML = htmlContent;
      outer.appendChild(container);
      document.body.appendChild(outer);
      // Let the browser actually paint the newly-appended content before
      // html2canvas reads it — without this, capture can race ahead of
      // layout and grab an empty frame.
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const opt = {
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
        jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "avoid-all"] },
      };

      try {
        await window.html2pdf().set(opt).from(container).save();
      } finally {
        outer.remove();
      }

      btn.innerHTML = "✅ Downloaded!";
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    } catch (e) {
      console.error("PDF Gen Error:", e);
      btn.innerHTML = "❌ Error";
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }
  }

  // ─── RENDER ERROR ─────────────────────────────────────────
  function renderError(msg, limitReached, onRetry) {
    document.getElementById("bb-results").innerHTML = `
      <div class="bb-no-builds">
        <span class="bb-no-builds-icon">${limitReached ? "⏳" : "😔"}</span>
        <div class="bb-no-builds-title">${limitReached ? "Limit Reached" : "Something went wrong"}</div>
        <div class="bb-no-builds-msg">${escapeHtml(msg) || "We couldn't generate recommendations right now."}</div>
        <div class="bb-no-builds-suggestion">Please try again later or contact the store directly.</div>
        ${!limitReached ? '<button class="bb-btn bb-retry-btn" style="margin-top: 16px;">Try Again</button>' : ""}
      </div>`;

    const retryBtn = document.querySelector(".bb-retry-btn");
    if (retryBtn && onRetry) retryBtn.onclick = onRetry;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidget);
  } else {
    initWidget();
  }
})();
