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
      #bb-launcher, #bb-panel {
        --bb-brand: ${BRAND_COLOR};
        --bb-bg: ${WIDGET_BG};
        --bb-btn-text: ${btnTextColor};
        --bb-border: ${borderRgba};
      }
    `;
    document.head.appendChild(s);

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
    launcher.innerHTML = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    const panel = document.createElement('div');
    panel.id    = 'bb-panel';
    panel.innerHTML = `
      <div id="bb-header">
        <div class="bb-title-row">
          <div class="bb-title-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </div>
          <div>
            <div class="bb-title">${WIDGET_TITLE}</div>
            <div class="bb-sub">AI PC Build Recommender</div>
          </div>
        </div>
        <button id="bb-close" title="Close">
          <svg viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div id="bb-progress">
        <div class="bb-prog-step" id="prog-1"></div>
        <div class="bb-prog-step" id="prog-2"></div>
        <div class="bb-prog-step" id="prog-3"></div>
        <div class="bb-prog-step" id="prog-4"></div>
      </div>

      <div id="bb-body">
        <!-- S1: Welcome -->
        <div class="bb-screen active" id="bb-s1">
          <div class="bb-welcome-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          </div>
          <div class="bb-welcome-title">Build Your Perfect PC</div>
          <div class="bb-welcome-text">${WELCOME_MSG}</div>
          <button class="bb-btn" id="bb-start-btn">${BUTTON_TEXT} →</button>
        </div>

        <!-- S2: Budget -->
        <div class="bb-screen" id="bb-s2">
          <button class="bb-back" id="bb-back-s2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <div class="bb-label">What's your budget?</div>
          <div class="bb-budget-row">
            <div class="bb-currency" id="bb-curr-label">${CURRENCY}</div>
            <input class="bb-input" id="bb-budget" type="number" placeholder="e.g. 80000" style="margin:0;flex:1;"/>
          </div>
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
          <button class="bb-back" id="bb-back-s3">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
          <div class="bb-label">What will you use it for?</div>
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
          <button class="bb-back" id="bb-back-s4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </button>
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
          <button class="bb-btn" id="bb-build-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Build My PC
          </button>
        </div>

        <!-- S5: Loading -->
        <div class="bb-screen" id="bb-s5">
          <div class="bb-loading">
            <div class="bb-loader-container">
              <div class="bb-loader-dot"></div>
              <div class="bb-loader-dot"></div>
              <div class="bb-loader-dot"></div>
            </div>
            <div class="bb-loader-text">Analyzing needs & finding parts...</div>
          </div>
        </div>

        <!-- S6: Results -->
        <div class="bb-screen" id="bb-s6">
          <div id="bb-results"></div>
          <div class="bb-actions">
            <button class="bb-restart" id="bb-restart-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
              Start Over
            </button>
            <button class="bb-download" id="bb-download-btn" style="display:none;">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              PDF
            </button>
          </div>
        </div>

      </div>

      <div class="bb-powered">
        Powered by <a href="https://buildbot-nine.vercel.app" target="_blank">BuildBot</a>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);
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

    function setProgress(step) {
      for (let i = 1; i <= 4; i++)
        $(`prog-${i}`).classList.toggle('done', i <= step);
    }

    function goTo(from, to, step) {
      $(`bb-${from}`).classList.remove('active');
      $(`bb-${to}`).classList.add('active');
      setProgress(step);
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
        $('bb-s5').classList.remove('active');
        $('bb-s6').classList.add('active');
        if (data.success) {
          renderResults(data.recommendation, data.currency || CURRENCY);
        } else {
          renderError(data.error || 'Something went wrong.', data.limitReached);
        }
      } catch {
        $('bb-s5').classList.remove('active');
        $('bb-s6').classList.add('active');
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
        
        // Create a printable container dynamically
        const printContainer = document.createElement('div');
        printContainer.className = 'bb-pdf-container';
        printContainer.innerHTML = $('bb-results').innerHTML;
        
        // Append temporarily to body so it gets styles, but hide it
        printContainer.style.position = 'absolute';
        printContainer.style.left = '-9999px';
        document.body.appendChild(printContainer);

        const opt = {
          margin:       0.5,
          filename:     'BuildBot_Recommendation.pdf',
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        await window.html2pdf().set(opt).from(printContainer).save();
        
        document.body.removeChild(printContainer);

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
  }

  // ─── RENDER RESULTS ───────────────────────────────────────
  function renderResults(r, currency) {
    const over = !r.withinBudget;
  
    const partsHtml = r.parts.map(p => {
      const qty        = p.quantity || 1;
      const totalPrice = p.totalPrice || (p.price * qty);
      return `
        <div class="bb-part">
          <div class="bb-part-top">
            <div class="bb-part-name">${p.name}</div>
            <div class="bb-part-price">${currency} ${Number(totalPrice).toLocaleString()}</div>
          </div>
          <div class="bb-part-cat">${p.category}${qty > 1 ? ` <span style="color:#f39c12;">×${qty}</span>` : ''}</div>
          ${qty > 1 ? `<div style="font-size:11px;color:#64748b;margin-bottom:4px;">${currency} ${Number(p.price).toLocaleString()} × ${qty} units</div>` : ''}
          <div class="bb-part-reason">${p.reason}</div>
        </div>
      `;
    }).join('');
  
    const missingHtml = r.missingCategories && r.missingCategories.length
      ? `<div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);
          border-radius:12px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#f59e0b;">
          ⚠️ Not available in this store: ${r.missingCategories.join(', ')}
         </div>`
      : '';
  
    const budgetAdviceHtml = r.budgetAdvice
      ? `<div class="bb-tips">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
           ${r.budgetAdvice}
         </div>`
      : '';
  
    document.getElementById('bb-results').innerHTML = `
      <div class="bb-build-name">${r.buildName}</div>
      <div class="bb-summary">${r.summary}</div>
      ${missingHtml}
      ${partsHtml}
      <div class="bb-total ${over ? 'bb-over' : ''}">
        <div class="bb-total-label">${over ? '⚠️ Over budget' : 'Total Cost'}</div>
        <div class="bb-total-price">${currency} ${Number(r.totalPrice).toLocaleString()}</div>
      </div>
      ${r.budgetRemaining > 0
        ? `<div style="font-size:13px;color:#2ecc71;text-align:right;margin-top:-12px;margin-bottom:12px;font-weight:600;">
             Remaining: ${currency} ${Number(r.budgetRemaining).toLocaleString()}
           </div>`
        : ''}
      <div class="bb-tips">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
        ${r.tips}
      </div>
      ${budgetAdviceHtml}
    `;

    document.getElementById('bb-download-btn').style.display = 'flex';
  }

  function renderError(msg, limitReached) {
    document.getElementById('bb-results').innerHTML = `
      <div class="bb-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${limitReached ? '<circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>' : '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'}
        </svg>
        <div class="bb-error-title">${limitReached ? 'Monthly Limit Reached' : 'Oops!'}</div>
        <div class="bb-error-msg">${msg || "We couldn't generate a recommendation right now."}</div>
        <div style="font-size:12px;color:#64748b;margin-top:16px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 8px;">
          Please try again later or contact the store directly.
        </div>
      </div>
    `;
    document.getElementById('bb-download-btn').style.display = 'none';
  }

  initWidget();
})();