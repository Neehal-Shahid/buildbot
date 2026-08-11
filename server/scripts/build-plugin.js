/**
 * Build server/buildvolt-woocommerce.zip from plugin source.
 * Version is read from server/plugin-update.json (single source of truth).
 *
 * Run: npm run build:plugin   (from server/)
 * Runs automatically before npm start on Railway deploy.
 */
const fs = require("fs");
const path = require("path");
const archiver = require("archiver");

const repoRoot = path.join(__dirname, "..", "..");
const manifestPath = path.join(repoRoot, "server", "plugin-update.json");
const pluginPhp = path.join(
  repoRoot,
  "plugin",
  "buildvolt-woocommerce",
  "buildvolt-woocommerce.php",
);
const pluginDir = path.join(repoRoot, "plugin", "buildvolt-woocommerce");
const zipPath = path.join(repoRoot, "server", "buildvolt-woocommerce.zip");

function syncPhpVersion(version) {
  let php = fs.readFileSync(pluginPhp, "utf8");
  php = php.replace(/\* Version:\s+[0-9.]+/, `* Version:     ${version}`);
  php = php.replace(
    /define\('BUILDVOLT_VERSION', '[0-9.]+'\)/,
    `define('BUILDVOLT_VERSION', '${version}')`,
  );
  fs.writeFileSync(pluginPhp, php);
}

function buildZip() {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);

    // WordPress expects: buildvolt-woocommerce/buildvolt-woocommerce.php
    archive.directory(pluginDir, path.basename(pluginDir));
    archive.finalize();
  });
}

async function main() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Missing manifest: ${manifestPath}`);
  }
  if (!fs.existsSync(pluginPhp)) {
    throw new Error(`Missing plugin source: ${pluginPhp}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const version = manifest.version;
  if (!version) {
    throw new Error("plugin-update.json is missing a version field");
  }

  syncPhpVersion(version);
  await buildZip();

  console.log(`Built BuildVolt plugin v${version} -> ${zipPath}`);
}

main().catch((err) => {
  console.error("Plugin build failed:", err.message);
  process.exit(1);
});
