<?php
/**
 * BuildVolt OSPOS export endpoint — THE RECOMMENDED, EASIEST SETUP.
 *
 * One-time setup, no technical OSPOS/database knowledge required:
 *
 *   1. Open this file and paste your BuildVolt secret key into
 *      $BUILDVOLT_KEY below (Dashboard -> Store & Sync -> Generate key).
 *   2. Upload this ONE file into the SAME folder as OSPOS's own
 *      index.php (usually a folder called "public" inside the OSPOS
 *      install — use FTP or your hosting's File Manager).
 *   3. Visit BuildVolt's dashboard -> Store & Sync -> "Connect OSPOS" and
 *      paste the URL to this file, e.g.
 *      https://your-client-site.com/buildvolt-export.php
 *
 * That's it. Nothing needs to be scheduled, installed, or run on this
 * server — BuildVolt's own server checks this URL automatically every
 * few hours from then on. You never need to touch cron, phpMyAdmin, or
 * create any database user.
 *
 * Why a file like this is needed at all: OSPOS has no built-in REST API
 * (there is no Api controller in its codebase, and a request for one,
 * github.com/opensourcepos/opensourcepos/issues/2463, has been open,
 * unresolved, since 2019), and it has no catalog export feature either
 * (Items.php only supports CSV *import*). This file reads OSPOS's own
 * already-configured database connection (from the .env file OSPOS
 * itself uses, sitting one folder above this one) rather than requiring
 * anyone to create a new database user or credentials by hand.
 *
 * Security: this file only ever runs SELECT queries — it cannot modify,
 * delete, or add anything in OSPOS. It also refuses every request that
 * doesn't include the exact key you set below, via ?key=... — anyone
 * without that key gets nothing back.
 *
 * (There is also a second, more manual setup path — a cron-based push
 * script instead of this pull-based file — in ospos-buildvolt-sync.php
 * in this same folder, for anyone who already has SSH/cron access and
 * would rather not expose an endpoint. Most people should just use this
 * file.)
 */

// ─── 1. Paste your BuildVolt secret key here ───────────────
$BUILDVOLT_KEY = "CHANGE_ME";

// ─── 2. Leave these blank unless auto-detection fails ──────
// (See the error message this file returns if it can't find your OSPOS
// database automatically — fill these in only then.)
$MANUAL_DB_HOST = "";
$MANUAL_DB_NAME = "";
$MANUAL_DB_USER = "";
$MANUAL_DB_PASS = "";

// ──────────────────────────────────────────────────────────
header("Content-Type: application/json");

if ($BUILDVOLT_KEY === "CHANGE_ME") {
    http_response_code(500);
    echo json_encode([
        "error" => "This file still has its placeholder key. Open buildvolt-export.php " .
                    "and paste your real BuildVolt secret key into \$BUILDVOLT_KEY at the top.",
    ]);
    exit;
}

if (!isset($_GET["key"]) || !hash_equals($BUILDVOLT_KEY, (string) $_GET["key"])) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid or missing key"]);
    exit;
}

/**
 * Reads database.default.hostname/database/username/password out of a
 * CodeIgniter 4 .env file (the format OSPOS's own install uses) without
 * needing to bootstrap the framework itself.
 */
function readEnvDbConfig(string $envPath): ?array {
    if (!is_readable($envPath)) return null;

    $values = [];
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === "" || $line[0] === "#" || $line[0] === ";") continue;
        if (strpos($line, "=") === false) continue;
        [$key, $value] = array_map("trim", explode("=", $line, 2));
        $values[$key] = trim($value, "\"' ");
    }

    $host = $values["database.default.hostname"] ?? null;
    $name = $values["database.default.database"] ?? null;
    $user = $values["database.default.username"] ?? null;
    $pass = $values["database.default.password"] ?? "";

    if ($host && $name && $user) {
        return ["host" => $host, "name" => $name, "user" => $user, "pass" => $pass];
    }
    return null;
}

// ─── Work out DB credentials ────────────────────────────────
$db = null;
if ($MANUAL_DB_HOST && $MANUAL_DB_NAME && $MANUAL_DB_USER) {
    $db = ["host" => $MANUAL_DB_HOST, "name" => $MANUAL_DB_NAME, "user" => $MANUAL_DB_USER, "pass" => $MANUAL_DB_PASS];
} else {
    // Standard OSPOS/CodeIgniter 4 layout: this file lives in the "public"
    // folder, and .env lives one level up, in the project root.
    $db = readEnvDbConfig(__DIR__ . "/../.env")
        ?? readEnvDbConfig(__DIR__ . "/.env"); // fallback if placed at project root instead
}

if (!$db) {
    http_response_code(500);
    echo json_encode([
        "error" => "Could not find OSPOS's database settings automatically. This usually " .
                    "means this file isn't in the right folder (it should sit next to " .
                    "OSPOS's own index.php, in the \"public\" folder), or the .env file " .
                    "one level up doesn't use the standard database.default.* keys. As a " .
                    "fallback, fill in MANUAL_DB_HOST / MANUAL_DB_NAME / MANUAL_DB_USER / " .
                    "MANUAL_DB_PASS near the top of this file — your host or whoever set " .
                    "up OSPOS can give you these.",
    ]);
    exit;
}

// ─── Query items (read-only — this file never writes to OSPOS) ─────
try {
    $pdo = new PDO(
        "mysql:host={$db['host']};dbname={$db['name']};charset=utf8",
        $db["user"],
        $db["pass"],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["error" => "Could not connect to the OSPOS database: " . $e->getMessage()]);
    exit;
}

// ospos_item_quantities holds one row per (item, stock location); stock is
// summed across every location. deleted = 0 excludes soft-deleted items.
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
    http_response_code(500);
    echo json_encode(["error" => "Could not read items: " . $e->getMessage()]);
    exit;
}

echo json_encode(["items" => $items]);
