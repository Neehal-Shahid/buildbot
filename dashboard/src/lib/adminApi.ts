import { apiFetch } from "./api";

// Typed wrappers for every /admin/* endpoint (server/routes/admin.js),
// verified against the actual route handlers so request/response shapes
// match exactly — this is the layer every admin page/component calls
// instead of hand-writing fetch() + Authorization headers per call site.

export interface AdminStore {
  store_id: string;
  name: string;
  email: string;
  plan_status: string;
  effectiveStatus: "active" | "disabled";
  product_count: number;
  rec_count: number;
  admin_notes?: string;
  drip_emails_paused?: number;
  created_at?: string;
  [key: string]: unknown;
}

export interface AdminInfo {
  name: string;
  email: string;
  recoveryEmail: string;
}

export interface SupportTicket {
  id: number | string;
  store_id?: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at?: string;
  [key: string]: unknown;
}

export interface EmailLog {
  id: number | string;
  store_id: string;
  email_type: string;
  recipient: string;
  subject?: string;
  sent_at?: string;
  [key: string]: unknown;
}

const adminAuth = (token: string) => ({ token });

export const adminApi = {
  login: (email: string, password: string) =>
    apiFetch<{ success: boolean; token: string }>("/admin/login", {
      method: "POST",
      body: { email, password },
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/forgot-password", {
      method: "POST",
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    apiFetch<{ success: boolean; message?: string; error?: string }>(
      "/admin/reset-password",
      { method: "POST", body: { token, password } },
    ),

  me: (token: string) =>
    apiFetch<{ success: boolean; admin: AdminInfo }>("/admin/me", adminAuth(token)),

  updateProfile: (token: string, name: string, email: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/profile", {
      method: "PUT",
      body: { name, email },
      ...adminAuth(token),
    }),

  updateRecoveryEmail: (token: string, recoveryEmail: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/recovery-email", {
      method: "PUT",
      body: { recoveryEmail },
      ...adminAuth(token),
    }),

  updatePassword: (token: string, currentPassword: string, newPassword: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/password", {
      method: "PUT",
      body: { currentPassword, newPassword },
      ...adminAuth(token),
    }),

  overview: (token: string) =>
    apiFetch<{ success: boolean; stores: AdminStore[]; totalRecs: number }>(
      "/admin/overview",
      adminAuth(token),
    ),

  stores: (token: string) =>
    apiFetch<{ success: boolean; stores: AdminStore[] }>(
      "/admin/stores",
      adminAuth(token),
    ),

  storeProducts: (token: string, storeId: string) =>
    apiFetch<{ success: boolean; products: unknown[] }>(
      `/admin/store-products/${storeId}`,
      adminAuth(token),
    ),

  disableStore: (token: string, storeId: string) =>
    apiFetch<{ success: boolean }>("/admin/disable-store", {
      method: "POST",
      body: { storeId },
      ...adminAuth(token),
    }),

  activateStore: (token: string, storeId: string) =>
    apiFetch<{ success: boolean }>("/admin/activate-store", {
      method: "POST",
      body: { storeId },
      ...adminAuth(token),
    }),

  deleteStore: (token: string, storeId: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/delete-store", {
      method: "POST",
      body: { storeId },
      ...adminAuth(token),
    }),

  saveNotes: (token: string, storeId: string, notes: string) =>
    apiFetch<{ success: boolean }>("/admin/save-notes", {
      method: "POST",
      body: { storeId, notes },
      ...adminAuth(token),
    }),

  setDripPaused: (token: string, storeId: string, paused: boolean) =>
    apiFetch<{ success: boolean; message: string }>("/admin/set-drip-paused", {
      method: "POST",
      body: { storeId, paused },
      ...adminAuth(token),
    }),

  dbAudit: (token: string) =>
    apiFetch<{
      success: boolean;
      counts: Record<string, number>;
      orphans: { products: number; recommendations: number; orphanProductsTop: unknown[] };
      tokens: { expired: number; used: number };
      notes: string[];
    }>("/admin/db-audit", adminAuth(token)),

  dbCleanup: (token: string, action: "tokens" | "orphans") =>
    apiFetch<{ success: boolean; message: string }>("/admin/db-cleanup", {
      method: "POST",
      body: { action },
      ...adminAuth(token),
    }),

  sendEmail: (token: string, storeId: string, subject: string, message: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/send-email", {
      method: "POST",
      body: { storeId, subject, message },
      ...adminAuth(token),
    }),

  broadcast: (token: string, subject: string, message: string) =>
    apiFetch<{ success: boolean; message: string }>("/admin/broadcast", {
      method: "POST",
      body: { subject, message },
      ...adminAuth(token),
    }),

  emailLog: (token: string, limit = 80) =>
    apiFetch<{ success: boolean; logs: EmailLog[] }>(
      `/admin/email-log?limit=${limit}`,
      adminAuth(token),
    ),

  supportTickets: (token: string) =>
    apiFetch<{ success: boolean; tickets: SupportTicket[] }>(
      "/admin/support-tickets",
      adminAuth(token),
    ),

  updateTicketStatus: (token: string, id: string | number, status: SupportTicket["status"]) =>
    apiFetch<{ success: boolean; message: string }>(
      `/admin/support-tickets/${id}/status`,
      { method: "POST", body: { status }, ...adminAuth(token) },
    ),

  runDrip: (token: string) =>
    apiFetch<{ success: boolean; results: unknown }>("/admin/run-drip", {
      method: "POST",
      ...adminAuth(token),
    }),

  platformConfig: (token: string) =>
    apiFetch<{ success: boolean; config: Record<string, unknown> }>(
      "/admin/platform-config",
      adminAuth(token),
    ),

  savePlatformConfig: (token: string, config: Record<string, unknown>) =>
    apiFetch<{ success: boolean; message: string }>("/admin/platform-config", {
      method: "POST",
      body: { config },
      ...adminAuth(token),
    }),
};
