<?php
/**
 * BuildVolt <-> OSPOS (Open Source Point of Sale) catalog connector.
 *
 * What this does:
 *   Reads items directly from your OSPOS MySQL database (read-only) and
 *   pushes them to your BuildVolt store's catalog, so the recommendation
 *   widget always reflects what's actually in OSPOS.
 *
 * Why it works this way:
 *   OSPOS has no built-in REST API (confirmed against the current
 *   opensourcepos/opensourcepos codebase — there is no Api controller, and
 *   a long-open feature request for one, #2463, remains unresolved). It
 *   also has no catalog *export* feature — Items.php only supports CSV
 *   *import*. Reading its MySQL database directly with a dedicated
 *   read-only user is the most reliable integration point available, and
 *   the schema this script queries (ospos_items, ospos_item_quantities)
 *   comes straight from OSPOS's own official install schema.
 *
 * This script only ever runs SELECT statements. It never writes to your
 * OSPOS database.
 *
 * Setup:
 *   1. Create a read-only MySQL user for this script (run once, in your
 *      OSPOS database):
 *
 *        CREATE USER 'buildvolt_readonly'@'localhost' IDENTIFIED BY 'CHOOSE_A_STRONG_PASSWORD';
 *        GRANT SELECT ON your_ospos_db.ospos_items ON *.* TO 'buildvolt_readonly'@'localhost';
 *        GRANT SELECT ON your_ospos_db.ospos_item_quantities TO 'buildvolt_readonly'@'localhost';
 *        FLUSH PRIVILEGES;
 *
 *      (Replace your_ospos_db with your actual OSPOS database name.)
 *
 *   2. Fill in the CONFIG block below: your OSPOS DB credentials, and your
 *      BuildVolt Store ID + connection key (Dashboard -> Store & Sync ->
 *      "Generate key").
 *
 *   3. Test it once by hand:  php ospos-buildvolt-sync.php
 *
 *   4. Schedule it with cron to keep running automatically, e.g. every
 *      6 hours (matching the WooCommerce plugin's own sync interval):
 *
 *        0 */6 * * * php /full/path/to/ospos-buildvolt-sync.php >> /full/path/to/ospos-sync.log 2>&1
 */

// ─── CONFIG — fill these in ────────────────────────────────
$OSPOS_DB_HOST = "localhost";
$OSPOS_DB_NAME = "opensourcepos";        // your OSPOS database name
$OSPOS_DB_USER = "buildvolt_readonly";   // the read-only user created above
$OSPOS_DB_PASS = "CHANGE_ME";

$BUILDVOLT_API       = "https://buildbot-production-3f70.up.railway.app";
$BUILDVOLT_STORE_ID  = "CHANGE_ME"; // Dashboard -> Store & Sync
$BUILDVOLT_SECRET    = "CHANGE_ME"; // Dashboard -> Store & Sync -> Generate key

// ────────────────────────────────────────────────────────────

function fail(string $message): void {
    fwrite(STDERR, "[" . date("c") . "] ERROR: $message\n");
    exit(1);
}

// ─── 1. Read items + stock from OSPOS (read-only) ──────────
try {
    $pdo = new PDO(
        "mysql:host=$OSPOS_DB_HOST;dbname=$OSPOS_DB_NAME;charset=utf8",
        $OSPOS_DB_USER,
        $OSPOS_DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
} catch (PDOException $e) {
    fail("Could not connect to the OSPOS database: " . $e->getMessage());
}

// ospos_item_quantities holds one row per (item, stock location); an item
// can exist at several locations, so stock is summed across all of them.
// deleted = 0 excludes items OSPOS has soft-deleted.
$sql = "
    SELECT
        i.item_id, i.name, i.category, i.description, i.item_number,
        i.unit_price, i.cost_price,
        i.custom1, i.custom2, i.custom3, i.custom4, i.custom5,
        i.custom6, i.custom7, i.custom8, i.custom9, i.custom10,
        COALESCE(SUM(q.quantity), 0) AS quantity
    FROM ospos_items i
    LEFT JOIN ospos_item_quantities q ON q.item_id = i.item_id
    WHERE i.deleted = 0
    GROUP BY i.item_id
";

try {
    $items = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    fail("Could not read items from OSPOS: " . $e->getMessage());
}

if (count($items) === 0) {
    fail("No active items found in OSPOS — check OSPOS_DB_NAME and that ospos_items has data.");
}

// ─── 2. Push the catalog to BuildVolt ───────────────────────
$payload = json_encode(["items" => $items]);
if ($payload === false) {
    fail("Failed to encode items as JSON: " . json_last_error_msg());
}

$ch = curl_init(rtrim($BUILDVOLT_API, "/") . "/api/ospos/sync");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "X-BuildVolt-Store-ID: $BUILDVOLT_STORE_ID",
        "X-BuildVolt-Secret: $BUILDVOLT_SECRET",
    ],
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    fail("Could not reach BuildVolt: $curlError");
}

if ($httpCode !== 200) {
    fail("BuildVolt rejected the sync (HTTP $httpCode): $response");
}

echo "[" . date("c") . "] Synced " . count($items) . " OSPOS items to BuildVolt. Response: $response\n";
