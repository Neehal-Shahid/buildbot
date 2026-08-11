import { useEffect } from "react";

// The original project was 3 separate static HTML documents (landing/auth,
// dashboard, admin), each with its own <style> block — including its own
// `:root` custom-property overrides and bare class names like `.badge`,
// `.modal`, `.pwd-toggle`, `.divider` that mean different things on each
// page. A normal `import "./x.css"` gets bundled into one permanent global
// stylesheet for the whole SPA, so those bare/`:root` rules would collide
// across pages once more than one of these CSS files is ported.
//
// This hook keeps them isolated the same way the original setup was:
// inject the page's CSS into <head> only while that page is mounted, and
// remove it on unmount, so only one page's stylesheet is ever active in
// the document at once — no build-time class-renaming or CSS rewriting
// needed, the CSS stays byte-identical to the original.
export function useInjectedCss(cssText: string) {
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = cssText;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [cssText]);
}
