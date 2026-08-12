import { API_BASE } from "./config";
import { loaderDec, loaderInc } from "./loader";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  /** Pass a FormData body as-is (skips JSON.stringify + Content-Type header). */
  formData?: FormData;
}

// Fired when an *authenticated* request (one that sent a bearer token) gets
// a 401 back — i.e. the session itself is dead (expired/revoked token), not
// a login-form rejecting bad credentials (those calls never pass `token`).
// StoreAuthContext/AdminAuthContext each listen for this and compare
// event.detail.token against their own current token before clearing their
// own session — a store session 401ing must not touch an unrelated admin
// session that happens to be active in the same browser, and vice versa.
export const AUTH_EXPIRED_EVENT = "bb:auth-expired";

// Central fetch wrapper for every /api call in the app. Replaces the
// original vanilla code's per-call-site `fetch` + manual `Authorization`
// header + ad-hoc error handling with one place that (a) always sends the
// same headers the same way and (b) checks the real HTTP status for auth
// failures instead of string-matching the error message text (the old
// admin.html's handleAdminAuthError() matched on "token"/"unauthorized"/
// "invalid" substrings, which silently breaks if a backend error message
// ever changes wording).
export async function apiFetch<T = unknown>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  let body: BodyInit | undefined;
  if (opts.formData) {
    body = opts.formData;
  } else if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }

  loaderInc();
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body,
    });

    const isJson = res.headers
      .get("content-type")
      ?.includes("application/json");
    const data = isJson ? await res.json().catch(() => ({})) : {};

    if (!res.ok) {
      const message =
        (data as { error?: string })?.error ||
        res.statusText ||
        "Request failed";
      if (res.status === 401 && opts.token) {
        window.dispatchEvent(
          new CustomEvent(AUTH_EXPIRED_EVENT, { detail: { token: opts.token } }),
        );
      }
      throw new ApiError(message, res.status);
    }

    return data as T;
  } finally {
    loaderDec();
  }
}

export function isAuthError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
