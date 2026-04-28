(function () {
  const script    = document.currentScript ||
                    document.querySelector('script[data-store-id]');
  const STORE_ID  = script ? script.getAttribute('data-store-id') : null;
  const API       = 'https://buildbot-production.up.railway.app/api';

  let BRAND_COLOR  = '#7c6af7';
  let WIDGET_BG    = '#1a1d27';
  let CURRENCY     = 'PKR';
  let WIDGET_TITLE = 'BuildBot';
  let WELCOME_MSG  = 'Tell me your budget and what you need — I will find the best parts from this store for you.';
  let BUTTON_TEXT  = 'Get Started';

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
      const res  = await fetch(`${API}/store-config/${STORE_ID}`);
      const data = await res.json();
      if (data.success) {
        // If store owner disabled the widget, don't show it
        if (data.widgetEnabled === false) {
          console.log('BuildBot: Widget is disabled for this store.');
          return;
        }
        BRAND_COLOR  = data.brandColor  || BRAND_COLOR;
        WIDGET_BG    = data.widgetBg    || WIDGET_BG;
        CURRENCY     = data.currency    || CURRENCY;
        WIDGET_TITLE = data.widgetTitle || WIDGET_TITLE;
        WELCOME_MSG  = data.welcomeMsg  || WELCOME_MSG;
        BUTTON_TEXT  = data.buttonText  || BUTTON_TEXT;
      }
    } catch(e) {}
    injectStyles();
    injectHTML();
    bindEvents();
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
    link.href = API.replace('/api', '/widget.css');
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
          <div class="bb-input-hint">Enter your total budget in ${CURRENCY}. You'll get 3 builds to choose from.</div>
          <div class="bb-label">Quick select</div>
          <div class="bb-chips" id="bb-budget-chips">
            <div class="bb-chip" data-val="50000">50,000</div>
            <div class="bb-chip" data-val="80000">80,000</div>
            <div class="bb-chip" data-val="120000">1,20,000</div>
            <div class="bb-chip" data-val="200000">2,00,000</div>
          </div>
          <button class="bb-btn" id="bb-next-s2">Next →</button>
        </div>

        <!-- S3: Purpose -->
        <div class="bb-screen" id="bb-s3">
          <button class="bb-back" id="bb-back-s3">← Back</button>
          <div class="bb-step-label">Step 2 of 3</div>
          <div class="bb-screen-title" style="font-size:17px;">What will you build it for?</div>
          <div class="bb-chips" id="bb-purposes">
            <div class="bb-chip">🏢 Office Work</div>
            <div class="bb-chip">📚 Studies</div>
            <div class="bb-chip">💻 Coding</div>
            <div class="bb-chip">🎨 Designing</div>
            <div class="bb-chip">🎬 Video Editing</div>
            <div class="bb-chip">🎮 Gaming</div>
            <div class="bb-chip">📡 Streaming</div>
            <div class="bb-chip">🔁 Mixed Use</div>
          </div>
          <button class="bb-btn" id="bb-next-s3">Next →</button>
        </div>

        <!-- S4: Extras -->
        <div class="bb-screen" id="bb-s4">
          <button class="bb-back" id="bb-back-s4">← Back</button>
          <div class="bb-label">Any extras? (optional)</div>
          <div class="bb-chips" id="bb-extras">
            <div class="bb-chip">🖥️ Monitor</div>
            <div class="bb-chip">⌨️ Keyboard</div>
            <div class="bb-chip">🖱️ Mouse</div>
            <div class="bb-chip">🎧 Headset</div>
            <div class="bb-chip">📷 Webcam</div>
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
          <button id="bb-modal-close">✕</button>
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

    $('bb-budget-chips').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        $('bb-budget-chips').querySelectorAll('.bb-chip')
          .forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
        $('bb-budget').value = chip.dataset.val;
      };
    });

    $('bb-next-s2').onclick = () => {
      if (!$('bb-budget').value || $('bb-budget').value <= 0)
        return alert('Please enter your budget!');
      goTo('s2','s3',2);
    };

    $('bb-back-s2').onclick = () => goTo('s2','s1',0);

    $('bb-purposes').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        $('bb-purposes').querySelectorAll('.bb-chip')
          .forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
        selectedPurpose = chip.textContent.trim();
      };
    });

    $('bb-next-s3').onclick = () => {
      if (!selectedPurpose) return alert('Please select a purpose!');
      goTo('s3','s4',3);
    };

    $('bb-back-s3').onclick = () => goTo('s3','s2',1);

    $('bb-extras').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        chip.classList.toggle('sel');
        const txt = chip.textContent.trim();
        if (chip.classList.contains('sel')) selectedExtras.push(txt);
        else selectedExtras = selectedExtras.filter(e => e !== txt);
      };
    });

    $('bb-back-s4').onclick = () => goTo('s4','s3',2);

    $('bb-build-btn').onclick = async () => {
      const budget    = $('bb-budget').value;
      const extraText = $('bb-extras-text').value;
      const allExtras = [...selectedExtras, extraText].filter(Boolean).join(', ');

      goTo('s4','s5',4);

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
      window._bbStepTimer = stepTimer;

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
        if (window._bbStepTimer) clearInterval(window._bbStepTimer);
        
        $('bb-s5').classList.remove('active');
        $('bb-s6').classList.add('active');
        setProgress(100);

        if (data.success) {
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
        if (window._bbStepTimer) clearInterval(window._bbStepTimer);
        $('bb-s5').classList.remove('active');
        $('bb-s6').classList.add('active');
        setProgress(100);
        renderError('Could not connect. Please try again.');
      }
    };

    $('bb-restart-btn').onclick = () => {
      selectedPurpose = '';
      selectedExtras  = [];
      $('bb-budget').value       = '';
      $('bb-extras-text').value  = '';
      document.querySelectorAll('.bb-chip').forEach(c => c.classList.remove('sel'));
      goTo('s6','s1',0);
    };

    $('bb-download-btn').onclick = async () => {
      const btn = $('bb-download-btn');
      const originalText = btn.innerHTML;
      btn.innerHTML = '⏳ Generating...';
      btn.style.opacity = '0.7';

      try {
        if (!window.html2pdf) {
           console.error("html2pdf library not loaded yet.");
           btn.innerHTML = originalText;
           btn.style.opacity = '1';
           return;
        }
        
        // Use an inline HTML string with styles for html2pdf to ensure it is not blank
        const resultsHtml = $('bb-results').innerHTML;
        const pdfContent = document.createElement('div');
        pdfContent.innerHTML = `
          <div style="padding: 40px; font-family: 'Montserrat', sans-serif; color: #000; width: 800px; background: #fff;">
            <style>
              * { color: #000 !important; }
              .bb-part { border: 1px solid #ccc; padding: 15px; margin-bottom: 10px; border-radius: 8px; background: #f9f9f9; }
              .bb-total { border: 2px solid #2ecc71; padding: 20px; border-radius: 8px; margin-top: 20px; background: #f0fdf4; }
              .bb-tips { margin-top: 20px; padding: 15px; border-left: 4px solid #7c6af7; background: #f8f9fa; }
              .bb-part-cat { font-size: 11px; background: #eee; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 5px; }
              .bb-part-top { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
            </style>
            ${resultsHtml}
          </div>
        `;

        const opt = {
          margin:       0.5,
          filename:     'BuildBot_Recommendation.pdf',
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        await window.html2pdf().set(opt).from(pdfContent).save();

        btn.innerHTML = '✅ Downloaded';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);

      } catch (e) {
        console.error("PDF Gen Error:", e);
        btn.innerHTML = '❌ Error';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
      } finally {
        btn.style.opacity = '1';
      }
    };
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
    document.getElementById('bb-download-btn').style.display = 'none';
  }

  initWidget();
})();