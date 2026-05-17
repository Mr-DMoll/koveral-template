"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Invoice {
  id:            string;
  invoiceNumber: string;
  amount:        string;
  currency:      string;
  status:        string;
  isDeposit:     boolean;
  description:   string | null;
  dueDate:       string | null;
  sentAt:        string | null;
  paidAt:        string | null;
  createdAt:     string;
  milestone:     { id: string; title: string } | null;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:     { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Draft"     },
  SENT:      { bg: "rgba(59,130,246,0.1)",  color: "#3b82f6", label: "Sent"      },
  PAID:      { bg: "rgba(34,197,94,0.1)",   color: "#22c55e", label: "Paid"      },
  OVERDUE:   { bg: "rgba(239,68,68,0.1)",   color: "#ef4444", label: "Overdue"   },
  CANCELLED: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Cancelled" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.DRAFT;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 500,
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ─── Create Invoice Modal ─────────────────────────────────────────────────────
function CreateInvoiceModal({ projectId, onClose, onSaved }: {
  projectId: string;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const [form, setForm] = useState({
    amount: "", description: "", dueDate: "", isDeposit: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px",
    background: "var(--color-bg)", border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)", fontSize: "13px",
    color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: "11px", fontWeight: 600,
    color: "var(--color-text-muted)", textTransform: "uppercase",
    letterSpacing: "0.06em", marginBottom: "5px",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) return;
    setIsSubmitting(true); setError(null);
    try {
      await apiClient.post(endpoints.invoices.create(projectId), {
        amount:      parseFloat(form.amount),
        description: form.description.trim() || undefined,
        dueDate:     form.dueDate || undefined,
        isDeposit:   form.isDeposit,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: "460px",
        background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>Create Invoice</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "18px" }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Amount (ZAR) *</label>
            <input style={inputStyle} type="number" value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="0.00" min="0" step="0.01" required autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Deposit payment" />
          </div>
          <div>
            <label style={labelStyle}>Due Date</label>
            <input style={inputStyle} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input type="checkbox" checked={form.isDeposit} onChange={(e) => set("isDeposit", e.target.checked)} style={{ accentColor: "var(--color-accent)" }} />
            <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>This is a deposit invoice</span>
          </label>
          {error && (
            <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "10px", paddingTop: "4px" }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 500,
              background: "var(--color-bg)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
            }}>Cancel</button>
            <button type="submit" disabled={isSubmitting} style={{
              flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: "var(--color-accent-text)", opacity: isSubmitting ? 0.6 : 1,
            }}>
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Invoice row ──────────────────────────────────────────────────────────────
function InvoiceRow({ invoice, canManage, isClient, onStatusChange }: {
  invoice:        Invoice;
  canManage:      boolean;
  isClient:       boolean;
  onStatusChange: (id: string, status: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const amount = parseFloat(invoice.amount);
  const isOverdue = invoice.dueDate &&
    invoice.status === "SENT" &&
    new Date(invoice.dueDate) < new Date();

  const handleStatus = async (status: string) => {
    setUpdating(true);
    try { await onStatusChange(invoice.id, status); }
    finally { setUpdating(false); }
  };

  return (
    <div style={{
      padding: "16px 20px",
      background: "var(--color-card-bg)",
      border: `1px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "var(--color-card-border)"}`,
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--color-card-shadow)",
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "monospace" }}>
              {invoice.invoiceNumber}
            </p>
            {invoice.isDeposit && (
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "1px 7px",
                borderRadius: "999px", background: "rgba(132,204,22,0.1)",
                color: "var(--color-accent)", border: "1px solid rgba(132,204,22,0.2)",
              }}>DEPOSIT</span>
            )}
          </div>
          {invoice.description && (
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{invoice.description}</p>
          )}
          {invoice.milestone && (
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
              Milestone: {invoice.milestone.title}
            </p>
          )}
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
            {invoice.currency} {amount.toLocaleString()}
          </p>
          <StatusBadge status={isOverdue ? "OVERDUE" : invoice.status} />
        </div>
      </div>

      {/* Dates row */}
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          Created: {new Date(invoice.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
        </span>
        {invoice.dueDate && (
          <span style={{ fontSize: "12px", color: isOverdue ? "#ef4444" : "var(--color-text-muted)", fontWeight: isOverdue ? 600 : 400 }}>
            {isOverdue ? "⚠ Overdue: " : "Due: "}
            {new Date(invoice.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        {invoice.sentAt && (
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            Sent: {new Date(invoice.sentAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
        {invoice.paidAt && (
          <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 600 }}>
            ✓ Paid: {new Date(invoice.paidAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {/* Actions */}
      {(canManage || isClient) && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
        <div style={{ display: "flex", gap: "8px", paddingTop: "6px", borderTop: "1px solid var(--color-border)" }}>
          {canManage && invoice.status === "DRAFT" && (
            <button onClick={() => handleStatus("SENT")} disabled={updating} style={{
              padding: "5px 14px", fontSize: "12px", fontWeight: 600,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#3b82f6",
              opacity: updating ? 0.6 : 1,
            }}>
              Send to client
            </button>
          )}
          {isClient && invoice.status === "SENT" && (
            <button onClick={() => handleStatus("PAID")} disabled={updating} style={{
              padding: "5px 14px", fontSize: "12px", fontWeight: 600,
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#22c55e",
              opacity: updating ? 0.6 : 1,
            }}>
              Mark as paid
            </button>
          )}
          {canManage && invoice.status !== "CANCELLED" && (
            <button onClick={() => handleStatus("CANCELLED")} disabled={updating} style={{
              padding: "5px 14px", fontSize: "12px", fontWeight: 500,
              background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)",
              borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#94a3b8",
              opacity: updating ? 0.6 : 1,
            }}>
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── INVOICES TAB ─────────────────────────────────────────────────────────────
export function InvoicesTab({ projectId, callerRole, clientId }: {
  projectId:  string;
  callerRole: string;
  clientId:   string;
}) {
  const [invoices,   setInvoices]   = useState<Invoice[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const canManage = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);
  const isClient  = callerRole === "CLIENT";

  const fetchInvoices = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const { data } = await apiClient.get(endpoints.invoices.list(projectId));
      setInvoices(data.data?.invoices ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleStatusChange = async (id: string, status: string) => {
    await apiClient.patch(endpoints.invoices.updateStatus(projectId, id), { status });
    setInvoices((prev) =>
      prev.map((inv) => inv.id === id ? {
        ...inv, status,
        sentAt: status === "SENT" ? new Date().toISOString() : inv.sentAt,
        paidAt: status === "PAID" ? new Date().toISOString() : inv.paidAt,
      } : inv)
    );
  };

  // Summary stats
  const total    = invoices.reduce((s, i) => s + parseFloat(i.amount), 0);
  const paid     = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + parseFloat(i.amount), 0);
  const pending  = invoices.filter((i) => ["DRAFT", "SENT"].includes(i.status)).reduce((s, i) => s + parseFloat(i.amount), 0);
  const currency = invoices[0]?.currency ?? "ZAR";

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading invoices...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>Invoices</h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {isClient ? "Your project invoices" : "Invoices are auto-generated when milestones are approved"}
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowCreate(true)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 18px", fontSize: "13px", fontWeight: 600,
            background: "var(--color-accent)", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            color: "var(--color-accent-text)",
          }}>
            + Create Invoice
          </button>
        )}
      </div>

      {/* Summary */}
      {invoices.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { label: "Total Invoiced", value: `${currency} ${total.toLocaleString()}`,   color: "var(--color-text-primary)" },
            { label: "Paid",           value: `${currency} ${paid.toLocaleString()}`,    color: "#22c55e" },
            { label: "Outstanding",    value: `${currency} ${pending.toLocaleString()}`, color: pending > 0 ? "#f59e0b" : "var(--color-text-muted)" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: "14px 18px",
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "var(--radius-md)",
            }}>
              <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ fontSize: "18px", fontWeight: 600, color, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* Invoice list */}
      {invoices.length === 0 && !error ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>
            No invoices yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            Invoices are automatically created when a milestone is approved. You can also create manual invoices for deposits.
          </p>
          {canManage && (
            <button onClick={() => setShowCreate(true)} style={{
              padding: "9px 20px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>
              Create deposit invoice
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {invoices.map((inv) => (
            <InvoiceRow
              key={inv.id}
              invoice={inv}
              canManage={canManage}
              isClient={isClient}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateInvoiceModal
          projectId={projectId}
          onClose={() => setShowCreate(false)}
          onSaved={fetchInvoices}
        />
      )}
      
    </div>
  );
}
