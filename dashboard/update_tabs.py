import re

def main():
    with open('dashboard_updated.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # --- HOME TAB ---
    new_home_tab = """<div id="tab-content-home">
  <!-- State A: New User -->
  <div id="home-overview-state">
    <div style="background:var(--accent-bg); border:1px solid var(--accent); border-radius:var(--radius-lg); padding:24px; margin-bottom:20px;">
      <h1 class="section-title" style="color:var(--accent-text);">Welcome to BuildBot!</h1>
      <p class="section-sub" style="color:var(--accent-text); opacity:0.9;">Let's get your store set up and live.</p>
    </div>
    
    <div class="card" style="margin-bottom:20px; border: 1.5px solid var(--accent); background: var(--accent-bg);">
      <h2 style="margin-bottom:8px; color:var(--text);">Getting Started Journey</h2>
      <p style="margin-bottom:16px;">Follow these 3 steps to go live fast.</p>
      <div class="journey-steps">
        <!-- Step 1: DONE -->
        <div class="journey-stepbox">
          <div class="journey-num done">1</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:2px;">Choose Store Mode</div>
            <div class="journey-step step-done">Done</div>
          </div>
        </div>
        <!-- Step 2 -->
        <div class="journey-stepbox">
          <div class="journey-num pending">2</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:2px;">Add Product Source</div>
            <div class="journey-step step-pending">Pending</div>
            <button class="btn btn-sm btn-outline" style="margin-top:8px;" onclick="const m = localStorage.getItem('bb_store_mode'); if(m==='woo') { showTab('settings'); switchSettingsTab('store'); } else { showTab('products'); }">Manage source</button>
          </div>
        </div>
        <!-- Step 3 -->
        <div class="journey-stepbox">
          <div class="journey-num pending">3</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text); margin-bottom:2px;">Publish Widget</div>
            <div class="journey-step step-pending">Pending</div>
            <button class="btn btn-sm btn-outline" style="margin-top:8px;" onclick="showTab('embed')">Go live</button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Zero State Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-value">0</div>
        <div class="stat-label">Total Recommendations</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-value">0</div>
        <div class="stat-label">Products in Catalog</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value">0</div>
        <div class="stat-label">Avg Customer Budget</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-value">0</div>
        <div class="stat-label">Recommendations Today</div>
      </div>
    </div>
  </div>

  <!-- State B: Active User -->
  <div id="home-active-state" style="display:none;">
    <div style="display:flex; align-items:center; gap:10px; margin-bottom:24px;">
      <h1 class="section-title" style="margin:0;">Dashboard Overview</h1>
      <span class="badge badge-success">Live</span>
    </div>
    
    <!-- 4 stat cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-value" id="stat-total">0</div>
        <div class="stat-label" id="rec-limit-label">Total Recommendations</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-value" id="stat-products">0</div>
        <div class="stat-label">Products in Catalog</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-value" id="stat-budget">0</div>
        <div class="stat-label">Avg Customer Budget</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-value" id="stat-today">0</div>
        <div class="stat-label">Recommendations Today</div>
      </div>
    </div>
    
    <!-- Mini 7-day trend chart -->
    <div class="card" style="margin-bottom:20px;">
      <h2 style="margin-bottom:16px;">7-Day Trend</h2>
      <div id="home-trend-chart">
        <p style="color:var(--muted); font-size:13px;">No data yet.</p>
      </div>
    </div>
    
    <!-- Recent activity table -->
    <div class="card">
      <h2 style="margin-bottom:16px;">Recent Activity</h2>
      <table style="width:100%;">
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Budget</th>
            <th>Extras</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody id="recent-table">
          <tr>
            <td colspan="4" style="color:var(--muted); text-align:center;">No recommendations yet</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>"""

    # --- PRODUCTS TAB ---
    new_products_tab = """<div id="tab-content-products" style="display:none;">
  <div class="section-title">Product Catalog</div>
  <div class="section-sub">Manage your products. The AI only recommends in-stock items.</div>
  
  <div id="products-woo-view" style="display:none;">
    <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--info-bg); border:1px solid var(--info); border-radius:var(--radius-md); margin-bottom:16px; font-size:12px; color:var(--info);">
      <span style="font-size:16px; flex-shrink:0;">🔌</span>
      <span><strong>WooCommerce mode.</strong> Your products sync automatically from WordPress. To add or edit products, use your WordPress admin panel.</span>
    </div>
    <div class="card" style="background:var(--surface-2); border-color:var(--border);">
      <h2>Connect WooCommerce</h2>
      <p style="margin-bottom:10px;">WooCommerce sync is configured in <b>Settings</b>. Once connected, products will sync automatically.</p>
      <button class="btn btn-primary btn-sm" onclick="showTab('settings'); switchSettingsTab('store');">Go to Settings</button>
    </div>
  </div>
  
  <div id="products-custom-view">
    <div style="display:flex; align-items:center; gap:10px; padding:10px 14px; background:var(--success-bg); border:1px solid var(--success); border-radius:var(--radius-md); margin-bottom:16px; font-size:12px; color:var(--success);">
      <span style="font-size:16px; flex-shrink:0;">📋</span>
      <span><strong>Manual mode.</strong> Add products one by one or upload a CSV file.</span>
    </div>
    
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; gap:12px; flex-wrap:wrap;">
      <div style="display:flex; gap:10px; align-items:center; flex:1;">
        <input id="product-search" type="text" placeholder="🔍 Search products..." oninput="filterProducts()" style="max-width:260px;" />
        <select id="product-category-filter" onchange="filterProducts()">
          <option value="">All Categories</option>
          <option>CPU</option>
          <option>Motherboard</option>
          <option>RAM</option>
          <option>Storage</option>
          <option>GPU</option>
          <option>PSU</option>
          <option>Case</option>
          <option>Monitor</option>
          <option>Accessory</option>
        </select>
        <select id="product-stock-filter" onchange="filterProducts()">
          <option value="">All Status</option>
          <option value="1">In Stock</option>
          <option value="0">Out of Stock</option>
        </select>
      </div>
      <div style="display:flex; gap:10px;">
        <button class="btn btn-primary btn-sm" onclick="openAddProduct()">+ Add Product</button>
        <button class="btn btn-outline btn-sm" onclick="loadProducts()">🔄 Refresh</button>
      </div>
    </div>
    
    <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px;">
      <div class="card" style="padding:16px; text-align:center; background:var(--surface); border:1px solid var(--border); margin:0;">
        <div id="pm-total" style="font-size:22px; font-weight:700; color:var(--text);">0</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">Total Products</div>
      </div>
      <div class="card" style="padding:16px; text-align:center; background:var(--surface); border:1px solid var(--border); margin:0;">
        <div id="pm-instock" style="font-size:22px; font-weight:700; color:var(--success);">0</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">In Stock</div>
      </div>
      <div class="card" style="padding:16px; text-align:center; background:var(--surface); border:1px solid var(--border); margin:0;">
        <div id="pm-outstock" style="font-size:22px; font-weight:700; color:var(--danger);">0</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">Out of Stock</div>
      </div>
      <div class="card" style="padding:16px; text-align:center; background:var(--surface); border:1px solid var(--border); margin:0;">
        <div id="pm-categories" style="font-size:22px; font-weight:700; color:var(--accent);">0</div>
        <div style="font-size:11px; color:var(--muted); margin-top:2px;">Categories</div>
      </div>
    </div>
    
    <div class="card" style="margin-bottom:20px;">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
        <div>
          <h2 style="margin-bottom:4px;">Bulk Upload via CSV</h2>
          <p>Replace all products at once. <a href="#" onclick="downloadTemplate()" style="color:var(--accent);">Download template</a></p>
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <div id="csv-filename" style="font-size:12px; color:var(--accent);"></div>
          <label class="btn" style="cursor:pointer; margin:0;">
            📂 Choose File
            <input type="file" id="csv-upload" accept=".csv" style="display:none" onchange="csvSelected(this)" />
          </label>
          <button class="btn btn-primary btn-sm" id="upload-btn" onclick="doUpload()" disabled>Upload</button>
        </div>
      </div>
      <div id="upload-alert" class="alert"></div>
    </div>
    
    <div class="card" style="padding:0; overflow:hidden;">
      <div style="padding:20px 24px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between;">
        <h2 style="margin:0;">Products <span id="product-count-badge" style="color:var(--muted); font-size:13px; font-weight:400; margin-left:6px;"></span></h2>
        <div id="pm-filtered-note" style="font-size:12px; color:var(--muted); display:none;">Showing filtered results</div>
      </div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:var(--surface-2);">
              <th style="padding:12px 24px; text-align:left; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border); white-space:nowrap;">Product Name</th>
              <th style="padding:12px 16px; text-align:left; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border);">Category</th>
              <th style="padding:12px 16px; text-align:right; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border);">Price</th>
              <th style="padding:12px 16px; text-align:center; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border);">Status</th>
              <th style="padding:12px 24px; text-align:right; color:var(--muted); font-weight:600; border-bottom:1px solid var(--border);">Actions</th>
            </tr>
          </thead>
          <tbody id="products-table">
            <tr><td colspan="5" style="padding:40px; text-align:center; color:var(--muted);">Loading products...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>"""

    content = re.sub(r'<div id="tab-content-home">.*?</div>\s*<div id="tab-content-embed"', new_home_tab + '\n<div id="tab-content-embed"', content, flags=re.DOTALL)
    content = re.sub(r'<div id="tab-content-products" style="display:none;">.*?</div>\s*<!-- end products-custom-view -->\s*</div>', new_products_tab, content, flags=re.DOTALL)

    # 3. ANALYTICS TAB: Remove inline styles from setAnalyticsRange and update classes
    # I will replace the script in the JS part using regex
    # Wait, for the HTML part, Analytics tab has buttons with IDs. Let's add class="analytics-range-btn".
    content = re.sub(r'<button\s+onclick="setAnalyticsRange\(\'7d\', this\)"\s+id="btn-7d"[^>]*>', '<button class="analytics-range-btn range-btn-active" id="btn-7d" onclick="setAnalyticsRange(\'7d\', this)">', content)
    content = re.sub(r'<button\s+onclick="setAnalyticsRange\(\'30d\', this\)"\s+id="btn-30d"[^>]*>', '<button class="analytics-range-btn" id="btn-30d" onclick="setAnalyticsRange(\'30d\', this)">', content)
    content = re.sub(r'<button\s+onclick="setAnalyticsRange\(\'all\', this\)"\s+id="btn-all"[^>]*>', '<button class="analytics-range-btn" id="btn-all" onclick="setAnalyticsRange(\'all\', this)">', content)

    # Add empty state to Analytics
    # In setAnalyticsRange or loadAnalytics, it should show empty state if no data. We can just add it to HTML.
    
    # 4. SETTINGS TAB: Remove Account sub-tab HTML (Already done in previous step, but let's make sure)
    # The actual Settings structure
    
    with open('dashboard_updated.html', 'w', encoding='utf-8') as f:
        f.write(content)

main()
print("Tabs updated")
