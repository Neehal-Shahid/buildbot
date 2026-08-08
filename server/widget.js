(function () {
  const script    = document.currentScript ||
                    document.querySelector('script[data-store-id]');
  const STORE_ID  = script ? script.getAttribute('data-store-id') : null;
  const API       = 'https://buildbot-production-3f70.up.railway.app/api';

  let BRAND_COLOR  = '#7c6af7';
  let WIDGET_BG    = '#0f1117'; // Default; can be overridden per-store via store-config
  let CURRENCY     = 'PKR';
  let WIDGET_TITLE = 'BuildBot';
  let WELCOME_MSG  = 'Tell me your budget and what you need — I will find the best parts from this store for you.';
  let BUTTON_TEXT  = 'Get Started';

  // Store build data for PDF access
  let _lastBuilds = [];
  let _lastCurrency = 'PKR';
  let _currentBuild = null;
  let _budgetPresets = [50000, 80000, 120000, 200000];

  if (!STORE_ID) { console.error('BuildBot: No data-store-id found.'); return; }

  // ─── AUTO CONTRAST ────────────────────────────────────────
  function getContrastColor(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const luminance = (0.299*r + 0.587*g + 0.114*b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `${r}, ${g}, ${b}`;
  }

  // ─── INIT ─────────────────────────────────────────────────
  async function initWidget() {
    try {
      const res = await fetch(`${API}/store-config/${STORE_ID}`);
      const storeConfig = await res.json();

      if (storeConfig.active === false || storeConfig.widgetEnabled === false) {
        return;
      }
      
      if (storeConfig.brandColor) BRAND_COLOR = storeConfig.brandColor;
      if (storeConfig.widgetBg)   WIDGET_BG   = storeConfig.widgetBg;
      if (storeConfig.currency)    CURRENCY    = storeConfig.currency;
      if (storeConfig.widgetTitle) WIDGET_TITLE = storeConfig.widgetTitle;
      if (storeConfig.welcomeMessage) WELCOME_MSG  = storeConfig.welcomeMessage;
      if (storeConfig.buttonText)  BUTTON_TEXT  = storeConfig.buttonText;
      
      // Store budget presets for later use
      if (storeConfig.budgetPresets && Array.isArray(storeConfig.budgetPresets)) {
        _budgetPresets = storeConfig.budgetPresets;
      }
      
      injectStyles();
      injectHTML();
      bindEvents();
    } catch (err) {
      console.error('BuildBot: Failed to load store config, using defaults.', err);
      // Fallback to defaults
      injectStyles();
      injectHTML();
      bindEvents();
    }
  }

  // ─── STYLES ───────────────────────────────────────────────
  function injectStyles() {
    const btnTextColor  = getContrastColor(BRAND_COLOR);
    const borderRgba    = hexToRgba(BRAND_COLOR, 0.2);

    // Dynamic Variables
    const s = document.createElement('style');
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

    const fontLink = document.createElement('link');
    fontLink.rel  = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
    document.head.appendChild(fontLink);

    // Load External CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = script.getAttribute('data-css-url') || API.replace('/api', '/widget.css');
    document.head.appendChild(link);

    // Load html2pdf for PDF generation
    const scriptTag = document.createElement('script');
    scriptTag.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    document.head.appendChild(scriptTag);
  }

  // ─── HTML ─────────────────────────────────────────────────
  function injectHTML() {
    const launcher  = document.createElement('button');
    launcher.id     = 'bb-launcher';
    launcher.title  = 'Build your PC';
    launcher.innerHTML = '⚡';

    const panel = document.createElement('div');
    panel.id    = 'bb-panel';
    panel.innerHTML = `
      <div id="bb-header">
        <div>
          <div class="bb-title">⚡ ${WIDGET_TITLE}</div>
          <div class="bb-sub">AI PC Build Recommender</div>
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
            <div class="bb-welcome-badge">⚡ AI-Powered</div>
            <div class="bb-welcome-icon">🖥️</div>
            <div class="bb-screen-title">Build Your Perfect PC</div>
            <div class="bb-screen-body">${WELCOME_MSG}</div>
            <button class="bb-btn" id="bb-start-btn">${BUTTON_TEXT} →</button>
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
            <div class="bb-currency" id="bb-curr-label">${CURRENCY}</div>
            <input class="bb-input" id="bb-budget" type="number" placeholder="e.g. 80000" style="margin:0;flex:1;"/>
          </div>
          <div class="bb-field-error" id="bb-budget-error"></div>
          <div class="bb-input-hint">Enter your total budget in ${CURRENCY}. You'll get 3 builds to choose from.</div>
          <div class="bb-label">Quick select</div>
          <div class="bb-chips" id="bb-budget-chips"></div>
          <button class="bb-btn" id="bb-next-s2">Next →</button>
        </div>

        <!-- S3: Purpose -->
        <div class="bb-screen" id="bb-s3">
          <button class="bb-back" id="bb-back-s3">← Back</button>
          <div class="bb-step-label">Step 2 of 3</div>
          <div class="bb-screen-title" style="font-size:17px;">What will you build it for?</div>
          <div class="bb-field-error" id="bb-purpose-error"></div>
          <div class="bb-chips" id="bb-purposes">
            <button class="bb-chip" aria-pressed="false">🏢 Office Work</button>
            <button class="bb-chip" aria-pressed="false">📚 Studies</button>
            <button class="bb-chip" aria-pressed="false">💻 Coding</button>
            <button class="bb-chip" aria-pressed="false">🎨 Designing</button>
            <button class="bb-chip" aria-pressed="false">🎬 Video Editing</button>
            <button class="bb-chip" aria-pressed="false">🎮 Gaming</button>
            <button class="bb-chip" aria-pressed="false">📡 Streaming</button>
            <button class="bb-chip" aria-pressed="false">🔁 Mixed Use</button>
          </div>
          <button class="bb-btn" id="bb-next-s3">Next →</button>
        </div>

        <!-- S4: Extras -->
        <div class="bb-screen" id="bb-s4">
          <button class="bb-back" id="bb-back-s4">← Back</button>
          <div class="bb-label">Any extras? (optional)</div>
          <div class="bb-chips" id="bb-extras">
            <button class="bb-chip" aria-pressed="false">🖥️ Monitor</button>
            <button class="bb-chip" aria-pressed="false">⌨️ Keyboard</button>
            <button class="bb-chip" aria-pressed="false">🖱️ Mouse</button>
            <button class="bb-chip" aria-pressed="false">🎧 Headset</button>
            <button class="bb-chip" aria-pressed="false">📷 Webcam</button>
          </div>
          <div class="bb-label" style="margin-top:4px;">Or type something</div>
          <input class="bb-input" id="bb-extras-text" placeholder="e.g. WiFi card..."/>
          <button class="bb-btn" id="bb-build-btn">⚡ Build My PC</button>
        </div>

        <!-- S5: Loading -->
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
              <div class="bb-load-step" id="lsD">✅ Finalizing recommendations...</div>
            </div>
          </div>
        </div>

        <!-- S6: Results -->
        <div class="bb-screen" id="bb-s6">
          <div id="bb-results"></div>
          <div class="bb-actions">
            <button class="bb-restart" id="bb-restart-btn">↩ Start Over</button>
            <button class="bb-download" id="bb-download-btn" style="display:none;">📄 Download PDF</button>
          </div>
        </div>

      </div>

      <div class="bb-powered">
        Powered by <a href="https://buildbot-nine.vercel.app" target="_blank">BuildBot</a>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    const overlay = document.createElement('div');
    overlay.id = 'bb-modal-overlay';
    overlay.innerHTML = `
      <div id="bb-modal-panel">
        <div id="bb-modal-header">
          <div>
            <div id="bb-modal-tier-badge"></div>
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
    let selectedPurpose = '';
    let selectedExtras  = [];
    const $ = id => document.getElementById(id);

    // Helper functions for error handling
    function showError(id, msg) {
      const el = document.getElementById(id);
      el.textContent = msg;
      el.style.display = 'block';
    }
    function hideError(id) {
      document.getElementById(id).style.display = 'none';
    }

    // Initialize budget chips from presets
    const presets = _budgetPresets;
    const budgetChipsContainer = document.getElementById('bb-budget-chips');
    if (budgetChipsContainer) {
      budgetChipsContainer.innerHTML = presets.map(val => 
        `<button class="bb-chip" data-val="${val}" aria-pressed="false">${Number(val).toLocaleString()}</button>`
      ).join('');
    }

    $('bb-launcher').onclick = () => {
      $('bb-panel').classList.toggle('open');
      $('bb-launcher').classList.toggle('open');
    };
    $('bb-close').onclick    = () => {
      $('bb-panel').classList.remove('open');
      $('bb-launcher').classList.remove('open');
    };

    function setProgress(pct) {
      const fill = document.getElementById('bb-progress-fill');
      if (fill) fill.style.width = pct + '%';
    }

    function goTo(from, to, step) {
      $(`bb-${from}`).classList.remove('active');
      $(`bb-${to}`).classList.add('active');
      const stepMap = { 0: 0, 1: 25, 2: 50, 3: 75, 4: 90, 5: 100 };
      setProgress(stepMap[step]);
    }

    $('bb-start-btn').onclick = () => goTo('s1','s2',1);

    // Budget chips event handlers
    if (budgetChipsContainer) {
      budgetChipsContainer.querySelectorAll('.bb-chip').forEach(chip => {
        chip.onclick = () => {
          budgetChipsContainer.querySelectorAll('.bb-chip')
            .forEach(c => {
              c.classList.remove('sel');
              c.setAttribute('aria-pressed', 'false');
            });
          chip.classList.add('sel');
          chip.setAttribute('aria-pressed', 'true');
          $('bb-budget').value = chip.dataset.val;
        };
      });
    }

    $('bb-next-s2').onclick = () => {
      const budgetValue = $('bb-budget').value;
      if (!budgetValue || budgetValue <= 0) {
        showError('bb-budget-error', 'Please enter your budget!');
        $('bb-budget').classList.add('error');
        return;
      }
      hideError('bb-budget-error');
      $('bb-budget').classList.remove('error');
      goTo('s2','s3',2);
    };

    $('bb-back-s2').onclick = () => goTo('s2','s1',0);

    // Hide budget error when user types or selects a chip
    $('bb-budget').oninput = () => {
      hideError('bb-budget-error');
      $('bb-budget').classList.remove('error');
    };

    $('bb-purposes').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        $('bb-purposes').querySelectorAll('.bb-chip')
          .forEach(c => {
            c.classList.remove('sel');
            c.setAttribute('aria-pressed', 'false');
          });
        chip.classList.add('sel');
        chip.setAttribute('aria-pressed', 'true');
        selectedPurpose = chip.textContent.trim();
        hideError('bb-purpose-error');
      };
    });

    $('bb-next-s3').onclick = () => {
      if (!selectedPurpose) {
        showError('bb-purpose-error', 'Please select a purpose!');
        return;
      }
      hideError('bb-purpose-error');
      goTo('s3','s4',3);
    };

    $('bb-back-s3').onclick = () => goTo('s3','s2',1);

    $('bb-extras').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        chip.classList.toggle('sel');
        const txt = chip.textContent.trim();
        if (chip.classList.contains('sel')) {
          selectedExtras.push(txt);
          chip.setAttribute('aria-pressed', 'true');
        } else {
          selectedExtras = selectedExtras.filter(e => e !== txt);
          chip.setAttribute('aria-pressed', 'false');
        }
      };
    });

    $('bb-back-s4').onclick = () => goTo('s4','s3',2);

    $('bb-build-btn').onclick = async () => {
      const budget    = $('bb-budget').value;
      const extraText = $('bb-extras-text').value;
      const allExtras = [...selectedExtras, extraText].filter(Boolean).join(', ');

      goTo('s4','s5',4);

      // Animate loading steps
      const steps = ['lsA','lsB','lsC','lsD'];
      let stepIdx = 0;
      let bbTimer = null;
      
      function advanceStep() {
        // Mark current active step as done
        const currentActive = document.querySelector('.bb-load-step.active');
        if (currentActive) {
          currentActive.classList.remove('active');
          currentActive.classList.add('done');
        }
        
        // Activate next step
        if (stepIdx < steps.length) {
          const el = document.getElementById(steps[stepIdx]);
          if (el) el.classList.add('active');
          stepIdx++;
        }
      }
      
      // Start animation
      advanceStep(); // Run immediately
      bbTimer = setInterval(advanceStep, 1800);

      try {
        const res  = await fetch(`${API}/recommend`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            budget, purpose: selectedPurpose,
            extras: allExtras, storeId: STORE_ID
          })
        });
        const data = await res.json();
        if (bbTimer) clearInterval(bbTimer);
        
        // Mark all steps as complete
        document.querySelectorAll('.bb-load-step').forEach(s => {
          s.classList.remove('active');
          s.classList.add('done');
        });
        
        $('bb-s5').classList.remove('active');
        $('bb-s6').classList.add('active');
        setProgress(100);

        if (data.success) {
          _lastBuilds = data.builds || [];
          _lastCurrency = data.currency || CURRENCY;
          renderResults(
            data.builds || [],
            data.currency || CURRENCY,
            data.canBuild !== false,
            data.noBuildsReason || ''
          );
        } else {
          renderError(data.error || 'Something went wrong.', data.limitReached);
        }
      } catch {
        if (bbTimer) clearInterval(bbTimer);
        
        // Mark all steps as complete
        document.querySelectorAll('.bb-load-step').forEach(s => {
          s.classList.remove('active');
          s.classList.add('done');
        });
        
        $('bb-s5').classList.remove('active');
        $('bb-s6').classList.add('active');
        setProgress(100);
        renderError('Could not connect. Please try again.', false, () => $('bb-build-btn').click());
      }
    };

    $('bb-restart-btn').onclick = () => {
      selectedPurpose = '';
      selectedExtras  = [];
      $('bb-budget').value       = '';
      $('bb-extras-text').value  = '';
      document.querySelectorAll('.bb-chip').forEach(c => {
        c.classList.remove('sel');
        c.setAttribute('aria-pressed', 'false');
      });
      document.querySelectorAll('.bb-load-step').forEach(s => s.classList.remove('active', 'done'));
      goTo('s6','s1',0);
    };

    $('bb-download-btn').onclick = async () => {
      await generatePDF(_lastBuilds, _lastCurrency, $('bb-download-btn'), false);
    };
    // Modal close button
    const modalClose = document.getElementById('bb-modal-close');
    if (modalClose) {
      modalClose.onclick = () => {
        document.getElementById('bb-modal-overlay').classList.remove('open');
      };
    }

    // Close modal on overlay click
    document.getElementById('bb-modal-overlay').onclick = (e) => {
      if (e.target === document.getElementById('bb-modal-overlay')) {
        document.getElementById('bb-modal-overlay').classList.remove('open');
      }
    };

    // Modal download button
    const modalDownload = document.getElementById('bb-modal-download');
    if (modalDownload) {
      modalDownload.onclick = async () => {
        if (_currentBuild) {
          await generatePDF([_currentBuild], _lastCurrency, modalDownload, true);
        }
      };
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const overlay = document.getElementById('bb-modal-overlay');
        if (overlay) overlay.classList.remove('open');
      }
    });
  }

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
      document.getElementById('bb-download-btn').style.display = 'none';
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

    document.getElementById('bb-download-btn').style.display = 'flex';

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
    const isCompatible = build.compatible !== false;

    // Set current build for modal download
    _currentBuild = build;

    // Header
    document.getElementById('bb-modal-tier-badge').textContent = build.tier || 'Recommended Build';
    document.getElementById('bb-modal-title').textContent      = build.buildName;
    document.getElementById('bb-modal-tagline').textContent    = build.tagline || '';

    // Compatibility badge
    const compatibilityBadge = isCompatible 
      ? `<div class="bb-compatibility-badge compatible">✅ All parts verified compatible</div>`
      : `<div class="bb-compatibility-badge incompatible">⚠️ ${build.compatibilityNote || 'Compatibility issues detected'}</div>`;

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
            ${p.reason ? `<div class="bb-modal-part-reason">${p.reason}</div>` : ''}
          </div>
          <div class="bb-modal-part-price">${currency} ${Number(totalPrice).toLocaleString()}</div>
        </div>`;
    }).join('');

    const missingHtml = (build.missingCategories && build.missingCategories.length > 0)
      ? `<div class="bb-modal-missing">⚠️ Not available in store: ${build.missingCategories.join(', ')}</div>`
      : '';

    document.getElementById('bb-modal-content').innerHTML = `
      ${compatibilityBadge}

      ${build.summary ? `
        <div class="bb-modal-summary">${build.summary}</div>
      ` : ''}

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
  }

  // ─── PDF GENERATION ───────────────────────────────────────
  async function generatePDF(builds, currency, btn, singleBuild = false) {
    // Wait for html2pdf to be loaded
    if (!window.html2pdf) {
      btn.innerHTML = '⏳ Loading…';
      // Poll for html2pdf availability
      let attempts = 0;
      const maxAttempts = 20; // Wait up to 2 seconds
      while (!window.html2pdf && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      if (!window.html2pdf) {
        btn.innerHTML = '❌ Error';
        setTimeout(() => { btn.innerHTML = btn.originalText || '📄 PDF'; }, 2000);
        return;
      }
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Generating…';
    btn.disabled = true;

    try {
      let htmlContent = '';

      if (!singleBuild) {
        // Cover page for all builds
        htmlContent += `
          <div style="page-break-after: always; padding: 60px 40px; font-family: 'Inter', sans-serif; color: #111111; background: #ffffff; min-height: 100vh;">
            <div style="text-align: center; margin-bottom: 60px;">
              <h1 style="font-size: 32px; font-weight: 700; color: #111111; margin-bottom: 20px;">Your PC Build Report</h1>
              <p style="font-size: 16px; color: #666666; margin: 0;">Generated by BuildBot AI</p>
            </div>
          </div>
        `;
      }

      // Generate each build
      builds.forEach((build, index) => {
        const isCompatible = build.compatible !== false;
        const compatibilityBadge = isCompatible 
          ? `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #edf7f2; color: #1a7a4a; border: 1px solid #1a7a4a; border-radius: 8px; font-size: 12px; font-weight: 600; margin-bottom: 20px;">
              ✅ All parts verified compatible
            </div>`
          : `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; background: #fef3e2; color: #b45309; border: 1px solid #b45309; border-radius: 8px; font-size: 12px; font-weight: 600; margin-bottom: 20px;">
              ⚠️ ${build.compatibilityNote || 'Compatibility issues detected'}
            </div>`;

        const partsTable = (build.parts || []).map(p => {
          const qty = p.quantity || 1;
          const totalPrice = p.totalPrice || (p.price * qty);
          return `
            <tr style="border-bottom: 1px solid #e0e0e0;">
              <td style="padding: 12px 8px; vertical-align: top; width: 120px;">
                <span style="background: #f5f5f5; color: #666666; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${p.category}
                </span>
              </td>
              <td style="padding: 12px 8px; vertical-align: top;">
                <div style="font-weight: 600; color: #111111; margin-bottom: 4px;">${p.name}</div>
                ${p.reason ? `<div style="font-size: 11px; color: #666666; line-height: 1.4;">${p.reason}</div>` : ''}
                ${qty > 1 ? `<div style="display: inline-block; background: #fef3e2; color: #b45309; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; margin-top: 4px;">×${qty}</div>` : ''}
              </td>
              <td style="padding: 12px 8px; vertical-align: top; text-align: right; width: 120px; font-weight: 600; color: #111111;">
                ${currency} ${Number(totalPrice).toLocaleString()}
              </td>
            </tr>
          `;
        }).join('');

        const missingCategoriesHtml = (build.missingCategories && build.missingCategories.length > 0)
          ? `<div style="background: #fef3e2; border: 1px solid #b45309; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; color: #b45309;">
              ⚠️ Not available in store: ${build.missingCategories.join(', ')}
            </div>`
          : '';

        const tipsHtml = build.tips
          ? `<div style="background: #f8f9fa; border-left: 3px solid #7c6af7; border-radius: 0 8px 8px 0; padding: 12px; margin: 16px 0; font-size: 12px; color: #666666; line-height: 1.6;">
              💡 ${build.tips}
            </div>`
          : '';

        const totalBoxStyle = build.withinBudget 
          ? 'background: #edf7f2; border: 1px solid #1a7a4a; color: #1a7a4a;'
          : 'background: #fef3e2; border: 1px solid #b45309; color: #b45309;';

        htmlContent += `
          <div style="padding: 40px; font-family: 'Inter', sans-serif; color: #111111; background: #ffffff; ${singleBuild ? '' : 'page-break-before: always;'}">
            <!-- Build Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
              <div>
                <div style="background: rgba(124, 106, 247, 0.1); color: #7c6af7; border: 1px solid rgba(124, 106, 247, 0.2); padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; display: inline-block; margin-bottom: 12px;">
                  ${build.tier || `Build ${index + 1}`}
                </div>
                <h2 style="font-size: 24px; font-weight: 700; color: #111111; margin: 0 0 8px 0;">${build.buildName}</h2>
                <p style="font-size: 14px; color: #666666; margin: 0; line-height: 1.5;">${build.tagline || build.summary || ''}</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 20px; font-weight: 700; color: #111111;">${currency} ${Number(build.totalPrice).toLocaleString()}</div>
              </div>
            </div>

            <!-- Compatibility Badge -->
            ${compatibilityBadge}

            <!-- Why This Build -->
            ${build.summary ? `
              <div style="background: #f5f5f5; border-left: 3px solid #7c6af7; border-radius: 0 8px 8px 0; padding: 16px; margin-bottom: 24px;">
                <h3 style="font-size: 14px; font-weight: 700; color: #111111; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">Why This Build?</h3>
                <p style="font-size: 13px; color: #666666; margin: 0; line-height: 1.6;">${build.summary}</p>
              </div>
            ` : ''}

            <!-- Components Table -->
            <h3 style="font-size: 14px; font-weight: 700; color: #111111; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Components</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #111111; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;">Category</th>
                  <th style="padding: 12px 8px; text-align: left; font-weight: 600; color: #111111; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;">Part Name + Reason</th>
                  <th style="padding: 12px 8px; text-align: right; font-weight: 600; color: #111111; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e0e0e0;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${partsTable}
              </tbody>
            </table>

            <!-- Missing Categories -->
            ${missingCategoriesHtml}

            <!-- Total Cost -->
            <div style="${totalBoxStyle} border-radius: 12px; padding: 20px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-size: 16px; font-weight: 600;">
                  ${build.withinBudget ? '✅ Total Cost' : '⚠️ Over Budget'}
                </div>
                <div style="font-size: 24px; font-weight: 800;">
                  ${currency} ${Number(build.totalPrice).toLocaleString()}
                </div>
              </div>
              ${build.budgetRemaining > 0 ? `
                <div style="text-align: right; margin-top: 8px; font-size: 14px; color: #1a7a4a; font-weight: 600;">
                  ↳ ${currency} ${Number(build.budgetRemaining).toLocaleString()} remains from your budget
                </div>
              ` : ''}
            </div>

            <!-- Tips -->
            ${tipsHtml}

            <!-- Budget Advice -->
            ${build.budgetAdvice ? `
              <div style="background: #f8f9fa; border-left: 3px solid #7c6af7; border-radius: 0 8px 8px 0; padding: 12px; margin: 16px 0; font-size: 12px; color: #666666; line-height: 1.6;">
                💰 ${build.budgetAdvice}
              </div>
            ` : ''}

            <!-- Footer -->
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #666666;">
              <div>Generated by BuildBot</div>
              <div>${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        `;
      });

      const filename = singleBuild 
        ? `BuildBot_${builds[0]?.buildName?.replace(/[^a-zA-Z0-9]/g, '_') || 'Build'}.pdf`
        : 'BuildBot_All_Builds.pdf';

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
      };

      await window.html2pdf().set(opt).from(htmlContent).save();

      btn.innerHTML = '✅ Downloaded!';
      setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);

    } catch (e) {
      console.error("PDF Gen Error:", e);
      btn.innerHTML = '❌ Error';
      setTimeout(() => { 
        btn.innerHTML = originalText;
        btn.disabled = false;
      }, 2000);
    }
  }

  // ─── RENDER ERROR ─────────────────────────────────────────
  function renderError(msg, limitReached, onRetry) {
    document.getElementById('bb-results').innerHTML = `
      <div class="bb-no-builds">
        <span class="bb-no-builds-icon">${limitReached ? '⏳' : '😔'}</span>
        <div class="bb-no-builds-title">${limitReached ? 'Limit Reached' : 'Something went wrong'}</div>
        <div class="bb-no-builds-msg">${msg || "We couldn't generate recommendations right now."}</div>
        <div class="bb-no-builds-suggestion">Please try again later or contact the store directly.</div>
        ${!limitReached ? '<button class="bb-btn bb-retry-btn" style="margin-top: 16px;">Try Again</button>' : ''}
      </div>`;
    document.getElementById('bb-download-btn').style.display = 'none';
    
    const retryBtn = document.querySelector('.bb-retry-btn');
    if (retryBtn && onRetry) retryBtn.onclick = onRetry;
  }

  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();