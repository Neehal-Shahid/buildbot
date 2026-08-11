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
