<?php
/**
 * Plugin Name: BuildBot AI PC Recommender
 * Plugin URI:  https://buildbot-nine.vercel.app
 * Description: Connects your WooCommerce store to BuildBot — syncs products automatically so customers get AI-powered PC build recommendations.
 * Version:     1.0.0
 * Author:      BuildBot
 * Author URI:  https://buildbot-nine.vercel.app
 * License:     GPL v2 or later
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 */

if (!defined('ABSPATH')) exit;

// ─── CONSTANTS ────────────────────────────────────────────
define('BUILDBOT_API',     'https://buildbot-production.up.railway.app/api');
define('BUILDBOT_VERSION', '1.0.0');
define('BUILDBOT_PLUGIN',  plugin_basename(__FILE__));

// ─── ACTIVATION ───────────────────────────────────────────
register_activation_hook(__FILE__, 'buildbot_activate');
function buildbot_activate() {
  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');
  if ($store_id && $secret) {
    buildbot_full_sync();
  }
}

// ─── ADMIN MENU ───────────────────────────────────────────
add_action('admin_menu', 'buildbot_admin_menu');
function buildbot_admin_menu() {
  add_menu_page(
    '⚡ BuildBot',
    '⚡ BuildBot',
    'manage_options',
    'buildbot',
    'buildbot_admin_page',
    'dashicons-superhero',
    56
  );
}

// ─── ADMIN PAGE STYLES ────────────────────────────────────
add_action('admin_head', 'buildbot_admin_styles');
function buildbot_admin_styles() {
  $screen = get_current_screen();
  if (!$screen || $screen->id !== 'toplevel_page_buildbot') return;
  ?>
  <style>
    /* BuildBot Admin Styles */
    #buildbot-wrap {
      max-width: 720px;
      margin: 30px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .bb-header {
      background: linear-gradient(135deg, #7c6af7, #5b4fe0);
      border-radius: 16px;
      padding: 28px 32px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .bb-header-icon { font-size: 40px; }
    .bb-header h1 {
      color: #fff !important;
      font-size: 24px !important;
      margin: 0 0 4px !important;
      padding: 0 !important;
      border: none !important;
    }
    .bb-header p { color: rgba(255,255,255,0.75); margin: 0; font-size: 14px; }
    .bb-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    .bb-card h2 {
      font-size: 16px !important;
      margin: 0 0 6px !important;
      padding: 0 !important;
      border: none !important;
      color: #1a1d27;
    }
    .bb-card p { color: #64748b; font-size: 13px; margin: 0 0 16px; }
    .bb-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .bb-status.connected {
      background: #f0fdf4;
      color: #16a34a;
      border: 1px solid #bbf7d0;
    }
    .bb-status.disconnected {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .bb-field { margin-bottom: 16px; }
    .bb-field label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #475569;
      margin-bottom: 6px;
    }
    .bb-field input[type="text"],
    .bb-field input[type="password"] {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      color: #1a1d27;
      background: #f8fafc;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }
    .bb-field input:focus {
      border-color: #7c6af7;
      outline: none;
      background: #fff;
    }
    .bb-field .bb-hint {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .bb-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      text-decoration: none;
    }
    .bb-btn-primary {
      background: #7c6af7;
      color: #fff;
    }
    .bb-btn-primary:hover { background: #5b4fe0; color: #fff; }
    .bb-btn-secondary {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #e2e8f0;
    }
    .bb-btn-secondary:hover { background: #e2e8f0; }
    .bb-btn-danger {
      background: #fef2f2;
      color: #dc2626;
      border: 1px solid #fecaca;
    }
    .bb-btn-danger:hover { background: #fee2e2; }
    .bb-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .bb-stats {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .bb-stat {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px;
      text-align: center;
    }
    .bb-stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #7c6af7;
      margin-bottom: 2px;
    }
    .bb-stat-label { font-size: 11px; color: #94a3b8; }
    .bb-divider {
      height: 1px;
      background: #e2e8f0;
      margin: 20px 0;
    }
    .bb-notice {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      margin-top: 12px;
      display: none;
    }
    .bb-notice.success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #16a34a;
    }
    .bb-notice.error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
    }
    .bb-notice.info {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #2563eb;
    }
    .bb-footer {
      text-align: center;
      color: #94a3b8;
      font-size: 12px;
      margin-top: 8px;
    }
    .bb-footer a { color: #7c6af7; text-decoration: none; }
    @media (max-width: 600px) {
      .bb-stats { grid-template-columns: 1fr; }
    }
  </style>
  <?php
}

// ─── ADMIN PAGE HTML ──────────────────────────────────────
function buildbot_admin_page() {
  $store_id     = get_option('buildbot_store_id', '');
  $secret_key   = get_option('buildbot_secret_key', '');
  $is_connected = get_option('buildbot_connected', false);
  $last_sync    = get_option('buildbot_last_sync', '');
  $product_count = get_option('buildbot_product_count', 0);
  $woo_url      = get_option('buildbot_woo_url', '');
  ?>

  <div id="buildbot-wrap">

    <!-- Header -->
    <div class="bb-header">
      <div class="bb-header-icon">⚡</div>
      <div>
        <h1>BuildBot</h1>
        <p>AI-powered PC Build Recommender for your store</p>
      </div>
    </div>

    <?php if ($is_connected && $store_id && $secret_key): ?>

    <!-- ── CONNECTED STATE ── -->
    <div class="bb-card">
      <h2>Connection Status</h2>
      <div class="bb-status connected">✅ Connected to BuildBot</div>

      <div class="bb-stats">
        <div class="bb-stat">
          <div class="bb-stat-value"><?php echo esc_html($product_count); ?></div>
          <div class="bb-stat-label">Products Synced</div>
        </div>
        <div class="bb-stat">
          <div class="bb-stat-value" style="font-size:14px;">
            <?php echo $last_sync ? esc_html(buildbot_time_ago($last_sync)) : 'Never'; ?>
          </div>
          <div class="bb-stat-label">Last Synced</div>
        </div>
        <div class="bb-stat">
          <div class="bb-stat-value" style="font-size:13px;">
            <?php echo esc_html($store_id); ?>
          </div>
          <div class="bb-stat-label">Store ID</div>
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="bb-btn bb-btn-primary" onclick="buildbotSync()" id="bb-sync-btn">
          🔄 Sync All Products Now
        </button>
        <button class="bb-btn bb-btn-danger" onclick="buildbotDisconnect()">
          Disconnect
        </button>
      </div>

      <div class="bb-notice" id="bb-notice"></div>
    </div>

    <?php else: ?>

    <!-- ── SETUP STATE ── -->
    <div class="bb-card">
      <h2>Connect to BuildBot</h2>
      <p>Enter your BuildBot Store ID and Secret Key to connect your WooCommerce store.</p>

      <div class="bb-status disconnected">● Not Connected</div>

      <div class="bb-field">
        <label>Store ID</label>
        <input type="text" id="bb-store-id"
          value="<?php echo esc_attr($store_id); ?>"
          placeholder="e.g. techzone-lahore"/>
        <div class="bb-hint">
          Find this in your BuildBot Dashboard → Settings → WooCommerce section
        </div>
      </div>

      <div class="bb-field">
        <label>Secret Key</label>
        <input type="password" id="bb-secret-key"
          value="<?php echo esc_attr($secret_key); ?>"
          placeholder="bb_live_..."/>
        <div class="bb-hint">
          Generate this key in BuildBot Dashboard → Settings → WooCommerce section
        </div>
      </div>

      <button class="bb-btn bb-btn-primary"
        onclick="buildbotConnect()" id="bb-connect-btn">
        🔌 Connect & Sync Products
      </button>

      <div class="bb-notice" id="bb-notice"></div>
    </div>

    <?php endif; ?>

    <!-- How it works -->
    <div class="bb-card">
      <h2>How It Works</h2>
      <p>Once connected, BuildBot will:</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:18px;">🔄</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;">Auto-sync products</strong>
            <div style="font-size:12px;color:#64748b;">
              Every time you add, update or delete a product in WooCommerce,
              BuildBot updates automatically.
            </div>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:18px;">🤖</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;">AI recommendations</strong>
            <div style="font-size:12px;color:#64748b;">
              Customers visiting your store get personalized PC build recommendations
              using only your products.
            </div>
          </div>
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start;">
          <span style="font-size:18px;">📦</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;">Stock aware</strong>
            <div style="font-size:12px;color:#64748b;">
              Out of stock products are never recommended to customers.
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="bb-footer">
      BuildBot v<?php echo BUILDBOT_VERSION; ?> •
      <a href="https://buildbot-nine.vercel.app" target="_blank">Dashboard</a> •
      Need help? Contact support
    </div>

  </div>

  <script>
  const BB_API      = '<?php echo BUILDBOT_API; ?>';
  const BB_STORE_ID = '<?php echo esc_js(get_option("buildbot_store_id", "")); ?>';
  const BB_SECRET   = '<?php echo esc_js(get_option("buildbot_secret_key", "")); ?>';

  function showNotice(msg, type) {
    const el = document.getElementById('bb-notice');
    el.textContent   = msg;
    el.className     = 'bb-notice ' + type;
    el.style.display = 'block';
    if (type === 'success') {
      setTimeout(() => el.style.display = 'none', 5000);
    }
  }

  async function buildbotConnect() {
    const storeId = document.getElementById('bb-store-id').value.trim();
    const secret  = document.getElementById('bb-secret-key').value.trim();
    const btn     = document.getElementById('bb-connect-btn');

    if (!storeId || !secret) {
      showNotice('Please enter both Store ID and Secret Key.', 'error');
      return;
    }

    btn.disabled    = true;
    btn.textContent = '🔄 Connecting...';
    showNotice('Testing connection...', 'info');

    try {
      // Test connection first
      const pingRes = await fetch(BB_API + '/plugin/ping', {
        method:  'POST',
        headers: {
          'Content-Type':       'application/json',
          'X-BuildBot-Store-ID': storeId,
          'X-BuildBot-Secret':   secret
        }
      });
      const pingData = await pingRes.json();

      if (!pingData.success) {
        showNotice('❌ Connection failed: ' + pingData.error, 'error');
        btn.disabled    = false;
        btn.textContent = '🔌 Connect & Sync Products';
        return;
      }

      showNotice('✅ Connected! Syncing products...', 'info');

      // Save settings via WordPress AJAX
      await fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action:     'buildbot_save_settings',
          store_id:   storeId,
          secret_key: secret,
          nonce:      buildbotNonce
        })
      });

      // Sync all products
      await buildbotDoSync(storeId, secret);

    } catch(err) {
      showNotice('❌ Error: ' + err.message, 'error');
      btn.disabled    = false;
      btn.textContent = '🔌 Connect & Sync Products';
    }
  }

  async function buildbotSync() {
    const btn = document.getElementById('bb-sync-btn');
    btn.disabled    = true;
    btn.textContent = '🔄 Syncing...';
    showNotice('Syncing all products...', 'info');

    await buildbotDoSync(BB_STORE_ID, BB_SECRET);

    btn.disabled    = false;
    btn.textContent = '🔄 Sync All Products Now';
  }

  async function buildbotDoSync(storeId, secret) {
    try {
      // Get WooCommerce products via WordPress AJAX
      const prodRes = await fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'buildbot_get_products',
          nonce:  buildbotNonce
        })
      });
      const prodData = await prodRes.json();

      if (!prodData.success) {
        showNotice('❌ Could not get products: ' + prodData.error, 'error');
        return;
      }

      // Send to BuildBot
      const storeUrl = window.location.origin;
      const syncRes = await fetch(BB_API + '/plugin/sync', {
        method:  'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-BuildBot-Store-ID': storeId,
          'X-BuildBot-Secret':   secret
        },
        body: JSON.stringify({
          products: prodData.products,
          storeUrl: storeUrl
        })
      });
      const syncData = await syncRes.json();

      if (syncData.success) {
        // Save sync results via AJAX
        await fetch(ajaxurl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action:        'buildbot_save_sync',
            product_count: syncData.synced,
            woo_url:       window.location.origin,
            nonce:         buildbotNonce
          })
        });

        showNotice(
          '✅ ' + syncData.synced + ' products synced successfully!',
          'success'
        );

        // Reload page after 2 seconds to show updated stats
        setTimeout(() => location.reload(), 2000);

      } else {
        showNotice('❌ Sync failed: ' + syncData.error, 'error');
      }

    } catch(err) {
      showNotice('❌ Error: ' + err.message, 'error');
    }
  }

  async function buildbotDisconnect() {
    if (!confirm('Disconnect BuildBot? Auto-sync will stop but your existing products on BuildBot will remain.')) return;

    await fetch(ajaxurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'buildbot_disconnect',
        nonce:  buildbotNonce
      })
    });

    location.reload();
  }
  </script>
  <?php
}

// ─── WORDPRESS AJAX HANDLERS ──────────────────────────────

// Save settings
add_action('wp_ajax_buildbot_save_settings', 'buildbot_save_settings');
function buildbot_save_settings() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  update_option('buildbot_store_id',  sanitize_text_field($_POST['store_id']));
  update_option('buildbot_secret_key', sanitize_text_field($_POST['secret_key']));
  update_option('buildbot_connected', true);

  wp_send_json_success();
}

// Get WooCommerce products
add_action('wp_ajax_buildbot_get_products', 'buildbot_get_products');
function buildbot_get_products() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  if (!class_exists('WooCommerce')) {
    wp_send_json_error(['error' => 'WooCommerce is not installed or active']);
    return;
  }

  $args = [
    'post_type'      => 'product',
    'posts_per_page' => -1,
    'post_status'    => 'publish'
  ];

  $query    = new WP_Query($args);
  $products = [];

  foreach ($query->posts as $post) {
    $product = wc_get_product($post->ID);
    if (!$product) continue;

    // Get categories
    $terms      = get_the_terms($post->ID, 'product_cat');
    $categories = [];
    if ($terms && !is_wp_error($terms)) {
      foreach ($terms as $term) {
        $categories[] = ['name' => $term->name];
      }
    }

    // Get price
    $price = $product->get_sale_price()
      ?: $product->get_regular_price()
      ?: $product->get_price();

    // Get description
    $description = $product->get_short_description()
      ?: wp_trim_words($product->get_description(), 30, '');

    $products[] = [
      'id'           => $product->get_id(),
      'name'         => $product->get_name(),
      'price'        => $price,
      'regular_price' => $product->get_regular_price(),
      'sale_price'   => $product->get_sale_price(),
      'stock_status' => $product->get_stock_status(),
      'categories'   => $categories,
      'short_description' => strip_tags($description)
    ];
  }

  wp_send_json_success(['products' => $products]);
}

// Save sync results
add_action('wp_ajax_buildbot_save_sync', 'buildbot_save_sync');
function buildbot_save_sync() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  update_option('buildbot_last_sync',     current_time('mysql'));
  update_option('buildbot_product_count', intval($_POST['product_count']));
  update_option('buildbot_woo_url',       esc_url_raw($_POST['woo_url']));

  wp_send_json_success();
}

// Disconnect
add_action('wp_ajax_buildbot_disconnect', 'buildbot_disconnect');
function buildbot_disconnect() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  update_option('buildbot_connected', false);
  wp_send_json_success();
}

// ─── INJECT NONCE INTO ADMIN PAGE ─────────────────────────
add_action('admin_footer', 'buildbot_admin_footer');
function buildbot_admin_footer() {
  $screen = get_current_screen();
  if (!$screen || $screen->id !== 'toplevel_page_buildbot') return;
  ?>
  <script>
    const buildbotNonce = '<?php echo wp_create_nonce("buildbot_nonce"); ?>';
  </script>
  <?php
}

// ─── WOOCOMMERCE HOOKS (real-time sync) ───────────────────
add_action('woocommerce_update_product',  'buildbot_on_product_update');
add_action('woocommerce_new_product',     'buildbot_on_product_update');
function buildbot_on_product_update($product_id) {
  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');

  if (!$store_id || !$secret || !get_option('buildbot_connected')) return;

  $product = wc_get_product($product_id);
  if (!$product) return;

  $terms      = get_the_terms($product_id, 'product_cat');
  $categories = [];
  if ($terms && !is_wp_error($terms)) {
    foreach ($terms as $term) {
      $categories[] = ['name' => $term->name];
    }
  }

  $price = $product->get_sale_price()
    ?: $product->get_regular_price()
    ?: $product->get_price();

  $data = [
    'product' => [
      'id'           => $product->get_id(),
      'name'         => $product->get_name(),
      'price'        => $price,
      'regular_price' => $product->get_regular_price(),
      'sale_price'   => $product->get_sale_price(),
      'stock_status' => $product->get_stock_status(),
      'categories'   => $categories,
      'short_description' => strip_tags(
        $product->get_short_description()
        ?: wp_trim_words($product->get_description(), 30, '')
      )
    ]
  ];

  wp_remote_post(BUILDBOT_API . '/plugin/product/update', [
    'headers' => [
      'Content-Type'         => 'application/json',
      'X-BuildBot-Store-ID'  => $store_id,
      'X-BuildBot-Secret'    => $secret
    ],
    'body'    => json_encode($data),
    'timeout' => 10
  ]);
}

add_action('wp_trash_post', 'buildbot_on_product_delete');
function buildbot_on_product_delete($post_id) {
  if (get_post_type($post_id) !== 'product') return;

  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');

  if (!$store_id || !$secret || !get_option('buildbot_connected')) return;

  $product = wc_get_product($post_id);
  if (!$product) return;

  wp_remote_post(BUILDBOT_API . '/plugin/product/delete', [
    'headers' => [
      'Content-Type'         => 'application/json',
      'X-BuildBot-Store-ID'  => $store_id,
      'X-BuildBot-Secret'    => $secret
    ],
    'body'    => json_encode(['productName' => $product->get_name()]),
    'timeout' => 10
  ]);
}

// ─── HELPER: Time ago ─────────────────────────────────────
function buildbot_time_ago($datetime) {
  $diff = time() - strtotime($datetime);
  if ($diff < 60)   return $diff . ' seconds ago';
  if ($diff < 3600) return floor($diff/60) . ' minutes ago';
  if ($diff < 86400) return floor($diff/3600) . ' hours ago';
  return floor($diff/86400) . ' days ago';
}

// ─── FULL SYNC FUNCTION ───────────────────────────────────
function buildbot_full_sync() {
  if (!class_exists('WooCommerce')) return;

  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');

  if (!$store_id || !$secret) return;

  $query    = new WP_Query([
    'post_type'      => 'product',
    'posts_per_page' => -1,
    'post_status'    => 'publish'
  ]);

  $products = [];
  foreach ($query->posts as $post) {
    $product = wc_get_product($post->ID);
    if (!$product) continue;

    $terms      = get_the_terms($post->ID, 'product_cat');
    $categories = [];
    if ($terms && !is_wp_error($terms)) {
      foreach ($terms as $term) {
        $categories[] = ['name' => $term->name];
      }
    }

    $price = $product->get_sale_price()
      ?: $product->get_regular_price()
      ?: $product->get_price();

    $products[] = [
      'id'           => $product->get_id(),
      'name'         => $product->get_name(),
      'price'        => $price,
      'stock_status' => $product->get_stock_status(),
      'categories'   => $categories,
      'short_description' => strip_tags(
        $product->get_short_description()
        ?: wp_trim_words($product->get_description(), 30, '')
      )
    ];
  }

  $response = wp_remote_post(BUILDBOT_API . '/plugin/sync', [
    'headers' => [
      'Content-Type'         => 'application/json',
      'X-BuildBot-Store-ID'  => $store_id,
      'X-BuildBot-Secret'    => $secret
    ],
    'body'    => json_encode([
      'products' => $products,
      'storeUrl' => get_site_url()
    ]),
    'timeout' => 30
  ]);

  if (!is_wp_error($response)) {
    $body = json_decode(wp_remote_retrieve_body($response), true);
    if (!empty($body['synced'])) {
      update_option('buildbot_last_sync',     current_time('mysql'));
      update_option('buildbot_product_count', $body['synced']);
      update_option('buildbot_woo_url',       get_site_url());
    }
  }
}