# BuildVolt <-> OSPOS connector

Syncs a store's product catalog from [Open Source Point of Sale](https://github.com/opensourcepos/opensourcepos) (OSPOS) into BuildVolt, so the recommendation widget always reflects what's actually in stock in OSPOS — the same idea as the WooCommerce plugin, but for stores that manage inventory in OSPOS instead of (or alongside) a WordPress storefront.

## Why this exists at all

OSPOS doesn't have a plugin system the way WordPress does, and — this matters — **it has no built-in REST API**. There's no `Api` controller in its codebase, and a request for one ([issue #2463](https://github.com/opensourcepos/opensourcepos/issues/2463)) has been open, unresolved, since 2019. It also has no catalog *export* feature (`Items.php` only supports CSV *import*, for bringing data in). So getting data out means either reading OSPOS's own MySQL database directly, or turning a small script into the API OSPOS itself doesn't have.

## Two ways to set this up

### Option 1 — Upload one file (recommended for almost everyone)

**`buildvolt-export.php`** is a single, self-contained file. Upload it once to the store's own server, paste its URL into the BuildVolt dashboard, and you're done — BuildVolt's own server checks it automatically every few hours from then on. No cron, no database user to create, no server access beyond a file upload.

1. In the BuildVolt dashboard, go to **Store & Sync → OSPOS**, download `buildvolt-export.php`, and open it to paste in the store's connection key (or download it directly at `/buildvolt-export.php` on the API).
2. Upload that one file to the store's server, into the **same folder as OSPOS's own `index.php`** (usually a folder called `public`) — via FTP or the hosting's File Manager. No terminal/SSH access needed.
3. Back in the dashboard, paste the file's URL (e.g. `https://client-site.com/buildvolt-export.php`) and click **Save & connect**.

That's it. The file reads OSPOS's *own* already-configured database connection (from the `.env` file OSPOS itself uses, one folder up) — nobody needs to create a new database user or know any credentials, in the common case. If auto-detection fails (a non-standard install), the file has a small manual-override config block with clear instructions in its own comments.

### Option 2 — Cron + push script (for setups with SSH/cron access, if you'd rather not expose an endpoint)

**`ospos-buildvolt-sync.php`** does the same job in the other direction: it runs *on* the client's server on a schedule (cron) and *pushes* the catalog to BuildVolt, using a dedicated read-only MySQL user instead of a web-facing file. Use this if the client's hosting has SSH/cron access and there's a preference for not exposing any new URL publicly.

1. Create a read-only MySQL user (run once, against the OSPOS database):
   ```sql
   CREATE USER 'buildvolt_readonly'@'localhost' IDENTIFIED BY 'CHOOSE_A_STRONG_PASSWORD';
   GRANT SELECT ON your_ospos_db.ospos_items TO 'buildvolt_readonly'@'localhost';
   GRANT SELECT ON your_ospos_db.ospos_item_quantities TO 'buildvolt_readonly'@'localhost';
   FLUSH PRIVILEGES;
   ```
2. Edit the config block at the top of `ospos-buildvolt-sync.php` (DB credentials + BuildVolt Store ID/key).
3. Test by hand: `php ospos-buildvolt-sync.php`
4. Schedule it: `0 */6 * * * php /full/path/to/ospos-buildvolt-sync.php >> /full/path/to/ospos-sync.log 2>&1`

Both options end up calling the exact same sync logic on BuildVolt's side (`server/routes/ospos.js`), so results are identical either way — pick whichever is easier to set up for a given client's hosting.

## What actually happens on each sync

1. Reads every non-deleted row in `ospos_items`, summing stock quantity across all locations from `ospos_item_quantities`.
2. Builds a description for each item by combining OSPOS's `description`, `item_number`, and any of the ten generic `custom1`–`custom10` fields — see "About the description" below for why.
3. Sends the list to BuildVolt, matched against BuildVolt's fixed hardware categories; anything with no price or no recognisable category is skipped rather than stored.
4. Replaces that store's product list with the new one — same full-replace behaviour as a WooCommerce sync.

## About the description (and why it matters here)

BuildVolt's recommendation engine reads each product's category *and description* to work out basic compatibility (socket type, RAM generation, wattage, and so on) — the more descriptive text it has, the better that inference is. OSPOS's own `description` column is short (255 characters) and, in most real installs, is left blank or holds a brief SKU note rather than a real spec sheet.

To make up for that, both connector options pull in OSPOS's ten generic `custom1`–`custom10` fields as well, and fold every one that's filled in into the description sent to BuildVolt. Many POS setups already use these custom fields for exactly this kind of extra spec data (brand, socket, wattage, capacity), so if a client's OSPOS items have anything filled in there, it now gets used automatically — no extra work required on the BuildVolt side.

**The honest limit:** if an item's OSPOS entry has nothing in `description` or any `custom` field beyond a bare product name, the connector can't invent spec details that were never entered. Compatibility inference for that item will be only as good as its name (e.g. "RTX 3060" is still enough to detect it's a GPU; "Graphics Card A2" is not enough to infer anything about its power draw). The fix is on the OSPOS data-entry side — if compatibility results look thin for a particular store, check whether its OSPOS items have any custom fields filled in at all, and filling in even one or two (e.g. socket type for CPUs/motherboards, wattage for PSUs) will visibly improve results.

## What this does *not* do

- It does not push anything back into OSPOS — sales, stock adjustments, etc. made through BuildVolt's WhatsApp/order-request flow are not written back to OSPOS. A store using OSPOS would still record the actual sale in OSPOS themselves, same as they would for a walk-in customer.
- Option 1 does not require any inbound network access beyond a normal web request to the uploaded file — nothing about OSPOS's database is ever exposed directly. Option 2 does not require the client's server to accept any inbound connections at all — only outbound calls to BuildVolt's API.
