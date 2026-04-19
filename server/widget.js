(function () {
  const script     = document.currentScript ||
                     document.querySelector('script[data-store-id]');
  const STORE_ID   = script ? script.getAttribute('data-store-id') : null;
  const API        = 'https://buildbot-production.up.railway.app/api';

  let BRAND_COLOR  = '#7c6af7';
  let CURRENCY     = 'PKR';
  let WIDGET_TITLE = 'BuildBot';
  let WELCOME_MSG  = 'Tell me your budget and what you need — I will find the best parts from this store for you.';
  let BUTTON_TEXT  = 'Get Started';

  async function initWidget() {
    try {
      const res  = await fetch(`${API}/store-config/${STORE_ID}`);
      const data = await res.json();
      if (data.success) {
        BRAND_COLOR  = data.brandColor  || '#7c6af7';
        CURRENCY     = data.currency    || 'PKR';
        WIDGET_TITLE = data.widgetTitle || 'BuildBot';
        WELCOME_MSG  = data.welcomeMsg  || 'Tell me your budget and what you need — I will find the best parts from this store for you.';
        BUTTON_TEXT  = data.buttonText  || 'Get Started';
      }
    } catch (e) {}
    injectStyles();
    injectHTML();
    bindEvents();
  }

  // ─── STYLES ───────────────────────────────────────────
  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
      #bb-launcher {
        position:fixed;bottom:28px;right:28px;width:58px;height:58px;
        background:${BRAND_COLOR};border-radius:50%;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 4px 20px ${BRAND_COLOR}88;z-index:999999;
        transition:transform .2s;border:none;font-size:24px;
      }
      #bb-launcher:hover{transform:scale(1.1);}
      #bb-panel {
        position:fixed;bottom:100px;right:28px;width:360px;max-height:600px;
        background:#1a1d27;border:1px solid #2a2d3e;border-radius:18px;
        box-shadow:0 8px 40px rgba(0,0,0,.5);z-index:999998;
        display:none;flex-direction:column;overflow:hidden;
        font-family:'Segoe UI',sans-serif;
      }
      #bb-panel.open{display:flex;}
      #bb-header {
        background:${BRAND_COLOR};padding:16px 20px;
        display:flex;align-items:center;justify-content:space-between;
        flex-shrink:0;
      }
      .bb-title{color:#fff;font-weight:700;font-size:15px;}
      .bb-sub{color:rgba(255,255,255,.75);font-size:11px;margin-top:2px;}
      #bb-close {
        background:rgba(255,255,255,.15);border:none;color:#fff;
        width:28px;height:28px;border-radius:50%;cursor:pointer;
        font-size:14px;display:flex;align-items:center;justify-content:center;
      }
      #bb-close:hover{background:rgba(255,255,255,.25);}
      #bb-progress{
        display:flex;gap:4px;padding:12px 20px;background:#13151f;
        flex-shrink:0;border-bottom:1px solid #2a2d3e;
      }
      .bb-prog-step{
        flex:1;height:3px;border-radius:2px;background:#2a2d3e;transition:background .3s;
      }
      .bb-prog-step.done{background:${BRAND_COLOR};}
      #bb-body{padding:20px;overflow-y:auto;flex:1;color:#e0e0e0;}
      .bb-screen{display:none;} .bb-screen.active{display:block;}
      .bb-label{font-size:11px;color:#888;margin-bottom:6px;font-weight:700;
        text-transform:uppercase;letter-spacing:.5px;}
      .bb-input{width:100%;padding:11px 14px;background:#0f1117;
        border:1px solid #2a2d3e;border-radius:8px;color:#fff;font-size:13px;
        margin-bottom:14px;outline:none;box-sizing:border-box;transition:border .2s;}
      .bb-input:focus{border-color:${BRAND_COLOR};}
      .bb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
      .bb-chip{padding:7px 14px;border-radius:20px;border:1px solid #2a2d3e;
        background:#0f1117;color:#ccc;font-size:12px;cursor:pointer;transition:all .2s;}
      .bb-chip:hover{border-color:${BRAND_COLOR};color:${BRAND_COLOR};}
      .bb-chip.sel{background:${BRAND_COLOR};border-color:${BRAND_COLOR};color:#fff;}
      .bb-btn{width:100%;padding:13px;background:${BRAND_COLOR};color:#fff;
        border:none;border-radius:8px;font-size:14px;font-weight:600;
        cursor:pointer;margin-top:6px;transition:opacity .2s;}
      .bb-btn:hover{opacity:.9;}
      .bb-btn:disabled{opacity:.4;cursor:not-allowed;}
      .bb-back{background:none;border:none;color:#888;font-size:12px;
        cursor:pointer;margin-bottom:16px;padding:0;display:flex;align-items:center;gap:4px;}
      .bb-back:hover{color:#fff;}
      .bb-loading{text-align:center;padding:40px 0;color:#888;font-size:13px;}
      .bb-spinner{width:36px;height:36px;border:3px solid #2a2d3e;
        border-top-color:${BRAND_COLOR};border-radius:50%;
        animation:bb-spin .8s linear infinite;margin:0 auto 14px;}
      @keyframes bb-spin{to{transform:rotate(360deg);}}
      .bb-build-name{font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;}
      .bb-summary{font-size:12px;color:#888;margin-bottom:16px;line-height:1.6;}
      .bb-part{background:#0f1117;border:1px solid #2a2d3e;border-radius:8px;
        padding:11px 14px;margin-bottom:8px;}
      .bb-part-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
      .bb-part-name{font-size:13px;color:#fff;font-weight:500;}
      .bb-part-price{font-size:13px;color:${BRAND_COLOR};font-weight:700;}
      .bb-part-cat{font-size:10px;color:#888;background:#1a1d27;padding:2px 8px;
        border-radius:4px;display:inline-block;margin-bottom:4px;}
      .bb-part-reason{font-size:11px;color:#666;}
      .bb-total{background:#1a2a1a;border:1px solid #2ecc71;border-radius:8px;
        padding:12px 14px;display:flex;justify-content:space-between;
        align-items:center;margin:12px 0;}
      .bb-total-label{font-size:13px;color:#888;}
      .bb-total-price{font-size:18px;font-weight:700;color:#2ecc71;}
      .bb-over{background:#2a1a1a;border-color:#e74c3c;}
      .bb-over .bb-total-price{color:#e74c3c;}
      .bb-tips{background:#12141e;border-left:3px solid ${BRAND_COLOR};
        padding:10px 14px;font-size:12px;color:#888;
        border-radius:0 6px 6px 0;margin-bottom:14px;line-height:1.5;}
      .bb-restart{width:100%;padding:11px;background:transparent;
        color:${BRAND_COLOR};border:1px solid ${BRAND_COLOR};border-radius:8px;
        font-size:13px;cursor:pointer;transition:all .2s;}
      .bb-restart:hover{background:${BRAND_COLOR};color:#fff;}
      .bb-welcome-icon{font-size:40px;text-align:center;margin-bottom:12px;}
      .bb-welcome-title{font-size:17px;font-weight:700;color:#fff;
        text-align:center;margin-bottom:8px;}
      .bb-welcome-text{font-size:13px;color:#888;text-align:center;
        line-height:1.6;margin-bottom:24px;}
      .bb-error{text-align:center;padding:20px 0;}
      .bb-error .bb-ei{font-size:36px;margin-bottom:12px;}
      .bb-error p{font-size:13px;color:#e74c3c;}
      .bb-powered{text-align:center;font-size:10px;color:#444;
        padding:8px;border-top:1px solid #2a2d3e;flex-shrink:0;}
      .bb-powered a{color:#555;text-decoration:none;}
      .bb-budget-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
      .bb-currency{background:#0f1117;border:1px solid #2a2d3e;border-radius:8px;
        padding:11px 12px;color:#888;font-size:13px;white-space:nowrap;}
    `;
    document.head.appendChild(s);
  }

  // ─── HTML ─────────────────────────────────────────────
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
        <div class="bb-prog-step" id="prog-1"></div>
        <div class="bb-prog-step" id="prog-2"></div>
        <div class="bb-prog-step" id="prog-3"></div>
        <div class="bb-prog-step" id="prog-4"></div>
      </div>

      <div id="bb-body">

        <!-- S1: Welcome -->
        <div class="bb-screen active" id="bb-s1">
          <div class="bb-welcome-icon">🖥️</div>
          <div class="bb-welcome-title">Build Your Perfect PC</div>
<div class="bb-welcome-text">${WELCOME_MSG}</div>
         <button class="bb-btn" id="bb-start-btn">${BUTTON_TEXT} →</button>
        </div>

        <!-- S2: Budget -->
        <div class="bb-screen" id="bb-s2">
          <button class="bb-back" id="bb-back-s2">← Back</button>
          <div class="bb-label">What's your budget?</div>
          <div class="bb-budget-row">
            <div class="bb-currency" id="bb-curr-label">${CURRENCY}</div>
            <input class="bb-input" id="bb-budget" type="number"
              placeholder="e.g. 80000" style="margin:0;flex:1;"/>
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
          <button class="bb-back" id="bb-back-s3">← Back</button>
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
          <div class="bb-loading">
            <div class="bb-spinner"></div>
            <div>Analyzing your needs and<br/>finding the best parts...</div>
          </div>
        </div>

        <!-- S6: Results -->
        <div class="bb-screen" id="bb-s6">
          <div id="bb-results"></div>
          <button class="bb-restart" id="bb-restart-btn">🔄 Start Over</button>
        </div>

      </div>

      <div class="bb-powered">
        Powered by <a href="#" target="_blank">BuildBot</a>
      </div>
    `;

    document.body.appendChild(launcher);
    document.body.appendChild(panel);
  }

  // ─── EVENTS ───────────────────────────────────────────
  function bindEvents() {
    let selectedPurpose = '';
    let selectedExtras  = [];

    const $ = id => document.getElementById(id);

    // Toggle panel
    $('bb-launcher').onclick = () => $('bb-panel').classList.toggle('open');
    $('bb-close').onclick    = () => $('bb-panel').classList.remove('open');

    // Progress bar
    function setProgress(step) {
      for (let i = 1; i <= 4; i++) {
        $(`prog-${i}`).classList.toggle('done', i <= step);
      }
    }

    // Screen navigation
    function goTo(from, to, step) {
      $(`bb-${from}`).classList.remove('active');
      $(`bb-${to}`).classList.add('active');
      setProgress(step);
    }

    // S1 → S2
    $('bb-start-btn').onclick = () => goTo('s1', 's2', 1);

    // Budget chips
    $('bb-budget-chips').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        $('bb-budget-chips').querySelectorAll('.bb-chip')
          .forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
        $('bb-budget').value = chip.dataset.val;
      };
    });

    // S2 → S3
    $('bb-next-s2').onclick = () => {
      if (!$('bb-budget').value || $('bb-budget').value <= 0)
        return alert('Please enter your budget!');
      goTo('s2', 's3', 2);
    };

    // Back S2 → S1
    $('bb-back-s2').onclick = () => goTo('s2', 's1', 0);

    // Purpose chips
    $('bb-purposes').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        $('bb-purposes').querySelectorAll('.bb-chip')
          .forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');
        selectedPurpose = chip.textContent.trim();
      };
    });

    // S3 → S4
    $('bb-next-s3').onclick = () => {
      if (!selectedPurpose) return alert('Please select a purpose!');
      goTo('s3', 's4', 3);
    };

    // Back S3 → S2
    $('bb-back-s3').onclick = () => goTo('s3', 's2', 1);

    // Extras chips (multi-select)
    $('bb-extras').querySelectorAll('.bb-chip').forEach(chip => {
      chip.onclick = () => {
        chip.classList.toggle('sel');
        const txt = chip.textContent.trim();
        if (chip.classList.contains('sel')) {
          selectedExtras.push(txt);
        } else {
          selectedExtras = selectedExtras.filter(e => e !== txt);
        }
      };
    });

    // Back S4 → S3
    $('bb-back-s4').onclick = () => goTo('s4', 's3', 2);

    // Build!
    $('bb-build-btn').onclick = async () => {
      const budget    = $('bb-budget').value;
      const extraText = $('bb-extras-text').value;
      const allExtras = [...selectedExtras, extraText].filter(Boolean).join(', ');

      goTo('s4', 's5', 4);

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
        renderError('Could not connect to BuildBot server.');
      }
    };

    // Restart
    $('bb-restart-btn').onclick = () => {
      selectedPurpose = '';
      selectedExtras  = [];
      $('bb-budget').value        = '';
      $('bb-extras-text').value   = '';
      document.querySelectorAll('.bb-chip').forEach(c => c.classList.remove('sel'));
      goTo('s6', 's1', 0);
    };
  }

  // ─── RENDER RESULTS ───────────────────────────────────
  function renderResults(r, currency) {
    const over     = !r.withinBudget;
    const partsHtml = r.parts.map(p => `
      <div class="bb-part">
        <div class="bb-part-cat">${p.category}</div>
        <div class="bb-part-top">
          <div class="bb-part-name">${p.name}</div>
          <div class="bb-part-price">${currency} ${Number(p.price).toLocaleString()}</div>
        </div>
        <div class="bb-part-reason">${p.reason}</div>
      </div>
    `).join('');

    document.getElementById('bb-results').innerHTML = `
      <div class="bb-build-name">${r.buildName}</div>
      <div class="bb-summary">${r.summary}</div>
      ${partsHtml}
      <div class="bb-total ${over ? 'bb-over' : ''}">
        <div class="bb-total-label">${over ? '⚠️ Over budget' : '✅ Total Cost'}</div>
        <div class="bb-total-price">${currency} ${Number(r.totalPrice).toLocaleString()}</div>
      </div>
      <div class="bb-tips">💡 ${r.tips}</div>
    `;
  }

  function renderError(msg, limitReached) {
    // Customer friendly message always — never show business/billing info
    document.getElementById('bb-results').innerHTML = `
      <div class="bb-error">
        <div class="bb-ei">😔</div>
        <p style="color:#ccc;font-size:14px;">Sorry, we couldn't generate a recommendation right now.</p>
        <p style="color:#666;font-size:12px;margin-top:8px;">Please try again later or contact the store directly.</p>
      </div>
    `;
  }

  // ─── START ────────────────────────────────────────────
  initWidget();

})();