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

export interface OrderRequest {
  id: number | string;
  parts?: unknown;
  total?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface SupportTicket {
  id: number | string;
  subject: string;
  message: string;
  status: string;
  created_at?: string;
  [key: string]: unknown;
}

export interface AnalyticsStats {
  total: { count: number };
  byPurpose: { purpose: string; count: number }[];
  avgBudget: { avg: number | null };
  recent: { budget: number; purpose: string; extras?: string; created_at: string }[];
  daily: { day: string; count: number }[];
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

  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message?: string; error?: string }>(
      "/forgot-password",
      { method: "POST", body: { email } },
    ),

  support: {
    submit: (token: string, subject: string, message: string) =>
      apiFetch<{ success: boolean; ticketId: number; message: string }>("/support", {
        method: "POST",
        body: { subject, message },
        ...auth(token),
      }),
    list: (token: string) =>
      apiFetch<{ success: boolean; tickets: SupportTicket[] }>("/support", auth(token)),
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
    remove: (token: string, id: number) =>
      apiFetch<{ success: boolean; message: string }>(`/product/${id}`, {
        method: "DELETE",
        ...auth(token),
      }),
    upload: (token: string, file: File) => {
      const formData = new FormData();
      formData.append("catalog", file);
      return apiFetch<{
        success: boolean;
        message: string;
        skippedCount: number;
        skippedItems: { name: string; rawCategory: string }[];
        preview: unknown[];
        error?: string;
      }>("/upload", { method: "POST", formData, token });
    },
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
