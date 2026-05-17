"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";

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
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.color}30`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

export function ClientInvoicesPage() {
  const [invoices,   setInvoices]   = useState<any[]>([]);
  const [projectId,  setProjectId]  = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [paying,     setPaying]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const projRes  = await apiClient.get("/projects");
      const projects = projRes.data.data?.projects ?? [];
      if (projects.length === 0) { setIsLoading(false); return; }

      const pid = projects[0].id;
      setProjectId(pid);
      const invRes = await apiClient.get(`/projects/${pid}/invoices`);
      setInvoices(invRes.data.data?.invoices ?? []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleMarkPaid = async (invoiceId: string) => {
    if (!projectId) return;
    setPaying(invoiceId);
    try {
      await apiClient.patch(`/projects/${projectId}/invoices/${invoiceId}/status`, { status: "PAID" });
      setInvoices((prev) => prev.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: "PAID", paidAt: new Date().toISOString() } : inv
      ));
    } finally {
      setPaying(null);
    }
  };

  // Summary
  const total       = invoices.reduce((s, i) => s + parseFloat(i.amount), 0);
  const paid        = invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + parseFloat(i.amount), 0);
  const outstanding = invoices.filter((i) => ["SENT", "OVERDUE"].includes(i.status)).reduce((s, i) => s + parseFloat(i.amount), 0);
  const currency    = invoices[0]?.currency ?? "ZAR";

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading invoices...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>Invoices</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>Your project invoices and payment history</p>
      </div>

      {invoices.length === 0 ? (
        <div style={{ padding: "60px 40px", textAlign: "center", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No invoices yet</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Invoices are generated as project milestones are completed and approved.</p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {[
              { label: "Total Invoiced", value: `${currency} ${total.toLocaleString()}`,       color: "var(--color-text-primary)" },
              { label: "Paid",           value: `${currency} ${paid.toLocaleString()}`,        color: "#22c55e" },
              { label: "Outstanding",    value: `${currency} ${outstanding.toLocaleString()}`, color: outstanding > 0 ? "#ef4444" : "var(--color-text-muted)" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "16px 20px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--color-card-shadow)" }}>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>{label}</p>
                <p style={{ fontSize: "18px", fontWeight: 600, color, lineHeight: 1 }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Invoice list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {invoices.map((inv: any) => {
              const isOverdue = inv.dueDate && inv.status === "SENT" && new Date(inv.dueDate) < new Date();
              const amount = parseFloat(inv.amount);
              return (
                <div key={inv.id} style={{
                  padding: "18px 22px",
                  background: "var(--color-card-bg)",
                  border: `1px solid ${isOverdue ? "rgba(239,68,68,0.3)" : "var(--color-card-border)"}`,
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--color-card-shadow)",
                  display: "flex", flexDirection: "column", gap: "10px",
                }}>
                  {/* Top */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                        <p style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)", fontFamily: "monospace" }}>{inv.invoiceNumber}</p>
                        {inv.isDeposit && (
                          <span style={{ fontSize: "10px", fontWeight: 600, padding: "1px 7px", borderRadius: "999px", background: "rgba(132,204,22,0.1)", color: "var(--color-accent)", border: "1px solid rgba(132,204,22,0.2)" }}>DEPOSIT</span>
                        )}
                      </div>
                      {inv.description && <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>{inv.description}</p>}
                      {inv.milestone   && <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Milestone: {inv.milestone.title}</p>}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                        {inv.currency} {amount.toLocaleString()}
                      </p>
                      <StatusBadge status={isOverdue ? "OVERDUE" : inv.status} />
                    </div>
                  </div>

                  {/* Dates */}
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      Issued: {new Date(inv.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {inv.dueDate && (
                      <span style={{ fontSize: "12px", color: isOverdue ? "#ef4444" : "var(--color-text-muted)", fontWeight: isOverdue ? 600 : 400 }}>
                        {isOverdue ? "⚠ Overdue: " : "Due: "}
                        {new Date(inv.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {inv.paidAt && (
                      <span style={{ fontSize: "12px", color: "#22c55e", fontWeight: 600 }}>
                        ✓ Paid: {new Date(inv.paidAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>

                  {/* Pay action */}
                  {["SENT", "OVERDUE"].includes(inv.status) && (
                    <div style={{ paddingTop: "8px", borderTop: "1px solid var(--color-border)" }}>
                      <button
                        onClick={() => handleMarkPaid(inv.id)}
                        disabled={paying === inv.id}
                        style={{
                          padding: "8px 20px", fontSize: "13px", fontWeight: 600,
                          background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                          borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#22c55e",
                          opacity: paying === inv.id ? 0.6 : 1,
                        }}
                      >
                        {paying === inv.id ? "Processing..." : "Mark as paid"}
                      </button>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "6px" }}>
                        Stripe payment integration coming soon. Use this button to confirm payment has been made via bank transfer.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
