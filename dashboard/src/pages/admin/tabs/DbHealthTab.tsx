import { useState } from "react";
import { adminApi } from "../../../lib/adminApi";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { useToast } from "../../../components/ui/ToastProvider";
import { ApiError } from "../../../lib/api";

type AuditResult = Awaited<ReturnType<typeof adminApi.dbAudit>>;

export default function DbHealthTab() {
  const { token } = useAdminAuth();
  const toast = useToast();
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [cleanupAlert, setCleanupAlert] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  async function runAudit() {
    if (!token) return;
    try {
      const data = await adminApi.dbAudit(token);
      setAudit(data);
    } catch (err) {
      toast.error("Error", err instanceof ApiError ? err.message : "Could not run DB audit.");
    }
  }

  async function cleanup(action: "tokens" | "orphans") {
    if (!token) return;
    try {
      const data = await adminApi.dbCleanup(token, action);
      setCleanupAlert({ msg: data.message, type: "success" });
      if (audit) runAudit();
    } catch (err) {
      setCleanupAlert({ msg: err instanceof ApiError ? err.message : "Cleanup failed.", type: "error" });
    }
  }

  return (
    <div>
      <div className="section-title">Database Health</div>
      <div className="section-sub">Integrity audit for Turso tables — orphaned rows, expired tokens, table totals.</div>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Integrity Audit</h2>
            <div className="card-sub">{audit ? "Report generated" : 'Click "Run audit" to generate report'}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={runAudit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Run Audit
          </button>
        </div>
        <div className="audit-out">
          {!audit && 'Click "Run Audit" to generate a report.'}
          {audit && (
            <div>
              {Object.entries(audit.counts).map(([table, count]) => (
                <div key={table}>
                  {table}: {count}
                </div>
              ))}
              <div>Orphan products: {audit.orphans.products}</div>
              <div>Orphan recommendations: {audit.orphans.recommendations}</div>
              <div>Expired tokens: {audit.tokens.expired}</div>
              <div>Used tokens: {audit.tokens.used}</div>
              {audit.notes.map((n, i) => (
                <div key={i}>— {n}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-head">
          <div>
            <h2>Cleanup Actions</h2>
            <div className="card-sub">Safe operations — no customer or store data is removed</div>
          </div>
        </div>
        <div style={{ padding: "12px 14px", background: "var(--accent-light)", border: "1px solid var(--accent-border)", borderRadius: "var(--r-md)", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "var(--accent-text, var(--accent))", lineHeight: 1.6 }}>
            These operations are safe. Expired tokens and orphaned records are never needed by the application and
            can be removed at any time without affecting stores or customers.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={() => cleanup("tokens")} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
            Clean Expired Tokens
          </button>
          <button className="btn btn-sm" onClick={() => cleanup("orphans")} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Remove Orphaned Records
          </button>
        </div>
        {cleanupAlert && <div className={`alert alert-${cleanupAlert.type} show`} style={{ marginTop: 12 }}>{cleanupAlert.msg}</div>}
      </div>
    </div>
  );
}
