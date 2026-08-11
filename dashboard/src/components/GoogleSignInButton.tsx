import { useEffect, useRef } from "react";

const CLIENT_ID =
  "343388814382-ksp0ou4kgv5kalo75vo467f9dhpbef1t.apps.googleusercontent.com";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
        };
      };
    };
  }
}

// Renders the real Google Identity Services sign-in button, replacing the
// original HTML data-attribute auto-init (`id="g_id_onload"` + `.g_id_signin`
// div) with an explicit React-driven init — same client ID, same popup
// flow, same callback contract (a `credential` JWT handed to
// /api/google-auth), just initialized imperatively instead of by the GSI
// script scanning the DOM for magic attributes on load.
export function GoogleSignInButton({
  context,
  onCredential,
}: {
  context: "signup" | "signin";
  onCredential: (credential: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    function render() {
      if (cancelled || !ref.current || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response) => onCredential(response.credential),
        use_fedcm_for_prompt: true,
      });
      ref.current.innerHTML = "";
      window.google.accounts.id.renderButton(ref.current, {
        type: "standard",
        shape: "rectangular",
        theme: "outline",
        text: context === "signup" ? "signup_with" : "signin_with",
        size: "large",
        logo_alignment: "left",
        width: 368,
      });
    }

    if (window.google) {
      render();
    } else {
      const interval = setInterval(() => {
        if (window.google) {
          clearInterval(interval);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context]);

  return <div ref={ref} className="g_id_signin" />;
}
