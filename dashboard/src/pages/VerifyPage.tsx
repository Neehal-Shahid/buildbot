import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { BrandLogo } from "../components/BrandLogo";

type Status = "loading" | "success" | "error";

interface CardState {
  status: Status;
  title: string;
  message: string;
  btnText?: string;
  btnHref?: string;
}

const initial: CardState = {
  status: "loading",
  title: "Verifying your email…",
  message: "Please wait a moment while we confirm your email address.",
};

const iconClass: Record<Status, string> = {
  loading: "bg-accent-light text-accent",
  success: "bg-success-bg text-success",
  error: "bg-danger-bg text-danger",
};

function StatusIcon({ status }: { status: Status }) {
  if (status === "success") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
      <line x1="2" y1="12" x2="6" y2="12" />
      <line x1="18" y1="12" x2="22" y2="12" />
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
    </svg>
  );
}

export default function VerifyPage() {
  const [card, setCard] = useState<CardState>(initial);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");

    if (!token) {
      setCard({
        status: "error",
        title: "Invalid link",
        message:
          "This verification link is missing a token. Please use the link from your email.",
        btnText: "Go to sign in",
        btnHref: "/?dashboard=1",
      });
      return;
    }

    apiFetch<{ success?: boolean; error?: string }>(
      `/verify-email?token=${token}`,
    )
      .then((data) => {
        if (data.success) {
          setCard({
            status: "success",
            title: "Email verified",
            message:
              "Your email address has been confirmed. You can now sign in to your dashboard.",
            btnText: "Sign in now",
            btnHref: "/?dashboard=1",
          });
        } else {
          setCard({
            status: "error",
            title: "Link expired",
            message:
              data.error ||
              "This verification link has expired. Please sign up again to get a new one.",
            btnText: "Go to sign in",
            btnHref: "/?dashboard=1",
          });
        }
      })
      .catch(() => {
        setCard({
          status: "error",
          title: "Connection error",
          message:
            "Could not connect to the server. Please check your connection and try again.",
          btnText: "Try again",
          btnHref: window.location.href,
        });
      });
  }, []);

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="/"
        className="fixed top-5 left-6 z-10 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted no-underline hover:text-text"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px]">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to home
      </a>

      <div className="mx-auto flex min-h-dvh max-w-[440px] items-center justify-center px-5 py-6">
        <div className="w-full rounded-2xl border border-border bg-surface p-9 pb-8 shadow-sm">
          <div className="mb-[22px]">
            <BrandLogo />
          </div>

          <div
            className={`mb-[18px] flex h-14 w-14 items-center justify-center rounded-[14px] ${iconClass[card.status]}`}
          >
            <span className="h-[26px] w-[26px]">
              <StatusIcon status={card.status} />
            </span>
          </div>

          <h2 className="mb-1 text-[22px] font-bold leading-tight tracking-tight text-text">
            {card.title}
          </h2>
          <p className="mb-6 text-[13px] leading-relaxed text-muted">
            {card.message}
          </p>

          {card.btnText && card.btnHref && (
            <>
              <a
                href={card.btnHref}
                className="flex w-full items-center justify-center rounded-[9px] bg-accent px-5 py-3 text-sm font-semibold text-white no-underline transition-colors hover:bg-accent-hover"
              >
                {card.btnText}
              </a>
              <div className="mt-[18px] text-center text-[13px] text-muted">
                <a href="/" className="font-semibold text-accent no-underline hover:underline">
                  Back to home
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
