import { apiFetch } from "./api";
import type { StoreSession } from "./session";

// Typed wrappers for the store-owner auth endpoints (server/routes/auth.js),
// verified against the actual route handlers.
export const authApi = {
  signup: (email: string, password: string) =>
    apiFetch<{
      success: boolean;
      requiresVerification?: boolean;
      email?: string;
      message?: string;
      error?: string;
    }>("/signup", { method: "POST", body: { email, password } }),

  login: (email: string, password: string) =>
    apiFetch<{
      success: boolean;
      token?: string;
      store?: StoreSession;
      error?: string;
      requiresVerification?: boolean;
    }>("/login", { method: "POST", body: { email, password } }),

  googleAuth: (credential: string) =>
    apiFetch<{
      success: boolean;
      token?: string;
      store?: StoreSession;
      isNewAccount?: boolean;
      error?: string;
    }>("/google-auth", { method: "POST", body: { credential } }),

  verifyEmailOtp: (email: string, code: string) =>
    apiFetch<{ success: boolean; error?: string }>("/verify-email-otp", {
      method: "POST",
      body: { email, code },
    }),

  resendVerification: (email: string, password: string) =>
    apiFetch<{ success: boolean; message?: string; error?: string }>(
      "/resend-verification",
      { method: "POST", body: { email, password } },
    ),

  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message?: string; error?: string }>(
      "/forgot-password",
      { method: "POST", body: { email } },
    ),

  me: (token: string) =>
    apiFetch<{ success: boolean; requiresVerification?: boolean; error?: string }>(
      "/me",
      { token },
    ),
};
