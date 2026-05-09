import re

def update_settings():
    with open('dashboard_updated.html', 'r', encoding='utf-8') as f:
        content = f.read()

    new_settings_tab = """<div id="tab-content-settings" style="display:none;">
  <div class="section-title">Settings
    <span onclick="toggleContextHelp('help-settings')" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:1px solid var(--border);font-size:11px;color:var(--muted);cursor:pointer;margin-left:10px;vertical-align:middle;" title="Help">?</span>
  </div>
  <div class="section-sub">Customize how your widget looks and what it says.</div>
  
  <div id="help-settings" style="display:none;background:var(--accent-bg);border:1px solid var(--accent);border-radius:10px;padding:12px 16px;margin:8px 0 16px;font-size:12px;color:var(--accent-text);line-height:1.8;">
    <strong>Settings guide:</strong><br>
    • Widget tab controls branding and text.<br>
    • Store tab changes mode and Woo setup.<br>
  </div>
  
  <div id="settings-subtabs" style="display:flex;gap:4px;background:var(--surface-2);border-radius:10px;padding:4px;width:fit-content;margin-bottom:22px;border:1px solid var(--border);">
    <button class="sts-btn stab sts-active" id="stab-widget" onclick="switchSettingsTab('widget')" style="font-size:13px;padding:8px 18px;border-radius:8px;">🎨 Widget</button>
    <button class="sts-btn stab" id="stab-store" onclick="switchSettingsTab('store')" style="font-size:13px;padding:8px 18px;border-radius:8px;">🏪 Store</button>
  </div>
  
  <!-- WIDGET TAB -->
  <div id="settings-panel-widget">
    <div class="card" style="margin-bottom:20px;">
      <h2>Brand Color & Position</h2>
      <div style="display:flex; gap:20px; flex-wrap:wrap;">
        <div class="form-group" style="flex:1;">
          <label class="form-label">Brand Color</label>
          <div style="display:flex;gap:10px;align-items:center;">
            <input type="color" id="brand-color" value="#4f46e5" style="width:50px;height:40px;border:none;background:none;cursor:pointer;padding:0;">
            <input type="text" id="brand-color-hex" value="#4f46e5" style="flex:1;">
          </div>
        </div>
        <div class="form-group" style="flex:1;">
          <label class="form-label">Currency</label>
          <select id="currency-select">
            <option value="PKR">PKR – Pakistani Rupee</option>
            <option value="USD">USD – US Dollar</option>
            <option value="AED">AED – UAE Dirham</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="card" style="margin-bottom:20px;">
      <h2>Widget Text & Content</h2>
      <p style="margin-bottom:24px;">Customize what your customers see inside the widget.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <div class="form-group">
            <label class="form-label">Widget Title <span style="color:var(--muted);font-weight:400;font-size:10px;margin-left:6px;">Max 30 chars</span></label>
            <input type="text" id="widget-title-input" maxlength="30" placeholder="e.g. PC Builder, Build My PC, TechZone">
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Shown in the widget header. Default: BuildBot</div>
          </div>
          <div class="form-group">
            <label class="form-label">Start Button Text <span style="color:var(--muted);font-weight:400;font-size:10px;margin-left:6px;">Max 20 chars</span></label>
            <input type="text" id="button-text-input" maxlength="20" placeholder="e.g. Get Started, Build Now, Let's Go">
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Text on the first screen button. Default: Get Started</div>
          </div>
        </div>
        <div>
          <div class="form-group">
            <label class="form-label">Welcome Message <span style="color:var(--muted);font-weight:400;font-size:10px;margin-left:6px;">Max 200 chars</span></label>
            <textarea id="welcome-msg-input" rows="5" maxlength="200" placeholder="Tell customers what the widget does..."></textarea>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Shown on the first screen. Keep it short and friendly.</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Live Preview -->
    <div class="card" style="margin-bottom:20px;">
      <h2>Live Preview</h2>
      <div style="background:var(--surface-2);border-radius:12px;padding:20px;margin:16px 0;border:1px solid var(--border);">
        <div style="text-align:center;padding:16px 0; position:relative;">
          <div style="font-size:32px;margin-bottom:8px;">🖥️</div>
          <div id="preview-welcome-title" style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px;">Build Your Perfect PC</div>
          <div id="preview-welcome-msg" style="font-size:12px;color:var(--muted);max-width:240px;margin:0 auto;line-height:1.6;">Tell me your budget and what you need — I will find the best parts from this store for you.</div>
          <div style="margin-top:16px;">
            <div id="preview-btn-text" style="display:inline-block;background:var(--accent);color:#fff;padding:10px 24px;border-radius:8px;font-size:13px;font-weight:600;">Get Started →</div>
          </div>
          <div id="widget-preview-btn" style="position:absolute;bottom:-40px;right:0px;width:52px;height:52px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:var(--shadow-md);cursor:pointer;">⚡</div>
        </div>
      </div>
      <div style="display:flex;gap:12px;align-items:center;">
        <button class="btn btn-primary" onclick="saveWidgetSettings()">💾 Save Widget Settings</button>
        <button class="btn btn-outline" onclick="resetWidgetDefaults()">Reset to Defaults</button>
      </div>
      <div id="widget-settings-alert" class="alert"></div>
    </div>
  </div>
  <!-- end settings-panel-widget -->
  
  <!-- STORE TAB -->
  <div id="settings-panel-store" style="display:none;">
    <div class="card" style="margin-bottom:20px;">
      <h2>Store Mode</h2>
      <p style="margin-bottom:12px;">Choose your primary store workflow. Dashboard adapts based on this mode.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button id="store-mode-custom-btn" class="btn" onclick="setStoreModePermanent('custom')">📋 Manual Mode</button>
        <button id="store-mode-woo-btn" class="btn" onclick="setStoreModePermanent('woo')">🔌 WooCommerce</button>
      </div>
    </div>
    
    <!-- WooCommerce Section -->
    <div id="woo-section" class="card">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
        <div style="font-size:28px;">🔌</div>
        <div>
          <h2 style="margin:0;">WooCommerce Auto-Sync</h2>
          <p style="margin:4px 0 0;font-size:13px;color:var(--muted);">Connect your WooCommerce store — products sync automatically.</p>
        </div>
        <div id="woo-status-badge" style="margin-left:auto;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:var(--danger-bg);color:var(--danger);border:1px solid rgba(220,38,38,0.3);">● Not Connected</div>
      </div>
      <div style="height:1px;background:var(--border);margin:20px 0;"></div>
      
      <!-- Connected View -->
      <div id="woo-connected-view" style="display:none;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;">
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">Store URL</div>
            <div id="woo-url-display" style="font-size:13px;color:var(--text);font-weight:500;word-break:break-all;">—</div>
          </div>
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">Products Synced</div>
            <div id="woo-count-display" style="font-size:22px;font-weight:700;color:var(--success);">0</div>
          </div>
          <div style="background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:16px;">
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">Last Synced</div>
            <div id="woo-sync-display" style="font-size:13px;color:var(--text);font-weight:500;">Never</div>
          </div>
        </div>
        <div id="woo-widget-status" style="font-size:13px;margin-bottom:14px;padding:10px 14px;background:var(--surface-2);border-radius:8px;border:1px solid var(--border);">Checking widget status...</div>
        <div style="display:flex;gap:10px;">
          <button class="btn btn-danger btn-sm" onclick="disconnectWoo()">Disconnect WooCommerce</button>
        </div>
        <div id="woo-sync-alert" class="alert" style="margin-top:12px;"></div>
      </div>
      
      <!-- Setup View -->
      <div id="woo-setup-view">
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="width:32px;height:32px;background:var(--accent);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:#fff;flex-shrink:0;">1</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">Download the BuildBot Plugin</div>
            <button class="btn btn-primary btn-sm" onclick="downloadPlugin()" style="margin-top:8px;">⬇️ Download Plugin (.zip)</button>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="width:32px;height:32px;background:var(--border-2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text);flex-shrink:0;">2</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">Install on WordPress</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.8;">Plugins → Add New → Upload Plugin</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:24px;">
          <div style="width:32px;height:32px;background:var(--border-2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text);flex-shrink:0;">3</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">Copy Your Secret Key</div>
            <div style="display:flex;gap:8px;align-items:center;margin-top:8px;">
              <div id="plugin-secret-display" style="background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-family:monospace;font-size:12px;color:var(--accent);flex:1;word-break:break-all;">Click "Generate Key"</div>
              <button id="generate-key-btn" class="btn btn-outline btn-sm" onclick="generatePluginKey()">Generate Key</button>
              <button id="copy-key-btn" class="btn btn-outline btn-sm" style="display:none;" onclick="copyPluginKey()">📋 Copy</button>
            </div>
            <div style="margin-top:8px;font-size:12px;color:var(--muted);">Store ID: <strong id="store-id-plugin-display"></strong> <span onclick="copyStoreId()" style="color:var(--accent);cursor:pointer;margin-left:8px;">Copy</span></div>
          </div>
        </div>
        <div style="display:flex;gap:16px;">
          <div style="width:32px;height:32px;background:var(--border-2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--text);flex-shrink:0;">4</div>
          <div style="flex:1;">
            <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px;">Connect from WordPress</div>
            <div style="font-size:12px;color:var(--muted);">Enter Store ID and Secret Key, then click Connect.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>"""

    content = re.sub(r'<div id="tab-content-settings" style="display:none;">.*?</div>\s*<!-- end settings-panel-account -->\s*</div>', new_settings_tab, content, flags=re.DOTALL)

    # Let's remove the extra settings-security-card from home (which we might have already removed in update_tabs.py)
    # Actually wait, in home.txt there was `<div class="card" id="settings-security-card">`.
    # Let's write the result back.
    with open('dashboard_updated.html', 'w', encoding='utf-8') as f:
        f.write(content)

update_settings()
print("Settings updated")
