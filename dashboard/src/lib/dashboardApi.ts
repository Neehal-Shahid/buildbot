import { apiFetch } from "./api";
import type { StoreSession } from "./session";

// Typed wrappers for every store-owner endpoint used by the dashboard,
// verified against server/routes/auth.js, upload.js, analytics.js and
// plugin.js so request/response shapes match exactly.

export interface Product {
  id: number;
  store_id: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  in_stock: number;
  [key: string]: unknown;
}

/** One line item inside an order request's `parts` array — built by
 *  partEntry() in server/routes/recommend.js. */
export interface OrderPart {
  category: string;
  name: string;
  price: number;
  quantity: number;
  totalPrice: number;
  reason?: string;
  wooId?: number | null;
}

// Mirrors the order_requests table (server/database.js). Note the money
// column is `total_price`, NOT `total`, and orderRequestDB.getByStore()
// JSON.parses `parts` before sending, so it arrives as a real array.
export interface OrderRequest {
  id: number | string;
  build_name?: string;
  tier?: string;
  parts?: OrderPart[];
  total_price?: number;
  currency?: string;
  order_method?: string;
  created_at?: string;
  [key: string]: unknown;
}

// Defaults the server falls back to when a store has never saved widget
// copy (widgetDB.getSettings in server/database.js). Kept in sync here so
// the settings form never posts an empty string — PUT /widget-settings
// rejects blank title/welcome/button with "All fields are required".
export const WIDGET_DEFAULTS = {
  widgetTitle: "BuildVolt",
  welcomeMsg:
    "Tell me your budget and what you need — I will find the best parts from this store for you.",
  buttonText: "Get Started",
  widgetBg: "#1a1d27",
} as const;

export interface SupportTicketReply {
  id: number | string;
  sender: "store" | "admin";
  message: string;
  created_at?: string;
}

export interface SupportTicket {
  id: number | string;
  subject: string;
  message: string;
  status: string;
  created_at?: string;
  replies?: SupportTicketReply[];
  [key: string]: unknown;
}

export interface AnalyticsStats {
  total: { count: number };
  byPurpose: { purpose: string; count: number }[];
  avgBudget: { avg: number | null };
  recent: { budget: number; purpose: string; extras?: string; created_at: string }[];
  daily: { day: string; count: number }[];
}

// stats.daily is grouped by SQLite `date(created_at)`, which is UTC, so
// today's bucket has to be looked up with a UTC key. Derived from `daily`
// rather than by filtering `recent`, because `recent` is capped at 10 rows
// server-side — any store doing more than 10 builds a day would have seen
// its "today" figure silently stick at 10.
export function todayCount(stats: AnalyticsStats | null): number {
  if (!stats) return 0;
  const todayKey = new Date().toISOString().slice(0, 10);
  return stats.daily.find((d) => d.day === todayKey)?.count ?? 0;
}

const auth = (token: string) => ({ token });

export const dashboardApi = {
  me: (token: string) =>
    apiFetch<{ success: boolean; store: StoreSession }>("/me", auth(token)),

  storeSetup: (token: string, name: string) =>
    apiFetch<{ success: boolean; token: string; storeId: string; name: string; error?: string }>(
      "/store-setup",
      { method: "PUT", body: { name }, ...auth(token) },
    ),

  emailPreferences: (token: string, marketingEmailsEnabled: boolean) =>
    apiFetch<{ success: boolean; message: string }>("/email-preferences", {
      method: "PUT",
      body: { marketingEmailsEnabled },
      ...auth(token),
    }),

  changePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string; error?: string }>(
      "/change-password",
      { method: "PUT", body: { currentPassword, newPassword }, ...auth(token) },
    ),

  deleteAccount: (token: string) =>
    apiFetch<{ success: boolean; message: string }>("/account", {
      method: "DELETE",
      ...auth(token),
    }),

  support: {
    submit: (token: string, subject: string, message: string) =>
      apiFetch<{ success: boolean; ticketId: number; message: string }>("/support", {
        method: "POST",
        body: { subject, message },
        ...auth(token),
      }),
    list: (token: string) =>
      apiFetch<{ success: boolean; tickets: SupportTicket[] }>("/support", auth(token)),
    reply: (token: string, ticketId: number | string, message: string) =>
      apiFetch<{ success: boolean; message: string; error?: string }>(`/support/${ticketId}/reply`, {
        method: "POST",
        body: { message },
        ...auth(token),
      }),
  },

  orderRequests: (token: string) =>
    apiFetch<{ success: boolean; orders: OrderRequest[] }>("/order-requests", auth(token)),

  // Note: the server returns productCount as the raw DB row `{ count }`,
  // not a plain number — see productDB.getCount() in server/database.js.
  analytics: (token: string, days: number) =>
    apiFetch<{ success: boolean; stats: AnalyticsStats; productCount: { count: number }; days: number }>(
      `/analytics?days=${days}`,
      auth(token),
    ),

  whatsapp: {
    save: (token: string, whatsappNumber: string) =>
      apiFetch<{ success: boolean; message: string; error?: string }>(
        "/settings/whatsapp",
        { method: "PUT", body: { whatsappNumber }, ...auth(token) },
      ),
  },

  settings: {
    saveBranding: (token: string, brandColor: string, currency: string) =>
      apiFetch<{ success: boolean; message: string }>("/settings", {
        method: "PUT",
        body: { brandColor, currency },
        ...auth(token),
      }),
    saveWidgetText: (
      token: string,
      widgetTitle: string,
      welcomeMsg: string,
      buttonText: string,
      widgetBg?: string,
    ) =>
      apiFetch<{ success: boolean; message: string; error?: string }>(
        "/widget-settings",
        {
          method: "PUT",
          body: { widgetTitle, welcomeMsg, buttonText, widgetBg },
          ...auth(token),
        },
      ),
    toggleWidget: (token: string, enabled: boolean) =>
      apiFetch<{ success: boolean; widgetEnabled: boolean; message: string; error?: string }>(
        "/widget-toggle",
        { method: "POST", body: { enabled }, ...auth(token) },
      ),
  },

  products: {
    list: (token: string, storeId: string) =>
      apiFetch<{ success: boolean; products: Product[] }>(
        `/products/manage/${storeId}`,
        auth(token),
      ),
    create: (token: string, data: { name: string; category: string; price: number; description?: string }) =>
      apiFetch<{ success: boolean; message: string; error?: string }>("/product", {
        method: "POST",
        body: data,
        ...auth(token),
      }),
    update: (token: string, id: number, data: { name: string; category: string; price: number; description?: string }) =>
      apiFetch<{ success: boolean; message: string; error?: string }>(`/product/${id}`, {
        method: "PUT",
        body: data,
        ...auth(token),
      }),
    setStock: (token: string, id: number, inStock: boolean) =>
      apiFetch<{ success: boolean }>(`/product/${id}/stock`, {
        method: "PUT",
        body: { inStock },
        ...auth(token),
      }),
    // Powers "delete selected" and "delete entire list" alike — the caller
    // just passes every id it wants gone. The response's `deleted` array
    // (full rows, not just ids) is what restoreProducts() below needs to
    // undo this exact delete.
    removeBulk: (token: string, ids: number[]) =>
      apiFetch<{ success: boolean; message: string; deleted: Product[] }>("/products/bulk", {
        method: "DELETE",
        body: { ids },
        ...auth(token),
      }),
    // Undo for removeBulk (or a single remove()) — pass back the exact
    // rows it returned as `deleted` to recreate them. New ids are
    // assigned; nothing else references a product by id so that's
    // invisible to the store owner.
    restore: (token: string, products: Product[]) =>
      apiFetch<{ success: boolean; message: string }>("/products/restore", {
        method: "POST",
        body: { products },
        ...auth(token),
      }),
    // mode: "replace" (default) wipes the entire catalog first, no matter
    // which method(s) put products there before — "append" adds on top of
    // whatever already exists. ProductsTab asks the store owner which one
    // they want whenever a second method is used after the first already
    // has data (see the confirm dialog in ProductsTab.tsx).
    upload: (token: string, file: File, mode: "replace" | "append" = "replace") => {
      const formData = new FormData();
      formData.append("catalog", file);
      formData.append("mode", mode);
      return apiFetch<{
        success: boolean;
        message: string;
        skippedCount: number;
        skippedItems: { name: string; rawCategory: string }[];
        preview: unknown[];
        error?: string;
      }>("/upload", { method: "POST", formData, token });
    },
    // One-click OSPOS import (server/routes/ospos.js) — connects directly
    // to the store's OSPOS MySQL database with the credentials given here,
    // imports, and disconnects, all in this one request. On success the
    // (encrypted) credentials are saved server-side so BuildVolt can keep
    // pulling automatically afterwards — see osposAutoSyncStatus below.
    // Later automatic pulls only ever refresh OSPOS's own rows regardless
    // of the mode used here (see server/routes/ospos.js "auto" mode).
    importFromOspos: (
      token: string,
      creds: { host: string; port?: string; database: string; username: string; password?: string },
      mode: "replace" | "append" = "replace",
    ) =>
      apiFetch<{
        success: boolean;
        message?: string;
        error?: string;
        autoSyncEnabled?: boolean;
        synced?: number;
        skipped?: number;
        skippedCategory?: number;
      }>("/ospos/import", { method: "POST", body: { ...creds, mode }, ...auth(token) }),
    osposAutoSyncStatus: (token: string) =>
      apiFetch<{
        success: boolean;
        enabled: boolean;
        lastSync: string | null;
        productCount: number;
        host: string;
      }>("/ospos/auto-sync-status", auth(token)),
    disableOsposAutoSync: (token: string) =>
      apiFetch<{ success: boolean; message: string }>("/ospos/auto-sync-disable", {
        method: "POST",
        ...auth(token),
      }),
  },

  plugin: {
    status: (token: string) =>
      apiFetch<{
        success: boolean;
        hasKey: boolean;
        secret: string | null;
        maskedSecret: string | null;
        wooConnected: boolean;
        wooUrl: string;
        lastSync: string | null;
        productCount: number;
        widgetEnabled: boolean;
      }>("/plugin/status", auth(token)),
    generateKey: (token: string) =>
      apiFetch<{ success: boolean; secret?: string; error?: string; wooConnected?: boolean }>(
        "/plugin/generate-key",
        { method: "POST", ...auth(token) },
      ),
    disconnect: (token: string) =>
      apiFetch<{ success: boolean; message: string }>("/plugin/disconnect", {
        method: "POST",
        ...auth(token),
      }),
  },
};
