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
    const bgRgba        = hexToRgba(WIDGET_BG, 0.85);
    const borderRgba    = hexToRgba(BRAND_COLOR, 0.2);
    const s = document.createElement('style');
    s.textContent = `
      #bb-launcher {
        position:fixed;bottom:28px;right:28px;width:60px;height:60px;
        background:${BRAND_COLOR};border-radius:50%;cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 8px 32px ${hexToRgba(BRAND_COLOR,0.5)};
        z-index:999999;transition:transform .2s,box-shadow .2s;
        border:none;font-size:26px;
      }
      #bb-launcher:hover{
        transform:scale(1.1);
        box-shadow:0 12px 40px ${hexToRgba(BRAND_COLOR,0.7)};
      }
      #bb-panel {
        position:fixed;bottom:100px;right:28px;width:370px;max-height:620px;
        background:${bgRgba};
        backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        border:1px solid ${borderRgba};
        border-radius:20px;
        box-shadow:0 20px 60px rgba(0,0,0,.5),
                   inset 0 1px 0 ${hexToRgba(BRAND_COLOR,0.15)};
        z-index:999998;display:none;flex-direction:column;overflow:hidden;
        font-family:'Segoe UI',sans-serif;
      }
      #bb-panel.open{display:flex;animation:bb-slide-up .3s ease;}
      @keyframes bb-slide-up{
        from{opacity:0;transform:translateY(20px);}
        to{opacity:1;transform:translateY(0);}
      }
      #bb-header {
        background:${hexToRgba(BRAND_COLOR,0.9)};
        backdrop-filter:blur(10px);
        padding:16px 20px;
        display:flex;align-items:center;justify-content:space-between;
        flex-shrink:0;border-bottom:1px solid ${hexToRgba(BRAND_COLOR,0.3)};
      }
      .bb-title{color:${getContrastColor(BRAND_COLOR)};font-weight:700;font-size:15px;}
      .bb-sub{color:${hexToRgba(getContrastColor(BRAND_COLOR),0.7)};font-size:11px;margin-top:2px;}
      #bb-close {
        background:${hexToRgba(getContrastColor(BRAND_COLOR),0.15)};
        border:none;color:${getContrastColor(BRAND_COLOR)};
        width:28px;height:28px;border-radius:50%;cursor:pointer;
        font-size:14px;display:flex;align-items:center;justify-content:center;
        transition:background .2s;
      }
      #bb-close:hover{background:${hexToRgba(getContrastColor(BRAND_COLOR),0.25)};}
      #bb-progress{
        display:flex;gap:4px;padding:10px 20px;
        background:${hexToRgba(WIDGET_BG,0.5)};
        flex-shrink:0;border-bottom:1px solid ${borderRgba};
      }
      .bb-prog-step{
        flex:1;height:3px;border-radius:2px;
        background:${hexToRgba(BRAND_COLOR,0.2)};transition:background .3s;
      }
      .bb-prog-step.done{background:${BRAND_COLOR};}
      #bb-body{padding:20px;overflow-y:auto;flex:1;color:#e0e0e0;}
      #bb-body::-webkit-scrollbar{width:4px;}
      #bb-body::-webkit-scrollbar-track{background:transparent;}
      #bb-body::-webkit-scrollbar-thumb{background:${hexToRgba(BRAND_COLOR,0.3)};border-radius:2px;}
      .bb-screen{display:none;} .bb-screen.active{display:block;}
      .bb-label{
        font-size:11px;color:${hexToRgba('#ffffff',0.5)};
        margin-bottom:6px;font-weight:700;
        text-transform:uppercase;letter-spacing:.5px;
      }
      .bb-input{
        width:100%;padding:11px 14px;
        background:${hexToRgba(WIDGET_BG,0.6)};
        backdrop-filter:blur(10px);
        border:1px solid ${borderRgba};
        border-radius:10px;color:#fff;font-size:13px;
        margin-bottom:14px;outline:none;
        box-sizing:border-box;transition:border .2s,box-shadow .2s;
      }
      .bb-input:focus{
        border-color:${BRAND_COLOR};
        box-shadow:0 0 0 3px ${hexToRgba(BRAND_COLOR,0.15)};
      }
      .bb-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
      .bb-chip{
        padding:7px 14px;border-radius:20px;
        border:1px solid ${borderRgba};
        background:${hexToRgba(WIDGET_BG,0.5)};
        backdrop-filter:blur(5px);
        color:#ccc;font-size:12px;cursor:pointer;transition:all .2s;
      }
      .bb-chip:hover{border-color:${BRAND_COLOR};color:${BRAND_COLOR};}
      .bb-chip.sel{
        background:${BRAND_COLOR};border-color:${BRAND_COLOR};
        color:${btnTextColor};
        box-shadow:0 4px 12px ${hexToRgba(BRAND_COLOR,0.4)};
      }
      .bb-btn{
        width:100%;padding:13px;background:${BRAND_COLOR};
        color:${btnTextColor};border:none;border-radius:10px;
        font-size:14px;font-weight:700;cursor:pointer;margin-top:6px;
        transition:all .2s;letter-spacing:.3px;
        box-shadow:0 4px 16px ${hexToRgba(BRAND_COLOR,0.4)};
      }
      .bb-btn:hover{
        opacity:.9;transform:translateY(-1px);
        box-shadow:0 8px 24px ${hexToRgba(BRAND_COLOR,0.5)};
      }
      .bb-btn:active{transform:translateY(0);}
      .bb-back{
        background:none;border:none;
        color:${hexToRgba('#ffffff',0.4)};
        font-size:12px;cursor:pointer;
        margin-bottom:16px;padding:0;
        display:flex;align-items:center;gap:4px;transition:color .2s;
      }
      .bb-back:hover{color:#fff;}
      .bb-loading{text-align:center;padding:40px 0;color:#888;font-size:13px;}
      .bb-spinner{
        width:40px;height:40px;
        border:3px solid ${hexToRgba(BRAND_COLOR,0.2)};
        border-top-color:${BRAND_COLOR};border-radius:50%;
        animation:bb-spin .8s linear infinite;margin:0 auto 16px;
      }
      @keyframes bb-spin{to{transform:rotate(360deg);}}
      .bb-build-name{font-size:16px;font-weight:700;color:#fff;margin-bottom:4px;}
      .bb-summary{font-size:12px;color:#999;margin-bottom:16px;line-height:1.6;}
      .bb-part{
        background:${hexToRgba(WIDGET_BG,0.6)};
        backdrop-filter:blur(10px);
        border:1px solid ${borderRgba};
        border-radius:10px;padding:12px 14px;margin-bottom:8px;
        transition:border-color .2s;
      }
      .bb-part:hover{border-color:${hexToRgba(BRAND_COLOR,0.4)};}
      .bb-part-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;}
      .bb-part-name{font-size:13px;color:#fff;font-weight:500;}
      .bb-part-price{font-size:13px;color:${BRAND_COLOR};font-weight:700;}
      .bb-part-cat{
        font-size:10px;color:#888;
        background:${hexToRgba(BRAND_COLOR,0.1)};
        padding:2px 8px;border-radius:4px;
        display:inline-block;margin-bottom:4px;
      }
      .bb-part-reason{font-size:11px;color:#666;}
      .bb-total{
        background:${hexToRgba('#2ecc71',0.1)};
        border:1px solid rgba(46,204,113,.3);
        border-radius:10px;padding:14px;
        display:flex;justify-content:space-between;
        align-items:center;margin:12px 0;
      }
      .bb-total-label{font-size:13px;color:#888;}
      .bb-total-price{font-size:20px;font-weight:700;color:#2ecc71;}
      .bb-over{background:rgba(231,76,60,.1);border-color:rgba(231,76,60,.3);}
      .bb-over .bb-total-price{color:#e74c3c;}
      .bb-tips{
        background:${hexToRgba(BRAND_COLOR,0.08)};
        border-left:3px solid ${BRAND_COLOR};
        padding:10px 14px;font-size:12px;color:#888;
        border-radius:0 8px 8px 0;margin-bottom:14px;line-height:1.5;
      }
      .bb-restart{
        width:100%;padding:11px;background:transparent;
        color:${BRAND_COLOR};
        border:1px solid ${hexToRgba(BRAND_COLOR,0.4)};
        border-radius:10px;font-size:13px;cursor:pointer;transition:all .2s;
      }
      .bb-restart:hover{
        background:${hexToRgba(BRAND_COLOR,0.1)};
        border-color:${BRAND_COLOR};
      }
      .bb-welcome-icon{font-size:48px;text-align:center;margin-bottom:12px;}
      .bb-welcome-title{
        font-size:18px;font-weight:700;color:#fff;
        text-align:center;margin-bottom:8px;
      }
      .bb-welcome-text{
        font-size:13px;color:#999;text-align:center;
        line-height:1.7;margin-bottom:24px;
      }
      .bb-error{text-align:center;padding:24px 0;}
      .bb-error .bb-ei{font-size:40px;margin-bottom:12px;}
      .bb-error p{font-size:13px;color:#e74c3c;}
      .bb-powered{
        text-align:center;font-size:10px;
        color:${hexToRgba('#ffffff',0.2)};
        padding:8px;border-top:1px solid ${borderRgba};
        flex-shrink:0;
      }
      .bb-powered a{color:${hexToRgba('#ffffff',0.3)};text-decoration:none;}
      .bb-powered a:hover{color:${BRAND_COLOR};}
      .bb-budget-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;}
      .bb-currency{
        background:${hexToRgba(WIDGET_BG,0.6)};
        border:1px solid ${borderRgba};
        border-radius:10px;padding:11px 12px;
        color:#888;font-size:13px;white-space:nowrap;
      }
    `;
    document.head.appendChild(s);
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

    $('bb-launcher').onclick = () => $('bb-panel').classList.toggle('open');
    $('bb-close').onclick    = () => $('bb-panel').classList.remove('open');

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
  }

  // ─── RENDER RESULTS ───────────────────────────────────────
  function renderResults(r, currency) {
    const over = !r.withinBudget;
  
    const partsHtml = r.parts.map(p => {
      const qty        = p.quantity || 1;
      const totalPrice = p.totalPrice || (p.price * qty);
      return `
        <div class="bb-part">
          <div class="bb-part-cat">${p.category}${qty > 1 ? ` <span style="color:#f39c12;">×${qty}</span>` : ''}</div>
          <div class="bb-part-top">
            <div class="bb-part-name">${p.name}</div>
            <div class="bb-part-price">${currency} ${Number(totalPrice).toLocaleString()}</div>
          </div>
          ${qty > 1 ? `<div style="font-size:11px;color:#666;margin-bottom:3px;">${currency} ${Number(p.price).toLocaleString()} × ${qty} units</div>` : ''}
          <div class="bb-part-reason">${p.reason}</div>
        </div>
      `;
    }).join('');
  
    const missingHtml = r.missingCategories && r.missingCategories.length
      ? `<div style="background:rgba(243,156,18,.08);border:1px solid rgba(243,156,18,.3);
          border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#f39c12;">
          ⚠️ Not available in this store: ${r.missingCategories.join(', ')}
         </div>`
      : '';
  
    const budgetAdviceHtml = r.budgetAdvice
      ? `<div class="bb-tips">💰 ${r.budgetAdvice}</div>`
      : '';
  
    document.getElementById('bb-results').innerHTML = `
      <div class="bb-build-name">${r.buildName}</div>
      <div class="bb-summary">${r.summary}</div>
      ${missingHtml}
      ${partsHtml}
      <div class="bb-total ${over ? 'bb-over' : ''}">
        <div class="bb-total-label">${over ? '⚠️ Over budget' : '✅ Total Cost'}</div>
        <div class="bb-total-price">${currency} ${Number(r.totalPrice).toLocaleString()}</div>
      </div>
      ${r.budgetRemaining > 0
        ? `<div style="font-size:12px;color:#2ecc71;text-align:right;margin-top:-8px;margin-bottom:8px;">
             Remaining: ${currency} ${Number(r.budgetRemaining).toLocaleString()}
           </div>`
        : ''}
      <div class="bb-tips">💡 ${r.tips}</div>
      ${budgetAdviceHtml}
    `;
  }

  function renderError(msg, limitReached) {
    document.getElementById('bb-results').innerHTML = `
      <div class="bb-error">
        <div class="bb-ei">${limitReached ? '⏳' : '🤖💤'}</div>
        <p style="font-weight: 700; color: #fff; margin-bottom: 8px;">
          ${limitReached ? 'Monthly Limit Reached' : 'Oops!'}
        </p>
        <p style="font-size:13px; color:#ccc;">
          ${msg || "We couldn't generate a recommendation right now."}
        </p>
        <p style="font-size:11px;color:#888;margin-top:12px; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;">
          Please try again later or contact the store directly.
        </p>
      </div>
    `;
  }

  initWidget();
})();