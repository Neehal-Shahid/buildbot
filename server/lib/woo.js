function normalizeWooUrl(url) {
  if (!url) return "";
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const hostname = new URL(withProto).hostname.toLowerCase();
    return hostname.replace(/^www\./, "");
  } catch {
    return String(url)
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .replace(/\/.*$/, "")
      .toLowerCase();
  }
}

module.exports = { normalizeWooUrl };
