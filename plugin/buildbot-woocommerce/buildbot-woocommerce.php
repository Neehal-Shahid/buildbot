<?php
/**
 * Plugin Name: BuildBot AI PC Recommender
 * Plugin URI:  https://buildbot-nine.vercel.app
 * Description: Connects your WooCommerce store to BuildBot — syncs products automatically so customers get AI-powered PC build recommendations.
 * Version:     1.5.0
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
define('BUILDBOT_VERSION', '1.5.0');
define('BUILDBOT_UPDATE_URL', 'https://buildbot-production.up.railway.app/plugin-update.json');

// ─── CHECK WOOCOMMERCE ON ACTIVATION ─────────────────────
register_activation_hook(__FILE__, 'buildbot_activate');
function buildbot_activate() {
  if (!class_exists('WooCommerce')) {
    deactivate_plugins(plugin_basename(__FILE__));
    wp_die(
      '<div style="font-family:sans-serif;padding:20px;">
        <h2>⚡ BuildBot — Activation Failed</h2>
        <p><strong>WooCommerce is not installed or active.</strong></p>
        <p>BuildBot requires WooCommerce to work. Please install and activate
        WooCommerce first, then activate BuildBot.</p>
        <a href="' . admin_url('plugins.php') . '">← Back to Plugins</a>
      </div>',
      'WooCommerce Required',
      ['back_link' => false]
    );
  }

  // Schedule auto sync every 6 hours
  if (!wp_next_scheduled('buildbot_auto_sync')) {
    wp_schedule_event(time(), 'buildbot_6hours', 'buildbot_auto_sync');
  }
}

// ─── DEACTIVATION ─────────────────────────────────────────
register_deactivation_hook(__FILE__, 'buildbot_deactivate');
function buildbot_deactivate() {
  wp_clear_scheduled_hook('buildbot_auto_sync');
}

// ─── CUSTOM CRON SCHEDULE ─────────────────────────────────
add_filter('cron_schedules', 'buildbot_cron_schedules');
function buildbot_cron_schedules($schedules) {
  $schedules['buildbot_6hours'] = [
    'interval' => 6 * HOUR_IN_SECONDS,
    'display'  => 'Every 6 Hours'
  ];
  return $schedules;
}

// ─── AUTO SYNC CRON ───────────────────────────────────────
add_action('buildbot_auto_sync', 'buildbot_full_sync');

// ─── AUTO UPDATES ─────────────────────────────────────────
add_filter('pre_set_site_transient_update_plugins', 'buildbot_check_update');
function buildbot_check_update($transient) {
  if (empty($transient->checked)) return $transient;

  $response = wp_remote_get(BUILDBOT_UPDATE_URL, ['timeout' => 10]);
  if (is_wp_error($response)) return $transient;

  $update = json_decode(wp_remote_retrieve_body($response), true);
  if (!$update) return $transient;

  $plugin_file = plugin_basename(__FILE__);
  if (isset($update['version']) &&
      version_compare($update['version'], BUILDBOT_VERSION, '>')) {
    $transient->response[$plugin_file] = (object)[
      'slug'        => 'buildbot-woocommerce',
      'plugin'      => $plugin_file,
      'new_version' => $update['version'],
      'url'         => 'https://buildbot-nine.vercel.app',
      'package'     => $update['download_url']
    ];
  }
  return $transient;
}

// ─── CATEGORY MAPPING ─────────────────────────────────────
function buildbot_map_category($woo_categories, $product_name = '') {
  // Keywords → BuildBot category
  $keyword_map = [
    'CPU'         => ['cpu', 'processor', 'intel core', 'ryzen', 'amd ryzen',
                      'core i3', 'core i5', 'core i7', 'core i9',
                      'threadripper', 'xeon', 'celeron', 'pentium', 'athlon'],
    'Motherboard' => ['motherboard', 'mobo', 'mainboard', 'lga', 'am4', 'am5',
                      'b450', 'b550', 'b660', 'b760', 'x570', 'z690', 'z790',
                      'h610', 'h410', 'h510', 'asus prime', 'msi pro',
                      'gigabyte', 'asrock'],
    'RAM'         => ['ram', 'memory', 'ddr4', 'ddr5', 'dimm', 'sodimm',
                      'vengeance', 'ripjaws', 'fury', '3200mhz', '3600mhz',
                      '4800mhz', '6000mhz', '8gb ram', '16gb ram', '32gb ram'],
    'Storage'     => ['ssd', 'hdd', 'hard drive', 'hard disk', 'nvme', 'solid state',
                      'm.2', 'sata', '970 evo', 'wd blue', 'seagate', 'barracuda',
                      'crucial mx', 'kingston', 'tb hdd', 'gb ssd', '1tb', '2tb', '500gb'],
    'GPU'         => ['gpu', 'graphics', 'video card', 'rtx', 'gtx', 'radeon',
                      'rx 6', 'rx 7', 'geforce', 'nvidia', 'amd gpu',
                      '3060', '3070', '3080', '4060', '4070', '4080', '4090',
                      '6600', '6700', '7600', '7700', '1660', '1650'],
    'PSU'         => ['psu', 'power supply', 'power unit', 'smps', 'watt',
                      '550w', '650w', '750w', '850w', '1000w',
                      'corsair cv', 'seasonic', 'evga', 'cooler master mwe',
                      '80 plus', 'gold psu', 'bronze psu', 'modular'],
    'Case'        => ['case', 'cabinet', 'casing', 'chassis', 'tower',
                      'mid tower', 'full tower', 'mini itx', 'micro atx',
                      'matrexx', 'nzxt', 'fractal', 'lian li', 'phanteks',
                      'corsair 4000', 'ant esports', 'deepcool'],
    'Monitor'     => ['monitor', 'display', 'screen', 'led monitor', 'ips',
                      'va panel', 'tn panel', '144hz', '165hz', '240hz',
                      '1080p', '1440p', '4k monitor', '24 inch', '27 inch',
                      'dell monitor', 'lg monitor', 'aoc', 'benq'],
    'Cooling'     => ['cooler', 'cooling', 'heatsink', 'aio', 'liquid cool',
                      'cpu fan', 'case fan', 'rgb fan', 'arctic', 'noctua',
                      'be quiet', 'hyper 212', 'thermal paste', 'thermal grease'],
    'Networking'  => ['wifi', 'wireless', 'network card', 'lan card', 'ethernet',
                      'router', 'tp-link', 'asus router', 'pcie wifi',
                      'bluetooth adapter', 'usb wifi'],
    'UPS'         => ['ups', 'uninterruptible', 'power backup', 'inverter ups',
                      'apc ups', 'cyber power', 'voltage stabilizer'],
    'Peripherals' => ['keyboard', 'mouse', 'headset', 'headphone', 'webcam',
                      'gamepad', 'controller', 'microphone', 'speaker',
                      'redragon', 'logitech', 'razer', 'corsair k',
                      'gaming keyboard', 'mechanical keyboard', 'wireless mouse'],
    'Cable'       => ['cable', 'hdmi', 'displayport', 'usb cable', 'sata cable',
                      'extension cable', 'adapter', 'hub', 'usb hub'],
    'Software'    => ['windows', 'microsoft office', 'antivirus', 'os',
                      'operating system', 'software license', 'windows 11',
                      'windows 10']
  ];

  $search_text = strtolower($product_name);

  // First try to match from WooCommerce category names
  if (!empty($woo_categories)) {
    foreach ($woo_categories as $cat) {
      $cat_lower = strtolower($cat['name']);
      foreach ($keyword_map as $buildbot_cat => $keywords) {
        foreach ($keywords as $keyword) {
          if (strpos($cat_lower, $keyword) !== false) {
            return $buildbot_cat;
          }
        }
      }
    }
  }

  // Then try to match from product name
  foreach ($keyword_map as $buildbot_cat => $keywords) {
    foreach ($keywords as $keyword) {
      if (strpos($search_text, $keyword) !== false) {
        return $buildbot_cat;
      }
    }
  }

  return 'Accessory';
}

// ─── GET ALL WOOCOMMERCE PRODUCTS ─────────────────────────
function buildbot_get_all_products() {
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

    // Skip variable products with no price
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
    $mapped_category  = buildbot_map_category($woo_cats, $product_name);

    if ($mapped_category === 'Accessory' && empty($woo_cats)) {
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
function buildbot_is_pc_store($category_stats) {
  $pc_categories = ['CPU', 'Motherboard', 'RAM', 'Storage', 'GPU', 'PSU', 'Case'];
  $pc_count      = 0;
  foreach ($pc_categories as $cat) {
    if (!empty($category_stats[$cat])) $pc_count++;
  }
  return $pc_count >= 2; // at least 2 PC categories = PC store
}

// ─── FULL SYNC FUNCTION ───────────────────────────────────
function buildbot_full_sync() {
  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');

  if (!$store_id || !$secret || !get_option('buildbot_connected')) return;
  if (!class_exists('WooCommerce')) return;

  $result   = buildbot_get_all_products();
  $products = $result['products'];

  if (empty($products)) return;

  // Check if it's a PC store
  $is_pc = buildbot_is_pc_store($result['category_stats']);
  update_option('buildbot_is_pc_store', $is_pc);
  update_option('buildbot_category_stats', $result['category_stats']);
  update_option('buildbot_unmapped_count', $result['unmapped']);

  $response = wp_remote_post(BUILDBOT_API . '/plugin/sync', [
    'headers' => [
      'Content-Type'        => 'application/json',
      'X-BuildBot-Store-ID' => $store_id,
      'X-BuildBot-Secret'   => $secret
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

// ─── ADMIN STYLES ─────────────────────────────────────────
add_action('admin_enqueue_scripts', 'buildbot_enqueue_admin_scripts');
function buildbot_enqueue_admin_scripts($hook) {
  if ($hook !== 'toplevel_page_buildbot') return;

  // Enqueue jQuery (WordPress has it built-in)
  wp_enqueue_script('jquery');

  // Inline script with all BuildBot JS
  $store_id  = get_option('buildbot_store_id', '');
  $secret    = get_option('buildbot_secret_key', '');
  $api       = BUILDBOT_API;
  $nonce     = wp_create_nonce('buildbot_nonce');

  $inline_js = "
    var BB_API        = '" . esc_js($api) . "';
    var BB_STORE_ID   = '" . esc_js($store_id) . "';
    var BB_SECRET     = '" . esc_js($secret) . "';
    var buildbotNonce = '" . esc_js($nonce) . "';
  ";

  wp_add_inline_script('jquery', $inline_js);
  wp_add_inline_script('jquery', buildbot_get_admin_js());
}

function buildbot_get_admin_js() {
  return <<<'JSEOF'
  window.buildbotShowNotice = function(msg, type) {
    console.log('BuildBot [' + type + ']:', msg);
    var el = document.getElementById('bb-notice');
    if (!el) { console.warn('BuildBot: no #bb-notice element'); return; }
    el.textContent   = msg;
    el.className     = 'bb-notice ' + type;
    el.style.display = 'block';
    if (type === 'success') setTimeout(function(){ el.style.display = 'none'; }, 6000);
  };

  window.buildbotConnect = async function() {
    var storeId = document.getElementById('bb-store-id').value.trim();
    var secret  = document.getElementById('bb-secret-key').value.trim();
    var btn     = document.getElementById('bb-connect-btn');

    if (!storeId) { window.buildbotShowNotice('Please enter your Store ID.', 'error'); return; }
    if (!secret)  { window.buildbotShowNotice('Please enter your Secret Key.', 'error'); return; }
    if (secret.indexOf('bb_live_') !== 0) {
      window.buildbotShowNotice('Invalid Secret Key. It should start with bb_live_', 'error');
      return;
    }

    btn.disabled    = true;
    btn.textContent = 'Testing connection...';
    window.buildbotShowNotice('Testing connection to BuildBot...', 'info');

    try {
      var pingRes = await fetch(BB_API + '/plugin/ping', {
        method:  'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-BuildBot-Store-ID': storeId,
          'X-BuildBot-Secret':   secret
        }
      });
      var pingData = await pingRes.json();

      if (!pingData.success) {
        window.buildbotShowNotice('Connection failed: ' + (pingData.error || 'Check Store ID and Secret Key'), 'error');
        btn.disabled    = false;
        btn.textContent = 'Connect & Sync Products';
        return;
      }

      window.buildbotShowNotice('Connected to ' + pingData.storeName + '! Saving settings...', 'info');
      btn.textContent = 'Syncing products...';

      var saveRes = await fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action:     'buildbot_save_settings',
          store_id:   storeId,
          secret_key: secret,
          nonce:      buildbotNonce
        })
      });
      var saveData = await saveRes.json();
      console.log('Save settings response:', saveData);

      await window.buildbotDoSync(storeId, secret);

    } catch(err) {
      window.buildbotShowNotice('Error: ' + err.message, 'error');
      btn.disabled    = false;
      btn.textContent = 'Connect & Sync Products';
    }
  };

  window.buildbotSync = async function() {
    var btn = document.getElementById('bb-sync-btn');
    btn.disabled    = true;
    btn.textContent = 'Syncing...';
    await window.buildbotDoSync(BB_STORE_ID, BB_SECRET);
    btn.disabled    = false;
    btn.textContent = 'Sync All Products Now';
  };

  window.buildbotDoSync = async function(storeId, secret) {
    try {
      window.buildbotShowNotice('Getting your WooCommerce products...', 'info');

      var prodRes = await fetch(ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          action: 'buildbot_get_products',
          nonce:  buildbotNonce
        })
      });
      var prodData = await prodRes.json();
      console.log('Products response:', prodData);

      if (!prodData.success) {
        window.buildbotShowNotice('Could not get products: ' + (prodData.data ? prodData.data.error : 'Unknown error'), 'error');
        return;
      }

      var products = prodData.data.products;
      if (!products || products.length === 0) {
        window.buildbotShowNotice('No published products found in WooCommerce. Please add products first.', 'warning');
        return;
      }

      window.buildbotShowNotice('Sending ' + products.length + ' products to BuildBot...', 'info');

      var syncRes = await fetch(BB_API + '/plugin/sync', {
        method:  'POST',
        headers: {
          'Content-Type':        'application/json',
          'X-BuildBot-Store-ID': storeId,
          'X-BuildBot-Secret':   secret
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
            action:        'buildbot_save_sync',
            product_count: syncData.synced,
            woo_url:       window.location.origin,
            nonce:         buildbotNonce
          })
        });
        window.buildbotShowNotice(syncData.synced + ' products synced! Reloading...', 'success');
        setTimeout(function(){ location.reload(); }, 2000);
      } else {
        window.buildbotShowNotice('Sync failed: ' + (syncData.error || 'Unknown error'), 'error');
      }

    } catch(err) {
      window.buildbotShowNotice('Error: ' + err.message, 'error');
    }
  };

  window.buildbotDisconnect = async function() {
    if (!confirm('Disconnect BuildBot? Auto-sync will stop.')) return;
    await fetch(ajaxurl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ action: 'buildbot_disconnect', nonce: buildbotNonce })
    });
    location.reload();
  };

  window.buildbotToggleWidget = async function(enabled) {
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
          action:  'buildbot_toggle_widget',
          enabled: enabled ? 'true' : 'false',
          nonce:   buildbotNonce
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

  console.log('BuildBot admin scripts loaded successfully');
JSEOF;
}


add_action('admin_head', 'buildbot_admin_styles');
function buildbot_admin_styles() {
  $screen = get_current_screen();
  if (!$screen || $screen->id !== 'toplevel_page_buildbot') return;
  ?>
  <style>
    #buildbot-wrap{max-width:800px;margin:30px 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#334155;}
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
function buildbot_admin_page() {
  $store_id       = get_option('buildbot_store_id', '');
  $secret_key     = get_option('buildbot_secret_key', '');
  $is_connected   = get_option('buildbot_connected', false);
  $last_sync      = get_option('buildbot_last_sync', '');
  $product_count  = get_option('buildbot_product_count', 0);
  $is_pc_store    = get_option('buildbot_is_pc_store', true);
  $cat_stats      = get_option('buildbot_category_stats', []);
  $unmapped       = get_option('buildbot_unmapped_count', 0);
  $widget_enabled = get_option('buildbot_widget_enabled', true);
  ?>

  <div id="buildbot-wrap">

    <!-- Header -->
    <div class="bb-header">
      <div class="bb-header-icon">⚡</div>
      <div>
        <h1>BuildBot</h1>
        <p>AI-powered PC Build Recommender for your store</p>
      </div>
      <?php if ($is_connected): ?>
      <div style="margin-left:auto;background:rgba(255,255,255,.15);
        border-radius:8px;padding:8px 14px;font-size:12px;color:#fff;">
        v<?php echo BUILDBOT_VERSION; ?>
      </div>
      <?php endif; ?>
    </div>

    <?php if ($is_connected && $store_id && $secret_key): ?>

    <!-- ── CONNECTED STATE ── -->

    <?php if (!$is_pc_store): ?>
    <div class="bb-warning-box">
      ⚠️ <strong>No PC parts detected</strong> in your product catalog.
      BuildBot works best with PC components (CPU, GPU, RAM, etc.).
      Your products may not generate useful recommendations.
      Make sure your WooCommerce products are properly categorized.
    </div>
    <?php endif; ?>

    <div class="bb-card">
      <h2>Connection Status</h2>
      <div class="bb-status connected">✅ Connected to BuildBot</div>

      <div class="bb-stats">
        <div class="bb-stat">
          <div class="bb-stat-value"><?php echo esc_html($product_count); ?></div>
          <div class="bb-stat-label">Products Synced</div>
        </div>
        <div class="bb-stat">
          <div class="bb-stat-value" style="font-size:13px;">
            <?php echo $last_sync ? esc_html(buildbot_time_ago($last_sync)) : 'Never'; ?>
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
        ℹ️ <?php echo $unmapped; ?> products were saved as "Accessory"
        because their category could not be detected.
        Consider adding proper categories in WooCommerce for better recommendations.
      </div>
      <?php endif; ?>

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

    <!-- Widget Enable/Disable -->
    <div class="bb-card">
      <h2>Widget Visibility</h2>
      <p>Control whether the BuildBot widget appears on your store frontend.</p>

      <div style="display:flex;align-items:center;justify-content:space-between;
        background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;
        padding:16px 20px;">
        <div>
          <div style="font-size:14px;font-weight:600;color:#1a1d27;margin-bottom:2px;">
            <?php echo $widget_enabled ? '✅ Widget is Enabled' : '⛔ Widget is Disabled'; ?>
          </div>
          <div style="font-size:12px;color:#64748b;">
            <?php echo $widget_enabled
              ? 'Customers can see and use the BuildBot widget on your store.'
              : 'Widget is hidden. Customers cannot see it on your store.'; ?>
          </div>
        </div>
        <label style="position:relative;display:inline-block;width:52px;height:28px;flex-shrink:0;">
          <input type="checkbox" id="bb-widget-toggle"
            <?php echo $widget_enabled ? 'checked' : ''; ?>
            onchange="buildbotToggleWidget(this.checked)"
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
      <p>How your products were categorized for AI recommendations.</p>
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
      <h2>Connect to BuildBot</h2>
      <p>Enter your Store ID and Secret Key from your BuildBot dashboard.</p>

      <div class="bb-status disconnected">● Not Connected</div>

      <div class="bb-field">
        <label>Store ID</label>
        <input type="text" id="bb-store-id"
          value="<?php echo esc_attr($store_id); ?>"
          placeholder="e.g. techzone-lahore"/>
        <div class="bb-hint">
          BuildBot Dashboard → Settings → WooCommerce section → Your Store ID
        </div>
      </div>

      <div class="bb-field">
        <label>Secret Key</label>
        <input type="password" id="bb-secret-key"
          value="<?php echo esc_attr($secret_key); ?>"
          placeholder="bb_live_..."/>
        <div class="bb-hint">
          BuildBot Dashboard → Settings → WooCommerce section → Generate Key → Copy
        </div>
      </div>

      <button class="bb-btn bb-btn-primary"
        onclick="buildbotConnect()" id="bb-connect-btn">
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
              AI recommends only your products
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
      BuildBot v<?php echo BUILDBOT_VERSION; ?> •
      <a href="https://buildbot-nine.vercel.app" target="_blank">Dashboard</a> •
      Auto-syncs every 6 hours
    </div>

  </div>

  <?php // JavaScript loaded via buildbot_enqueue_admin_scripts ?>

  <?php
}

// ─── AJAX HANDLERS ────────────────────────────────────────
add_action('wp_ajax_buildbot_save_settings', 'buildbot_save_settings_ajax');
function buildbot_save_settings_ajax() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  update_option('buildbot_store_id',  sanitize_text_field($_POST['store_id']));
  update_option('buildbot_secret_key', sanitize_text_field($_POST['secret_key']));
  update_option('buildbot_connected', true);
  wp_send_json_success();
}

add_action('wp_ajax_buildbot_get_products', 'buildbot_get_products_ajax');
function buildbot_get_products_ajax() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  if (!class_exists('WooCommerce')) {
    wp_send_json_error(['error' => 'WooCommerce not active']);
    return;
  }
  $result = buildbot_get_all_products();
  wp_send_json_success($result);
}

add_action('wp_ajax_buildbot_save_sync', 'buildbot_save_sync_ajax');
function buildbot_save_sync_ajax() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  update_option('buildbot_last_sync',     current_time('mysql'));
  update_option('buildbot_product_count', intval($_POST['product_count']));
  update_option('buildbot_woo_url',       esc_url_raw($_POST['woo_url']));
  wp_send_json_success();
}

add_action('wp_ajax_buildbot_disconnect', 'buildbot_disconnect_ajax');
function buildbot_disconnect_ajax() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');
  update_option('buildbot_connected', false);
  update_option('buildbot_last_sync', '');
  update_option('buildbot_product_count', 0);
  update_option('buildbot_woo_url', '');
  update_option('buildbot_is_pc_store', true);
  update_option('buildbot_category_stats', []);
  update_option('buildbot_unmapped_count', 0);
  // keep store_id and secret_key so reconnect is quick, but stop all features
  update_option('buildbot_widget_enabled', true);
  wp_send_json_success(['disconnected' => true]);
}

// ─── NONCE IN FOOTER (kept for compatibility) ────────────
// Note: nonce is now defined inline in the admin page script

// ─── REAL-TIME HOOKS ──────────────────────────────────────
add_action('woocommerce_update_product', 'buildbot_hook_product_update');
add_action('woocommerce_new_product',    'buildbot_hook_product_update');
function buildbot_hook_product_update($product_id) {
  if (!get_option('buildbot_connected')) return;
  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');
  if (!$store_id || !$secret) return;

  $product = wc_get_product($product_id);
  if (!$product) return;

  $terms    = get_the_terms($product_id, 'product_cat');
  $woo_cats = [];
  if ($terms && !is_wp_error($terms)) {
    foreach ($terms as $t) $woo_cats[] = ['name' => $t->name];
  }

  $price = floatval($product->get_sale_price() ?: $product->get_regular_price() ?: $product->get_price());
  if ($price <= 0) return;

  $description = strip_tags($product->get_short_description() ?: wp_trim_words($product->get_description(), 25, ''));

  wp_remote_post(BUILDBOT_API . '/plugin/product/update', [
    'headers' => ['Content-Type' => 'application/json', 'X-BuildBot-Store-ID' => $store_id, 'X-BuildBot-Secret' => $secret],
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

add_action('wp_trash_post', 'buildbot_hook_product_delete');
function buildbot_hook_product_delete($post_id) {
  if (get_post_type($post_id) !== 'product') return;
  if (!get_option('buildbot_connected')) return;
  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');
  if (!$store_id || !$secret) return;
  // wc_get_product() can be null here depending on trash timing; fall back to post title.
  $product = wc_get_product($post_id);
  $product_name = $product ? $product->get_name() : get_the_title($post_id);
  if (!$product_name) $product_name = 'Deleted product';
  wp_remote_post(BUILDBOT_API . '/plugin/product/delete', [
    'headers'  => ['Content-Type' => 'application/json', 'X-BuildBot-Store-ID' => $store_id, 'X-BuildBot-Secret' => $secret],
    'body'     => json_encode(['productName' => $product_name, 'wooId' => $post_id]),
    'timeout'  => 10,
    'blocking' => false
  ]);
}

// ─── TIME AGO HELPER ──────────────────────────────────────
function buildbot_time_ago($datetime) {
  $diff = time() - strtotime($datetime);
  if ($diff < 60)    return $diff . 's ago';
  if ($diff < 3600)  return floor($diff/60) . 'm ago';
  if ($diff < 86400) return floor($diff/3600) . 'h ago';
  return floor($diff/86400) . 'd ago';
}

// ─── WIDGET ENABLE/DISABLE TOGGLE ────────────────────────
add_action('wp_ajax_buildbot_toggle_widget', 'buildbot_toggle_widget_ajax');
function buildbot_toggle_widget_ajax() {
  check_ajax_referer('buildbot_nonce', 'nonce');
  if (!current_user_can('manage_options')) wp_die('Unauthorized');

  $enabled = isset($_POST['enabled']) && $_POST['enabled'] === 'true';
  update_option('buildbot_widget_enabled', $enabled);

  // Also notify BuildBot server
  $store_id = get_option('buildbot_store_id');
  $secret   = get_option('buildbot_secret_key');

  if ($store_id && $secret) {
    wp_remote_post(BUILDBOT_API . '/plugin/widget-toggle', [
      'headers' => [
        'Content-Type'        => 'application/json',
        'X-BuildBot-Store-ID' => $store_id,
        'X-BuildBot-Secret'   => $secret
      ],
      'body'    => json_encode(['enabled' => $enabled]),
      'timeout' => 10
    ]);
  }

  wp_send_json_success(['enabled' => $enabled]);
}

// ─── AUTO INJECT WIDGET SCRIPT ────────────────────────────
add_action('wp_footer', 'buildbot_inject_widget');
function buildbot_inject_widget() {
  // Only inject if connected AND widget is enabled
  if (!get_option('buildbot_connected'))     return;
  if (!get_option('buildbot_widget_enabled', true)) return;

  $store_id = get_option('buildbot_store_id');
  if (!$store_id) return;

  // Never inject in admin
  if (is_admin()) return;

  $widget_url = 'https://buildbot-production.up.railway.app/widget.js';
  echo '<!-- BuildBot AI PC Recommender -->' . "
";
  echo '<script src="' . esc_url($widget_url) . '" data-store-id="' . esc_attr($store_id) . '"></script>' . "
";
}
