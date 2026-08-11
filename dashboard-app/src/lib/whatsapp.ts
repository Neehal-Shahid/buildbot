// Tries the WhatsApp Desktop app first (whatsapp:// deep link), and falls
// back to opening web.whatsapp.com in a new tab if nothing seems to have
// happened after a beat. Detecting whether the desktop app actually opened
// isn't reliable across all browsers/OSes (a well-known limitation of
// custom-protocol links) — worst case if detection guesses wrong, both the
// desktop app and a redundant web tab end up open, which is harmless, just
// slightly untidy. Ported as-is from dashboard.html's openWhatsAppSmart().
export function openWhatsAppSmart(waLink: string) {
  let desktopLink: string | null = null;
  try {
    const url = new URL(waLink);
    const phone = url.searchParams.get("phone");
    const text = url.searchParams.get("text") || "";
    if (phone) desktopLink = `whatsapp://send?phone=${phone}&text=${text}`;
  } catch {
    // not a valid URL — fall through to the web link below
  }

  if (!desktopLink) {
    window.open(waLink, "_blank", "noopener");
    return;
  }

  let sawHide = false;
  const onHide = () => {
    if (document.hidden) sawHide = true;
  };
  document.addEventListener("visibilitychange", onHide);

  window.location.href = desktopLink;

  setTimeout(() => {
    document.removeEventListener("visibilitychange", onHide);
    if (!sawHide) {
      window.open(waLink, "_blank", "noopener");
    }
  }, 900);
}
