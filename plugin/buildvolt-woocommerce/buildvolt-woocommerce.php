<?php
/**
 * Plugin Name: BuildVolt PC Build Recommender
 * Plugin URI:  https://buildvolt.online
 * Description: Connects your WooCommerce store to BuildVolt — syncs products automatically so customers get instant PC build recommendations.
 * Version:     1.10.0
 * Author:      BuildVolt
 * Author URI:  https://buildvolt.online
 * License:     GPL v2 or later
 * Requires at least: 5.0
 * Requires PHP: 7.4
 * WC requires at least: 5.0
 */

if (!defined('ABSPATH')) exit;

// ─── CONSTANTS ────────────────────────────────────────────
define('BUILDVOLT_API',     'https://buildbot-production-3f70.up.railway.app/api');
define('BUILDVOLT_VERSION', '1.10.0');
define('BUILDVOLT_UPDATE_URL', 'https://buildbot-production-3f70.up.railway.app/plugin-update.json');

// ─── CHECK WOOCOMMERCE ON ACTIVATION ─────────────────────
register_activation_hook(__FILE__, 'buildvolt_activate');
function buildvolt_activate() {
  if (!class_exists('WooCommerce')) {
    deactivate_plugins(plugin_basename(__FILE__));
    wp_die(
      '<div style="font-family:sans-serif;padding:20px;">
        <h2>⚡ BuildVolt — Activation Failed</h2>
        <p><strong>WooCommerce is not installed or active.</strong></p>
        <p>BuildVolt requires WooCommerce to work. Please install and activate
        WooCommerce first, then activate BuildVolt.</p>
        <a href="' . admin_url('plugins.php') . '">← Back to Plugins</a>
      </div>',
      'WooCommerce Required',
      ['back_link' => false]
    );
  }

  // Schedule auto sync every 6 hours
  if (!wp_next_scheduled('buildvolt_auto_sync')) {
    wp_schedule_event(time(), 'buildvolt_6hours', 'buildvolt_auto_sync');
  }
}

// ─── DEACTIVATION ─────────────────────────────────────────
register_deactivation_hook(__FILE__, 'buildvolt_deactivate');
function buildvolt_deactivate() {
  wp_clear_scheduled_hook('buildvolt_auto_sync');
}

// ─── UNINSTALL ────────────────────────────────────────────
// Deactivation alone leaves every wp_options row behind — including the
// plaintext secret key — so a full "Delete" from the plugins list (which
// WordPress always deactivates before allowing) needs its own cleanup, or
// a reinstall finds the old store_id/secret still populated instead of a
// clean slate.
register_uninstall_hook(__FILE__, 'buildvolt_uninstall');
function buildvolt_uninstall() {
  $options = [
    'buildvolt_connected', 'buildvolt_store_id', 'buildvolt_secret_key',
    'buildvolt_last_sync', 'buildvolt_product_count', 'buildvolt_woo_url',
    'buildvolt_is_pc_store', 'buildvolt_category_stats', 'buildvolt_unmapped_count',
    'buildvolt_widget_enabled',
  ];
  foreach ($options as $option) {
    delete_option($option);
  }
}

// ─── CUSTOM CRON SCHEDULE ─────────────────────────────────
add_filter('cron_schedules', 'buildvolt_cron_schedules');
function buildvolt_cron_schedules($schedules) {
  $schedules['buildvolt_6hours'] = [
    'interval' => 6 * HOUR_IN_SECONDS,
    'display'  => 'Every 6 Hours'
  ];
  return $schedules;
}

// ─── AUTO SYNC CRON ───────────────────────────────────────
add_action('buildvolt_auto_sync', 'buildvolt_full_sync');

// ─── AUTO UPDATES ─────────────────────────────────────────
add_filter('pre_set_site_transient_update_plugins', 'buildvolt_check_update');
function buildvolt_check_update($transient) {
  if (empty($transient->checked)) return $transient;

  $response = wp_remote_get(BUILDVOLT_UPDATE_URL, ['timeout' => 10]);
  if (is_wp_error($response)) return $transient;

  $update = json_decode(wp_remote_retrieve_body($response), true);
  if (!$update) return $transient;

  $plugin_file = plugin_basename(__FILE__);
  if (isset($update['version']) &&
      version_compare($update['version'], BUILDVOLT_VERSION, '>')) {
    $item = (object)[
      'id'          => $plugin_file,
      'slug'        => 'buildvolt-woocommerce',
      'plugin'      => $plugin_file,
      'new_version' => $update['version'],
      'url'         => 'https://buildvolt.online',
      'package'     => $update['download_url'],
    ];
    if (!empty($update['tested'])) {
      $item->tested = $update['tested'];
    }
    if (!empty($update['requires'])) {
      $item->requires = $update['requires'];
    }
    if (!empty($update['requires_php'])) {
      $item->requires_php = $update['requires_php'];
    }
    $transient->response[$plugin_file] = $item;
  }
  return $transient;
}

// ─── CATEGORY MAPPING ─────────────────────────────────────
// Mirrors server/lib/categories.js exactly — this function only feeds the
// local "connected store" health check in this admin page (the server
// re-detects the category itself from the raw WooCommerce category name
// and product name on every sync), but it must still agree with the
// server's 9 canonical categories or the health check misreports what
// will actually show up in recommendations.
function buildvolt_detect_category($text) {
  $text = strtolower((string) $text);
  if ($text === '') return null;

  if (
    strpos($text, 'cpu cooler') !== false ||
    strpos($text, 'heatsink') !== false ||
    strpos($text, 'heat sink') !== false ||
    strpos($text, 'aio cooler') !== false ||
    strpos($text, 'liquid cooler') !== false ||
    strpos($text, 'air cooler') !== false ||
    strpos($text, 'hyper 212') !== false ||
    strpos($text, 'arctic freezer') !== false ||
    strpos($text, 'noctua') !== false ||
    (strpos($text, 'cooler') !== false && strpos($text, 'cooler master') === false)
  ) return 'CPU Cooler';

  if (
    strpos($text, 'power supply') !== false ||
    strpos($text, 'psu') !== false ||
    strpos($text, 'smps') !== false ||
    strpos($text, 'power unit') !== false ||
    strpos($text, 'seasonic') !== false ||
    strpos($text, 'cooler master mwe') !== false ||
    strpos($text, 'corsair cv') !== false ||
    strpos($text, 'corsair rm') !== false
  ) return 'PSU';

  if (
    strpos($text, 'graphics') !== false ||
    strpos($text, 'gpu') !== false ||
    strpos($text, 'video card') !== false ||
    strpos($text, 'graphic card') !== false ||
    strpos($text, 'vga') !== false ||
    strpos($text, 'rtx') !== false ||
    strpos($text, 'gtx') !== false ||
    strpos($text, 'radeon') !== false ||
    strpos($text, 'geforce') !== false ||
    strpos($text, 'nvidia') !== false
  ) return 'GPU';

  if (
    strpos($text, 'processor') !== false ||
    strpos($text, 'proccessor') !== false ||
    strpos($text, 'intel core') !== false ||
    strpos($text, 'ryzen') !== false ||
    strpos($text, 'threadripper') !== false ||
    strpos($text, 'xeon') !== false ||
    strpos($text, 'celeron') !== false ||
    strpos($text, 'pentium') !== false ||
    strpos($text, 'core i3') !== false ||
    strpos($text, 'core i5') !== false ||
    strpos($text, 'core i7') !== false ||
    strpos($text, 'core i9') !== false ||
    strpos($text, 'cpu') !== false ||
    preg_match('/\bchip\b/', $text)
  ) return 'CPU';

  if (
    strpos($text, 'motherboard') !== false ||
    strpos($text, 'mainboard') !== false ||
    strpos($text, 'mobo') !== false
  ) return 'Motherboard';

  if (
    strpos($text, 'memory') !== false ||
    strpos($text, 'ram') !== false ||
    strpos($text, 'dimm') !== false ||
    strpos($text, 'vengeance') !== false ||
    strpos($text, 'ripjaws') !== false
  ) return 'RAM';

  if (
    strpos($text, 'storage') !== false ||
    strpos($text, 'ssd') !== false ||
    strpos($text, 'hdd') !== false ||
    strpos($text, 'nvme') !== false ||
    strpos($text, 'disk') !== false ||
    strpos($text, 'drive') !== false ||
    strpos($text, 'solid state') !== false ||
    strpos($text, 'm.2') !== false ||
    strpos($text, 'sata') !== false
  ) return 'Storage';

  if (
    strpos($text, 'case fan') !== false ||
    strpos($text, 'cooling fan') !== false ||
    strpos($text, 'fan') !== false
  ) return 'Case Fans';

  if (
    strpos($text, 'case') !== false ||
    strpos($text, 'chassis') !== false ||
    strpos($text, 'cabinet') !== false ||
    strpos($text, 'casing') !== false ||
    strpos($text, 'tower') !== false
  ) return 'Case';

  return null;
}

function buildvolt_map_category($woo_categories, $product_name = '') {
  if (!empty($woo_categories)) {
    foreach ($woo_categories as $cat) {
      $detected = buildvolt_detect_category($cat['name']);
      if ($detected) return $detected;
    }
  }

  $detected = buildvolt_detect_category($product_name);
  if ($detected) return $detected;

  return 'Unmapped';
}

// ─── GET ALL WOOCOMMERCE PRODUCTS ─────────────────────────
function buildvolt_get_all_products() {
  $query = new WP_Query([
    'post_type'      => 'product',
    'posts_per_page' => -1,
    'post_status'    => 'publish'
  ]);

  $products      = [];
  $unmapped      = 0;
  $category_stats = [];

  foreach ($query->posts as $post) {
    $product = wc_get_product($post->ID);
    if (!$product) continue;

    // A variable product's parent has no single purchasable ID — WooCommerce
    // requires a specific variation ID to add to cart, which BuildVolt has
    // no way to pick (each variation can have its own price/attributes
    // this plugin doesn't sync as separate catalog entries). Recommending
    // it anyway would let a customer pick this build, then have "Order
    // This Build" silently fail to add it at checkout with no explanation.
    if ($product->is_type('variable')) continue;

    $price = floatval(
      $product->get_sale_price()
      ?: $product->get_regular_price()
      ?: $product->get_price()
    );
    if ($price <= 0) continue;

    // Get WooCommerce categories
    $terms      = get_the_terms($post->ID, 'product_cat');
    $woo_cats   = [];
    if ($terms && !is_wp_error($terms)) {
      foreach ($terms as $term) {
        $woo_cats[] = ['name' => $term->name];
      }
    }

    $product_name     = $product->get_name();
    $mapped_category  = buildvolt_map_category($woo_cats, $product_name);

    if ($mapped_category === 'Unmapped') {
      $unmapped++;
    }

    // Track stats
    if (!isset($category_stats[$mapped_category])) {
      $category_stats[$mapped_category] = 0;
    }
    $category_stats[$mapped_category]++;

    // Get description
    $description = strip_tags(
      $product->get_short_description()
      ?: wp_trim_words($product->get_description(), 25, '')
    );

    $products[] = [
      'id'                => $product->get_id(),
      'name'              => $product_name,
      'price'             => $price,
      'regular_price'     => $product->get_regular_price(),
      'sale_price'        => $product->get_sale_price(),
      'stock_status'      => $product->get_stock_status(),
      'categories'        => $woo_cats,
      'short_description' => $description
    ];
  }

  return [
    'products'       => $products,
    'unmapped'       => $unmapped,
    'category_stats' => $category_stats,
    'total'          => count($products)
  ];
}

// ─── DETECT IF PC STORE ───────────────────────────────────
function buildvolt_is_pc_store($category_stats) {
  $pc_categories = ['CPU', 'Motherboard', 'RAM', 'Storage', 'GPU', 'PSU', 'Case'];
  $pc_count      = 0;
  foreach ($pc_categories as $cat) {
    if (!empty($category_stats[$cat])) $pc_count++;
  }
  return $pc_count >= 2; // at least 2 PC categories = PC store
}

// ─── FULL SYNC FUNCTION ───────────────────────────────────
function buildvolt_full_sync() {
  $store_id = get_option('buildvolt_store_id');
  $secret   = get_option('buildvolt_secret_key');

  if (!$store_id || !$secret || !get_option('buildvolt_connected')) return;
  if (!class_exists('WooCommerce')) return;

  $result   = buildvolt_get_all_products();
  $products = $result['products'];

  if (empty($products)) return;

  // Check if it's a PC store
  $is_pc = buildvolt_is_pc_store($result['category_stats']);
  update_option('buildvolt_is_pc_store', $is_pc);
  update_option('buildvolt_category_stats', $result['category_stats']);
  update_option('buildvolt_unmapped_count', $result['unmapped']);

  $response = wp_remote_post(BUILDVOLT_API . '/plugin/sync', [
    'headers' => [
      'Content-Type'        => 'application/json',
      'X-BuildVolt-Store-ID' => $store_id,
      'X-BuildVolt-Secret'   => $secret
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
      update_option('buildvolt_last_sync',     current_time('mysql'));
      update_option('buildvolt_product_count', $body['synced']);
      update_option('buildvolt_woo_url',       get_site_url());
    }
  }
}

// ─── REMOTE SYNC TRIGGER (dashboard "Sync Now" button) ────
// Lets the BuildVolt dashboard ask this site to sync right now instead of
// waiting for the 6-hourly cron. Secret-authenticated the same way as
// every other BuildVolt<->plugin exchange (X-BuildVolt-Secret header), so
// this is a stateless server-to-server call — no WordPress login/nonce
// needed, since only whoever already holds this store's secret key (i.e.
// BuildVolt itself) can trigger it.
add_action('rest_api_init', 'buildvolt_register_rest_routes');
function buildvolt_register_rest_routes() {
  register_rest_route('buildvolt/v1', '/trigger-sync', [
    'methods'             => 'POST',
    'callback'            => 'buildvolt_rest_trigger_sync',
    'permission_callback' => 'buildvolt_rest_check_secret',
  ]);
}

function buildvolt_rest_check_secret($request) {
  $secret = $request->get_header('x_buildvolt_secret');
  $stored = get_option('buildvolt_secret_key');
  return $secret && $stored && hash_equals($stored, $secret);
}

function buildvolt_rest_trigger_sync($request) {
  if (!get_option('buildvolt_connected')) {
    return new WP_REST_Response(['success' => false, 'error' => 'Not connected to BuildVolt'], 400);
  }
  if (!class_exists('WooCommerce')) {
    return new WP_REST_Response(['success' => false, 'error' => 'WooCommerce not active'], 400);
  }
  buildvolt_full_sync();
  return new WP_REST_Response([
    'success' => true,
    'synced'  => (int) get_option('buildvolt_product_count', 0),
  ], 200);
}

// ─── ADMIN MENU ───────────────────────────────────────────
add_action('admin_menu', 'buildvolt_admin_menu');
function buildvolt_admin_menu() {
  add_menu_page(
    '⚡ BuildVolt',
    '⚡ BuildVolt',
    'manage_options',
    'buildvolt',
    'buildvolt_admin_page',
    'dashicons-superhero',
    56
  );
}

// ─── ADMIN STYLES ─────────────────────────────────────────
add_action('admin_enqueue_scripts', 'buildvolt_enqueue_admin_scripts');
function buildvolt_enqueue_admin_scripts($hook) {
  if ($hook !== 'toplevel_page_buildvolt') return;

  // Enqueue jQuery (WordPress has it built-in)
  wp_enqueue_script('jquery');

  // Inline script with all BuildVolt JS
  $store_id  = get_option('buildvolt_store_id', '');
  $secret    = get_option('buildvolt_secret_key', '');
  $api       = BUILDVOLT_API;
  $nonce     = wp_create_nonce('buildvolt_nonce');

  $inline_js = "
    var BV_API        = '" . esc_js($api) . "';
    var BV_STORE_ID   = '" . esc_js($store_id) . "';
    var BV_SECRET     = '" . esc_js($secret) . "';
    var buildvoltNonce = '" . esc_js($nonce) . "';
  ";

  wp_add_inline_script('jquery', $inline_js);
  wp_add_inline_script('jquery', buildvolt_get_admin_js());
}

function buildvolt_get_admin_js() {
  return <<<'JSEOF'
  window.buildvoltShowNotice = function(msg, type) {
    console.log('BuildVolt [' + type + ']:', msg);
    var el = document.getElementById('bb-notice');
    if (!el) { console.warn('BuildVolt: no #bb-notice element'); return; }
    el.textContent   = msg;
    el.className     = 'bb-notice ' + type;
    el.style.display = 'block';
    if (type === 'success') setTimeout(function(){ el.style.display = 'none'; }, 6000);
  };

  window.buildvoltConnect = async function() {
    var storeId = document.getElementById('bb-store-id').value.trim();
    var secret  = document.getElementById('bb-secret-key').value.trim();
    var btn     = document.getElementById('bb-connect-btn');

    if (!storeId) { window.buildvoltShowNotice('Please enter your Store ID.', 'error'); return; }
    if (!secret)  { window.buildvoltShowNotice('Please enter your Secret Key.', 'error'); return; }
    if (secret.indexOf('bv_live_') !== 0) {
      window.buildvoltShowNotice('Invalid Secret Key. It should start with bv_live_', 'error');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Testing connection...';
    window.buildvoltShowNotice('Testing connection to BuildVolt...', 'info');

    try {
      var pingRes = await fetch(BV_API + '/plugin/ping', {
        method:  'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-BuildVolt-Store-ID': storeId,
          'X-BuildVolt-Secret':   secret
        },
        body: JSON.stringify({ storeUrl: window.location.origin })
      });
      var pingData = await pingRes.json();

      if (!pingData.success) {
        window.buildvoltShowNotice('Connection failed: ' + (pingData.error || 'Check Store ID and Secret Key'), 'error');
        btn.disabled    = false;
        btn.textContent = 'Connect & Sync Products';
        return;
      }

      window.buildvoltShowNotice('Connected to ' + pingData.storeName + '! Saving settings...', 'info');
      btn.textContent = 'Syncing products...';

      var saveRes = await fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action:     'buildvolt_save_settings',
          store_id:   storeId,
          secret_key: secret,
          nonce:      buildvoltNonce
        })
      });
      var saveData = await saveRes.json();
      console.log('Save settings response:', saveData);

      await window.buildvoltDoSync(storeId, secret);

    } catch(err) {
      window.buildvoltShowNotice('Error: ' + err.message, 'error');
      btn.disabled    = false;
      btn.textContent = 'Connect & Sync Products';
    }
  };

  window.buildvoltSync = async function() {
    var btn = document.getElementById('bb-sync-btn');
    btn.disabled    = true;
    btn.textContent = 'Syncing...';
    await window.buildvoltDoSync(BV_STORE_ID, BV_SECRET);
    btn.disabled    = false;
    btn.textContent = 'Sync All Products Now';
  };

  window.buildvoltDoSync = async function(storeId, secret) {
    try {
      window.buildvoltShowNotice('Getting your WooCommerce products...', 'info');

      var prodRes = await fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'buildvolt_get_products',
          nonce:  buildvoltNonce
        })
      });
      var prodData = await prodRes.json();
      console.log('Products response:', prodData);

      if (!prodData.success) {
        window.buildvoltShowNotice('Could not get products: ' + (prodData.data ? prodData.data.error : 'Unknown error'), 'error');
        return;
      }

      var products = prodData.data.products;
      if (!products || products.length === 0) {
        window.buildvoltShowNotice('No published products found in WooCommerce. Please add products first.', 'warning');
        return;
      }

      window.buildvoltShowNotice('Sending ' + products.length + ' products to BuildVolt...', 'info');

      var syncRes = await fetch(BV_API + '/plugin/sync', {
        method:  'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-BuildVolt-Store-ID': storeId,
          'X-BuildVolt-Secret':   secret
        },
        body: JSON.stringify({
          products: products,
          storeUrl: window.location.origin
        })
      });
      var syncData = await syncRes.json();
      console.log('Sync response:', syncData);

      if (syncData.success) {
        await fetch(ajaxurl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            action:        'buildvolt_save_sync',
            product_count: syncData.synced,
            woo_url:       window.location.origin,
            nonce:         buildvoltNonce
          })
        });
        var noticeMsg = syncData.synced + ' product' + (syncData.synced === 1 ? '' : 's') + ' synced!';
        var skippedTotal = (syncData.skipped || 0) + (syncData.skippedCategory || 0);
        if (skippedTotal > 0) {
          noticeMsg += ' (' + skippedTotal + ' skipped — missing a price or not a recognized PC-part category.)';
        }
        if (syncData.message && syncData.synced === 0 && skippedTotal === 0) {
          // e.g. "Skipped — this store's data source isn't set to WooCommerce."
          // — a real reason, not just "0 products", so it's shown as-is
          // instead of a bare zero count that looks like success.
          noticeMsg = syncData.message;
        }
        window.buildvoltShowNotice(noticeMsg + ' Reloading...', syncData.synced > 0 ? 'success' : 'warning');
        setTimeout(function(){ location.reload(); }, 2500);
      } else {
        window.buildvoltShowNotice('Sync failed: ' + (syncData.error || 'Unknown error'), 'error');
      }

    } catch(err) {
      window.buildvoltShowNotice('Error: ' + err.message, 'error');
    }
  };

  window.buildvoltDisconnect = async function() {
    if (!confirm('Disconnect BuildVolt? Auto-sync will stop.')) return;
    await fetch(ajaxurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'buildvolt_disconnect', nonce: buildvoltNonce })
    });
    location.reload();
  };

  window.buildvoltToggleWidget = async function(enabled) {
    var slider = document.getElementById('bb-toggle-slider');
    var knob   = document.getElementById('bb-toggle-knob');
    var notice = document.getElementById('bb-toggle-notice');

    if (slider) slider.style.background = enabled ? '#7c3aed' : '#cbd5e1';
    if (knob)   knob.style.left         = enabled ? '28px'   : '4px';
    if (notice) {
      notice.textContent   = enabled ? 'Enabling widget...' : 'Disabling widget...';
      notice.className     = 'bb-notice info';
      notice.style.display = 'block';
    }

    try {
      var res = await fetch(ajaxurl, {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action:  'buildvolt_toggle_widget',
          enabled: enabled ? 'true' : 'false',
          nonce:   buildvoltNonce
        })
      });
      var data = await res.json();
      if (data.success && notice) {
        notice.textContent   = enabled ? 'Widget is now visible on your store!' : 'Widget is now hidden.';
        notice.className     = 'bb-notice ' + (enabled ? 'success' : 'warning');
        setTimeout(function(){ location.reload(); }, 2000);
      }
    } catch(err) {
      if (notice) {
        notice.textContent   = 'Error: ' + err.message;
        notice.className     = 'bb-notice error';
      }
    }
  };

  console.log('BuildVolt admin scripts loaded successfully');
JSEOF;
}


add_action('admin_head', 'buildvolt_admin_styles');
function buildvolt_admin_styles() {
  $screen = get_current_screen();
  if (!$screen || $screen->id !== 'toplevel_page_buildvolt') return;
  ?>
  <style>
    #buildvolt-wrap{max-width:800px;margin:30px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#334155;}
    .bb-header{background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:20px;padding:32px 40px;margin-bottom:28px;display:flex;align-items:center;gap:20px;box-shadow:0 10px 25px -5px rgba(124,58,237,0.3);}
    .bb-header-icon{font-size:48px;filter:drop-shadow(0 4px 6px rgba(0,0,0,0.1));}
    .bb-header h1{color:#fff!important;font-size:28px!important;font-weight:800!important;margin:0 0 6px!important;padding:0!important;border:none!important;letter-spacing:-0.5px;}
    .bb-header p{color:rgba(255,255,255,.8);margin:0;font-size:15px;font-weight:500;}
    .bb-card{background:#fff;border:1px solid #f1f5f9;border-radius:16px;padding:32px;margin-bottom:24px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.02),0 10px 15px -3px rgba(0,0,0,0.03);transition:transform .2s;}
    .bb-card h2{font-size:18px!important;font-weight:700!important;margin:0 0 8px!important;padding:0!important;border:none!important;color:#0f172a;}
    .bb-card p{color:#64748b;font-size:14px;line-height:1.6;margin:0 0 20px;}
    .bb-status{display:inline-flex;align-items:center;gap:8px;padding:8px 16px;border-radius:24px;font-size:13px;font-weight:600;margin-bottom:20px;}
    .bb-status.connected{background:#f0fdfa;color:#0d9488;border:1px solid #ccfbf1;}
    .bb-status.disconnected{background:#fef2f2;color:#dc2626;border:1px solid #fee2e2;}
    .bb-field{margin-bottom:20px;}
    .bb-field label{display:block;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#475569;margin-bottom:8px;}
    .bb-field input{width:100%;padding:12px 16px;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;font-weight:500;color:#0f172a;background:#f8fafc;box-sizing:border-box;transition:all .2s;}
    .bb-field input:focus{border-color:#7c3aed;background:#fff;box-shadow:0 0 0 4px rgba(124,58,237,0.1);outline:none;}
    .bb-field .bb-hint{font-size:12px;color:#94a3b8;margin-top:6px;}
    .bb-btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;text-decoration:none;}
    .bb-btn-primary{background:#7c3aed;color:#fff;box-shadow:0 4px 6px -1px rgba(124,58,237,0.2);}
    .bb-btn-primary:hover{background:#6d28d9;transform:translateY(-1px);box-shadow:0 6px 12px -2px rgba(124,58,237,0.3);color:#fff;}
    .bb-btn-secondary{background:#f8fafc;color:#475569;border:1px solid #e2e8f0;}
    .bb-btn-secondary:hover{background:#f1f5f9;color:#0f172a;}
    .bb-btn-danger{background:#fff;color:#dc2626;border:1px solid #fecaca;}
    .bb-btn-danger:hover{background:#fef2f2;}
    .bb-btn:disabled{opacity:.6;cursor:not-allowed;transform:none!important;box-shadow:none!important;}
    .bb-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:24px;}
    .bb-stat{background:#f8fafc;border:1px solid #f1f5f9;border-radius:12px;padding:16px;text-align:center;}
    .bb-stat-value{font-size:28px;font-weight:800;color:#7c3aed;margin-bottom:4px;letter-spacing:-0.5px;}
    .bb-stat-label{font-size:12px;font-weight:500;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
    .bb-notice{padding:14px 20px;border-radius:10px;font-size:14px;margin-top:16px;display:none;font-weight:500;}
    .bb-notice.success{background:#f0fdfa;border:1px solid #ccfbf1;color:#0f766e;}
    .bb-notice.error{background:#fef2f2;border:1px solid #fee2e2;color:#b91c1c;}
    .bb-notice.info{background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;}
    .bb-notice.warning{background:#fffbeb;border:1px solid #fef08a;color:#a16207;}
    .bb-cat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px;}
    .bb-cat-item{background:#f8fafc;border:1px solid #f1f5f9;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:500;}
    .bb-cat-count{background:#7c3aed;color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;}
    .bb-warning-box{background:#fefce8;border:1px solid #fef08a;border-left:4px solid #eab308;border-radius:10px;padding:16px 20px;margin-bottom:24px;font-size:14px;color:#854d0e;line-height:1.6;}
    .bb-footer{text-align:center;color:#94a3b8;font-size:13px;margin-top:16px;}
    .bb-footer a{color:#7c3aed;text-decoration:none;font-weight:500;}
    .bb-footer a:hover{text-decoration:underline;}
    @media(max-width:600px){.bb-stats{grid-template-columns:1fr;}.bb-cat-grid{grid-template-columns:1fr;}}
  </style>
  <?php
}

// ─── ADMIN PAGE ───────────────────────────────────────────
function buildvolt_sync_connection_status_from_api() {
  $store_id = get_option('buildvolt_store_id', '');
  $secret   = get_option('buildvolt_secret_key', '');
  if (!$store_id || !$secret) return;

  $response = wp_remote_post(BUILDVOLT_API . '/plugin/connection-status', [
    'headers' => [
      'Content-Type'        => 'application/json',
      'X-BuildVolt-Store-ID' => $store_id,
      'X-BuildVolt-Secret'   => $secret,
    ],
    'timeout' => 12,
  ]);

  if (is_wp_error($response)) return;

  $body = json_decode(wp_remote_retrieve_body($response), true);
  if (empty($body['success'])) return;

  update_option('buildvolt_connected', !empty($body['wooConnected']));
  if (empty($body['wooConnected'])) {
    update_option('buildvolt_last_sync', '');
    update_option('buildvolt_product_count', 0);
    update_option('buildvolt_woo_url', '');
  }
}

function buildvolt_admin_page() {
  buildvolt_sync_connection_status_from_api();

  $store_id       = get_option('buildvolt_store_id', '');
  $secret_key     = get_option('buildvolt_secret_key', '');
  $is_connected   = get_option('buildvolt_connected', false);
  $last_sync      = get_option('buildvolt_last_sync', '');
  $product_count  = get_option('buildvolt_product_count', 0);
  $is_pc_store    = get_option('buildvolt_is_pc_store', true);
  $cat_stats      = get_option('buildvolt_category_stats', []);
  $unmapped       = get_option('buildvolt_unmapped_count', 0);
  $widget_enabled = get_option('buildvolt_widget_enabled', true);
  ?>

  <div id="buildvolt-wrap">

    <!-- Header -->
    <div class="bb-header">
      <div class="bb-header-icon">⚡</div>
      <div>
        <h1>BuildVolt</h1>
        <p>Instant PC Build Recommender for your store</p>
      </div>
      <?php if ($is_connected): ?>
      <div style="margin-left:auto;background:rgba(255,255,255,.15);
        border-radius:8px;padding:8px 14px;font-size:12px;color:#fff;">
        v<?php echo BUILDVOLT_VERSION; ?>
      </div>
      <?php endif; ?>
    </div>

    <?php if ($is_connected && $store_id && $secret_key): ?>

    <!-- ── CONNECTED STATE ── -->

    <?php if (!$is_pc_store): ?>
    <div class="bb-warning-box">
      ⚠️ <strong>No PC parts detected</strong> in your product catalog.
      BuildVolt works best with PC components (CPU, GPU, RAM, etc.).
      Your products may not generate useful recommendations.
      Make sure your WooCommerce products are properly categorized.
    </div>
    <?php endif; ?>

    <div class="bb-card">
      <h2>Connection Status</h2>
      <div class="bb-status connected">✅ Connected to BuildVolt</div>

      <div class="bb-stats">
        <div class="bb-stat">
          <div class="bb-stat-value"><?php echo esc_html($product_count); ?></div>
          <div class="bb-stat-label">Products Synced</div>
        </div>
        <div class="bb-stat">
          <div class="bb-stat-value" style="font-size:13px;">
            <?php echo $last_sync ? esc_html(buildvolt_time_ago($last_sync)) : 'Never'; ?>
          </div>
          <div class="bb-stat-label">Last Synced</div>
        </div>
        <div class="bb-stat">
          <div class="bb-stat-value" style="font-size:12px;">
            <?php echo esc_html($store_id); ?>
          </div>
          <div class="bb-stat-label">Store ID</div>
        </div>
      </div>

      <?php if ($unmapped > 0): ?>
      <div class="bb-notice info" style="display:block;margin-bottom:14px;">
        ℹ️ <?php echo $unmapped; ?> product<?php echo $unmapped === 1 ? '' : 's'; ?>
        skipped — not a PC-build category BuildVolt recognizes (CPU, Motherboard,
        RAM, Storage, GPU, PSU, Case, CPU Cooler, Case Fans).
        Give them a matching category in WooCommerce to include them in recommendations.
      </div>
      <?php endif; ?>

      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button class="bb-btn bb-btn-primary" onclick="buildvoltSync()" id="bb-sync-btn">
          🔄 Sync All Products Now
        </button>
        <button class="bb-btn bb-btn-danger" onclick="buildvoltDisconnect()">
          Disconnect
        </button>
      </div>

      <div class="bb-notice" id="bb-notice"></div>
    </div>

    <!-- Widget Enable/Disable -->
    <div class="bb-card">
      <h2>Widget Visibility</h2>
      <p>Control whether the BuildVolt widget appears on your store frontend.</p>

      <div style="display:flex;align-items:center;justify-content:space-between;
        background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
        padding:16px 20px;">
        <div>
          <div style="font-size:14px;font-weight:600;color:#1a1d27;margin-bottom:2px;">
            <?php echo $widget_enabled ? '✅ Widget is Enabled' : '⛔ Widget is Disabled'; ?>
          </div>
          <div style="font-size:12px;color:#64748b;">
            <?php echo $widget_enabled
              ? 'Customers can see and use the BuildVolt widget on your store.'
              : 'Widget is hidden. Customers cannot see it on your store.'; ?>
          </div>
        </div>
        <label style="position:relative;display:inline-block;width:52px;height:28px;flex-shrink:0;">
          <input type="checkbox" id="bb-widget-toggle"
            <?php echo $widget_enabled ? 'checked' : ''; ?>
            onchange="buildvoltToggleWidget(this.checked)"
            style="opacity:0;width:0;height:0;">
          <span id="bb-toggle-slider" style="position:absolute;cursor:pointer;inset:0;
            background:<?php echo $widget_enabled ? '#7c3aed' : '#cbd5e1'; ?>;
            border-radius:34px;transition:.3s;">
            <span style="position:absolute;content:'';height:20px;width:20px;
              left:<?php echo $widget_enabled ? '28px' : '4px'; ?>;bottom:4px;
              background:white;border-radius:50%;transition:.3s;
              display:block;" id="bb-toggle-knob"></span>
          </span>
        </label>
      </div>
      <div class="bb-notice" id="bb-toggle-notice"></div>
    </div>

    <?php if (!empty($cat_stats)): ?>
    <div class="bb-card">
      <h2>Category Breakdown</h2>
      <p>How your products were categorized for build recommendations.</p>
      <div class="bb-cat-grid">
        <?php foreach ($cat_stats as $cat => $count): ?>
        <div class="bb-cat-item">
          <span><?php echo esc_html($cat); ?></span>
          <span class="bb-cat-count"><?php echo esc_html($count); ?></span>
        </div>
        <?php endforeach; ?>
      </div>
    </div>
    <?php endif; ?>

    <?php else: ?>

    <!-- ── SETUP STATE ── -->
    <div class="bb-card">
      <h2>Connect to BuildVolt</h2>
      <p>Enter your Store ID and Secret Key from your BuildVolt dashboard.</p>

      <div class="bb-status disconnected">● Not Connected</div>

      <div class="bb-field">
        <label>Store ID</label>
        <input type="text" id="bb-store-id"
          value="<?php echo esc_attr($store_id); ?>"
          placeholder="e.g. techzone-lahore"/>
        <div class="bb-hint">
          BuildVolt Dashboard → Settings → WooCommerce section → Your Store ID
        </div>
      </div>

      <div class="bb-field">
        <label>Secret Key</label>
        <input type="password" id="bb-secret-key"
          value="<?php echo esc_attr($secret_key); ?>"
          placeholder="bv_live_..."/>
        <div class="bb-hint">
          BuildVolt Dashboard → Settings → WooCommerce section → Generate Key → Copy
        </div>
      </div>

      <button class="bb-btn bb-btn-primary"
        onclick="buildvoltConnect()" id="bb-connect-btn">
        🔌 Connect & Sync Products
      </button>

      <div class="bb-notice" id="bb-notice"></div>
    </div>

    <!-- How it works -->
    <div class="bb-card">
      <h2>How It Works</h2>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;gap:12px;">
          <span style="font-size:20px;flex-shrink:0;">🔌</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;display:block;margin-bottom:2px;">
              One-time setup
            </strong>
            <span style="font-size:12px;color:#64748b;">
              Connect once and forget. No CSV uploads, no manual work.
            </span>
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <span style="font-size:20px;flex-shrink:0;">🔄</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;display:block;margin-bottom:2px;">
              Auto-syncs every 6 hours
            </strong>
            <span style="font-size:12px;color:#64748b;">
              Price changes, new products, stock updates — all automatic.
            </span>
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <span style="font-size:20px;flex-shrink:0;">🤖</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;display:block;margin-bottom:2px;">
              Recommends only your products
            </strong>
            <span style="font-size:12px;color:#64748b;">
              Customers get personalized PC builds using parts you actually sell.
            </span>
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <span style="font-size:20px;flex-shrink:0;">📦</span>
          <div>
            <strong style="font-size:13px;color:#1a1d27;display:block;margin-bottom:2px;">
              Stock-aware
            </strong>
            <span style="font-size:12px;color:#64748b;">
              Out of stock products are never recommended to customers.
            </span>
          </div>
        </div>
      </div>
    </div>

    <?php endif; ?>

    <div class="bb-footer">
      BuildVolt v<?php echo BUILDVOLT_VERSION; ?> •
      <a href="https://buildvolt.online/dashboard.html" target="_blank">Dashboard</a> •
      Auto-syncs every 6 hours
    </div>

  </div>

  <?php // JavaScript loaded via buildvolt_enqueue_admin_scripts ?>

  <?php
}

// ─── AJAX HANDLERS ────────────────────────────────────────
add_action('wp_ajax_buildvolt_save_settings', 'buildvolt_save_settings_ajax');
function buildvolt_save_settings_ajax() {
  check_ajax_referer('buildvolt_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  update_option('buildvolt_store_id',  sanitize_text_field($_POST['store_id']));
  update_option('buildvolt_secret_key', sanitize_text_field($_POST['secret_key']));
  update_option('buildvolt_connected', true);
  wp_send_json_success();
}

add_action('wp_ajax_buildvolt_get_products', 'buildvolt_get_products_ajax');
function buildvolt_get_products_ajax() {
  check_ajax_referer('buildvolt_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  if (!class_exists('WooCommerce')) {
    wp_send_json_error(['error' => 'WooCommerce not active']);
    return;
  }
  $result = buildvolt_get_all_products();
  wp_send_json_success($result);
}

add_action('wp_ajax_buildvolt_save_sync', 'buildvolt_save_sync_ajax');
function buildvolt_save_sync_ajax() {
  check_ajax_referer('buildvolt_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  update_option('buildvolt_last_sync',     current_time('mysql'));
  update_option('buildvolt_product_count', intval($_POST['product_count']));
  update_option('buildvolt_woo_url',       esc_url_raw($_POST['woo_url']));
  wp_send_json_success();
}

add_action('wp_ajax_buildvolt_disconnect', 'buildvolt_disconnect_ajax');
function buildvolt_disconnect_ajax() {
  check_ajax_referer('buildvolt_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  $store_id = get_option('buildvolt_store_id', '');
  $secret   = get_option('buildvolt_secret_key', '');
  if ($store_id && $secret) {
    wp_remote_post(BUILDVOLT_API . '/plugin/remote-disconnect', [
      'headers' => [
        'Content-Type'          => 'application/json',
        'X-BuildVolt-Store-ID'   => $store_id,
        'X-BuildVolt-Secret'     => $secret,
      ],
      'timeout' => 15,
    ]);
  }

  update_option('buildvolt_connected', false);
  update_option('buildvolt_last_sync', '');
  update_option('buildvolt_product_count', 0);
  update_option('buildvolt_woo_url', '');
  update_option('buildvolt_is_pc_store', true);
  update_option('buildvolt_category_stats', []);
  update_option('buildvolt_unmapped_count', 0);
  // keep store_id and secret_key so reconnect is quick, but stop all features
  update_option('buildvolt_widget_enabled', true);
  wp_send_json_success(['disconnected' => true]);
}

// ─── NONCE IN FOOTER (kept for compatibility) ────────────
// Note: nonce is now defined inline in the admin page script

// ─── REAL-TIME HOOKS ──────────────────────────────────────
// Sends the delete POST — shared by the trash hook below and by the
// update hook whenever a product is saved in a non-published state (see
// buildvolt_hook_product_update), so a product moved to Draft/Private
// stops recommending it immediately instead of staying live until the
// next 6-hourly cron sync happens to notice it no longer qualifies.
function buildvolt_send_delete($post_id, $product_name = null) {
  $store_id = get_option('buildvolt_store_id');
  $secret   = get_option('buildvolt_secret_key');
  if (!$store_id || !$secret) return;
  if (!$product_name) {
    $product = wc_get_product($post_id);
    $product_name = $product ? $product->get_name() : get_the_title($post_id);
  }
  if (!$product_name) $product_name = 'Deleted product';
  wp_remote_post(BUILDVOLT_API . '/plugin/product/delete', [
    'headers'  => ['Content-Type' => 'application/json', 'X-BuildVolt-Store-ID' => $store_id, 'X-BuildVolt-Secret' => $secret],
    'body'     => json_encode(['productName' => $product_name, 'wooId' => $post_id]),
    'timeout'  => 10,
    'blocking' => false
  ]);
}

add_action('woocommerce_update_product', 'buildvolt_hook_product_update');
add_action('woocommerce_new_product',    'buildvolt_hook_product_update');
// A product coming back out of Trash fires this with its restored status
// (normally 'publish') — reusing the same update hook means it's treated
// exactly like any other save: re-added if publish, still skipped/removed
// otherwise. Without this, a restored product stayed absent from
// BuildVolt until the next 6-hourly cron sync.
add_action('untrashed_post', 'buildvolt_hook_product_update');
function buildvolt_hook_product_update($product_id) {
  if (!get_option('buildvolt_connected')) return;
  $store_id = get_option('buildvolt_store_id');
  $secret   = get_option('buildvolt_secret_key');
  if (!$store_id || !$secret) return;

  $product = wc_get_product($product_id);
  if (!$product) return;

  // Only a published product should ever reach customers — without this,
  // saving a still-in-progress Draft, or switching a product to Private/
  // Pending review, pushed it to BuildVolt exactly like a live listing.
  // Actively removing it (rather than just not-adding it) matters for the
  // common case of un-publishing something that WAS already synced.
  if (get_post_status($product_id) !== 'publish') {
    buildvolt_send_delete($product_id, $product->get_name());
    return;
  }

  // See the matching check in buildvolt_get_all_products() — a variable
  // product's parent has no single purchasable ID.
  if ($product->is_type('variable')) {
    buildvolt_send_delete($product_id, $product->get_name());
    return;
  }

  $terms    = get_the_terms($product_id, 'product_cat');
  $woo_cats = [];
  if ($terms && !is_wp_error($terms)) {
    foreach ($terms as $t) $woo_cats[] = ['name' => $t->name];
  }

  $price = floatval($product->get_sale_price() ?: $product->get_regular_price() ?: $product->get_price());
  if ($price <= 0) return;

  $description = strip_tags($product->get_short_description() ?: wp_trim_words($product->get_description(), 25, ''));

  wp_remote_post(BUILDVOLT_API . '/plugin/product/update', [
    'headers' => ['Content-Type' => 'application/json', 'X-BuildVolt-Store-ID' => $store_id, 'X-BuildVolt-Secret' => $secret],
    'body'    => json_encode(['product' => [
      'id'                => $product->get_id(),
      'name'              => $product->get_name(),
      'price'             => $price,
      'regular_price'     => $product->get_regular_price(),
      'sale_price'        => $product->get_sale_price(),
      'stock_status'      => $product->get_stock_status(),
      'categories'        => $woo_cats,
      'short_description' => $description
    ]]),
    'timeout' => 10,
    'blocking' => false
  ]);
}

add_action('wp_trash_post', 'buildvolt_hook_product_delete');
function buildvolt_hook_product_delete($post_id) {
  if (get_post_type($post_id) !== 'product') return;
  if (!get_option('buildvolt_connected')) return;
  // wc_get_product() can be null here depending on trash timing; fall back to post title.
  $product = wc_get_product($post_id);
  $product_name = $product ? $product->get_name() : get_the_title($post_id);
  buildvolt_send_delete($post_id, $product_name);
}

// ─── TIME AGO HELPER ──────────────────────────────────────
function buildvolt_time_ago($datetime) {
  $diff = time() - strtotime($datetime);
  if ($diff < 60)    return $diff . 's ago';
  if ($diff < 3600)  return floor($diff/60) . 'm ago';
  if ($diff < 86400) return floor($diff/3600) . 'h ago';
  return floor($diff/86400) . 'd ago';
}

// ─── WIDGET ENABLE/DISABLE TOGGLE ────────────────────────
add_action('wp_ajax_buildvolt_toggle_widget', 'buildvolt_toggle_widget_ajax');
function buildvolt_toggle_widget_ajax() {
  check_ajax_referer('buildvolt_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  $enabled = isset($_POST['enabled']) && $_POST['enabled'] === 'true';
  update_option('buildvolt_widget_enabled', $enabled);

  // Also notify BuildVolt server
  $store_id = get_option('buildvolt_store_id');
  $secret   = get_option('buildvolt_secret_key');

  if ($store_id && $secret) {
    wp_remote_post(BUILDVOLT_API . '/plugin/widget-toggle', [
      'headers' => [
        'Content-Type'        => 'application/json',
        'X-BuildVolt-Store-ID' => $store_id,
        'X-BuildVolt-Secret'   => $secret
      ],
      'body'    => json_encode(['enabled' => $enabled]),
      'timeout' => 10
    ]);
  }

  wp_send_json_success(['enabled' => $enabled]);
}

// ─── WIDGET "ORDER THIS BUILD" → ADD ALL PARTS TO CART ────
// The widget's "Order This Build" button navigates the customer's browser
// straight to this URL on the store's own domain (never a cross-origin
// fetch from BuildVolt's server) — that's what lets WooCommerce's cart
// session cookies apply correctly. Items arrive as items=[{"id":123,
// "qty":1}, ...] JSON, matched by the WooCommerce product ID BuildVolt
// stored when this product was synced. Runs on template_redirect so
// WooCommerce's cart/session is guaranteed to be initialized.
add_action('template_redirect', 'buildvolt_handle_add_to_cart');
function buildvolt_handle_add_to_cart() {
  if (empty($_GET['buildvolt_add_to_cart']) || empty($_GET['items'])) return;
  if (!class_exists('WooCommerce') || !function_exists('WC') || !WC()->cart) return;

  $items = json_decode(stripslashes($_GET['items']), true);
  if (!is_array($items)) {
    wp_safe_redirect(wc_get_cart_url());
    exit;
  }

  WC()->cart->empty_cart();

  $added = 0;
  foreach ($items as $item) {
    $product_id = isset($item['id']) ? intval($item['id']) : 0;
    $qty        = isset($item['qty']) ? max(1, intval($item['qty'])) : 1;
    if ($product_id <= 0) continue;

    $product = wc_get_product($product_id);
    if (!$product || !$product->is_purchasable()) continue;

    if (WC()->cart->add_to_cart($product_id, $qty)) {
      $added++;
    }
  }

  wp_safe_redirect($added > 0 ? wc_get_checkout_url() : wc_get_cart_url());
  exit;
}

// ─── AUTO INJECT WIDGET SCRIPT ────────────────────────────
add_action('wp_footer', 'buildvolt_inject_widget');
function buildvolt_inject_widget() {
  // Only inject if connected AND widget is enabled
  if (!get_option('buildvolt_connected'))     return;
  if (!get_option('buildvolt_widget_enabled', true)) return;

  $store_id = get_option('buildvolt_store_id');
  if (!$store_id) return;

  // Never inject in admin
  if (is_admin()) return;

  $widget_url = 'https://buildbot-production-3f70.up.railway.app/widget.js';
  echo '<!-- BuildVolt PC Build Recommender -->' . "
";
  echo '<script src="' . esc_url($widget_url) . '" data-store-id="' . esc_attr($store_id) . '"></script>' . "
";
}
