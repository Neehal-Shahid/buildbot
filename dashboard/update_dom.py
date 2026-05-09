import re

def update_html():
    with open('dashboard_updated.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update Sidebar
    old_sidebar_pattern = r'<div class="sidebar">.*?<div class="main">'
    new_sidebar = '''<div class="sidebar">
  <div class="sidebar-logo" style="margin:0 10px 6px;font-weight:800;color:var(--accent);font-size:14px;letter-spacing:.02em;">
    ⚡ BuildBot
  </div>
  <div class="sidebar-sep">Get started</div>
  <div class="sidebar-item active" id="tab-home" onclick="showTab('home')"><span class="icon">🏠</span>Overview</div>
  <div class="sidebar-item" id="tab-embed" onclick="showTab('embed')"><span class="icon">🔗</span>Embed<span id="embed-status-dot" style="width:7px;height:7px;border-radius:50%;background:var(--warning);margin-left:auto;display:none;"></span></div>
  
  <div class="sidebar-sep">Workspace</div>
  <div class="sidebar-item" id="tab-products" onclick="showTab('products')"><span class="icon">📦</span>Products</div>
  <div class="sidebar-item" id="tab-analytics" onclick="showTab('analytics')"><span class="icon\">📊</span>Analytics</div>
  
  <div class="sidebar-sep">Account</div>
  <div class="sidebar-item" id="tab-settings" onclick="showTab('settings')"><span class="icon">⚙️</span>Settings</div>
  <div class="sidebar-item" id="tab-account" onclick="showTab('account')"><span class="icon">👤</span>Account</div>
  <div class="sidebar-item" id="tab-billing" onclick="showTab('billing')"><span class="icon">💳</span>Billing</div>
  <div class="sidebar-item" id="tab-help" onclick="showTab('help')"><span class="icon">❓</span>Help</div>
  
  <div style="flex:1;"></div>
  <div class="sidebar-bottom" style="margin:10px 10px 0;padding-top:12px;border-top:1px solid var(--border);">
    <div class="sidebar-item sidebar-logout" onclick="doLogout()" style="margin:0;"><span class="icon">🚪</span>Logout</div>
  </div>
</div>
<div class="main">'''
    content = re.sub(old_sidebar_pattern, new_sidebar, content, flags=re.DOTALL)

    # 2. Update Mobile Tabs
    old_mobile_tabs = r'<div class="mobile-tabs">.*?</div>\s*<!-- END OF DASHBOARD -->'
    new_mobile_tabs = '''<div class="mobile-tabs">
  <button class="mobile-tab active" onclick="showTab('home')"><span class="mobile-tab-icon">🏠</span>Home</button>
  <button class="mobile-tab" onclick="showTab('embed')"><span class="mobile-tab-icon">🔗</span>Embed</button>
  <button class="mobile-tab" onclick="showTab('products')"><span class="mobile-tab-icon">📦</span>Products</button>
  <button class="mobile-tab" onclick="showTab('analytics')"><span class="mobile-tab-icon">📊</span>Analytics</button>
  <button class="mobile-tab" onclick="showTab('settings')"><span class="mobile-tab-icon">⚙️</span>Settings</button>
</div>
<!-- END OF DASHBOARD -->'''
    
    # We might need to just replace the div.mobile-tabs
    content = re.sub(r'<div class="mobile-tabs">.*?</div>\s*(?=</(?:body|div)>)', new_mobile_tabs, content, flags=re.DOTALL)
    
    # Let's fix JS mobileMap
    # Replace var mobileMap = { home: 0, embed: 1, products: 2, analytics: 3, settings: 4 }; if it's there
    content = re.sub(r'var mobileMap = \{.*?\};', "var mobileMap = { home: 0, embed: 1, products: 2, analytics: 3, settings: 4 };", content)

    # 3. Create Account Tab
    # Remove Account subtab from Settings
    content = re.sub(r'<button class="stab sts-tab" id="stab-account".*?</button>', '', content, flags=re.DOTALL)
    
    # Also find Settings sub-tabs and make sure it has only Widget and Store
    # Find stab-widget, stab-store and ensure they are correct
    
    # Find `<div id="sts-account" class="sts-content"` and extract its innards to put in the new account tab,
    # or just write the new account tab completely. The prompt specifies what goes inside Account Tab.
    
    new_account_tab = '''
<!-- ACCOUNT TAB -->
<div id="tab-content-account" style="display:none; max-width: 600px;">
  <div style="margin-bottom:24px;">
    <h1 class="section-title">Account</h1>
    <p class="section-sub">Manage your profile, security, and account settings.</p>
  </div>
  
  <div class="tab-stack">
    <!-- Section 1: Profile -->
    <div class="card">
      <h2>Profile</h2>
      <p style="margin-bottom: 20px;">Your basic account information.</p>
      <div class="form-group">
        <label class="form-label">Email Address</label>
        <input type="email" id="profile-email" readonly style="opacity: 0.7; background: var(--surface-2); cursor: not-allowed;">
      </div>
      <div class="form-group">
        <label class="form-label">Store Name</label>
        <input type="text" id="profile-store-name">
      </div>
      <button class="btn btn-primary" onclick="updateStoreName(this)">Save Profile</button>
    </div>
    
    <!-- Section 2: Security -->
    <div class="card">
      <h2>Security</h2>
      <p style="margin-bottom: 20px;">Update your password.</p>
      <div id="cp-alert" class="alert"></div>
      <div class="form-group pwd-wrap">
        <label class="form-label">Current Password</label>
        <input type="password" id="cp-current" placeholder="Enter current password">
        <span class="pwd-toggle" onclick="togglePassword('cp-current', this)">👁️</span>
      </div>
      <div class="form-group pwd-wrap">
        <label class="form-label">New Password</label>
        <input type="password" id="cp-new" placeholder="Enter new password">
        <span class="pwd-toggle" onclick="togglePassword('cp-new', this)">👁️</span>
      </div>
      <div class="form-group pwd-wrap" style="margin-bottom: 20px;">
        <label class="form-label">Confirm New Password</label>
        <input type="password" id="cp-confirm" placeholder="Confirm new password">
        <span class="pwd-toggle" onclick="togglePassword('cp-confirm', this)">👁️</span>
      </div>
      <button class="btn btn-primary" onclick="changePassword(this)">Update Password</button>
    </div>
    
    <!-- Section 3: Danger Zone -->
    <div class="card" style="border-color: var(--danger);">
      <h2 style="color: var(--danger);">Danger Zone</h2>
      <p style="margin-bottom: 20px;">Permanently delete your account and all associated data.</p>
      <button class="btn btn-danger" onclick="deleteAccount(this)">Delete Account</button>
    </div>
  </div>
</div>
'''
    # Remove old sts-account div
    content = re.sub(r'<div id="sts-account" class="sts-content".*?</div>\s*</div>\s*</div>\s*<!-- END SETTINGS -->', '</div>\n</div>\n<!-- END SETTINGS -->', content, flags=re.DOTALL)
    # Insert new account tab before <!-- HELP TAB --> or at the end of tabs
    content = content.replace('<!-- HELP TAB -->', new_account_tab + '\n<!-- HELP TAB -->')

    with open('dashboard_updated.html', 'w', encoding='utf-8') as f:
        f.write(content)

update_html()
print("Dom updated")
