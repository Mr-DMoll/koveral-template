"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Milestone {
  id:           string;
  title:        string;
  description:  string | null;
  status:       string;
  agreedAmount: string | null;
  dueDate:      string | null;
  completedAt:  string | null;
  approvedAt:   string | null;
  deliverables: string[];
  order:        number;
  _count:       { tasks: number };
  invoices:     { id: string; invoiceNumber: string; status: string; amount: string }[];
}

// ─── Status config ────────────────────────────────────────────────────────────
const MILESTONE_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:     { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Pending"     },
  IN_PROGRESS: { bg: "rgba(59,130,246,0.1)",  color: "#3b82f6", label: "In Progress" },
  SUBMITTED:   { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b", label: "In Review"   },
  APPROVED:    { bg: "rgba(34,197,94,0.1)",   color: "#22c55e", label: "Approved"    },
  REJECTED:    { bg: "rgba(239,68,68,0.1)",   color: "#ef4444", label: "Rejected"    },
};

function StatusBadge({ status }: { status: string }) {
  const s = MILESTONE_STATUS[status] ?? MILESTONE_STATUS.PENDING;
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

// ─── Input styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  background: "var(--color-bg)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius-sm)",
  fontSize: "13px", color: "var(--color-text-primary)",
  outline: "none", boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600,
  color: "var(--color-text-muted)", textTransform: "uppercase",
  letterSpacing: "0.06em", marginBottom: "5px",
};

// ─── Create / Edit Milestone Modal ────────────────────────────────────────────
function MilestoneModal({ projectId, milestone, onClose, onSaved }: {
  projectId: string;
  milestone?: Milestone | null;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const isEdit = !!milestone;

  const [form, setForm] = useState({
    title:        milestone?.title        ?? "",
    description:  milestone?.description  ?? "",
    agreedAmount: milestone?.agreedAmount ? parseFloat(milestone.agreedAmount).toString() : "",
    dueDate:      milestone?.dueDate      ? milestone.dueDate.split("T")[0] : "",
    deliverables: milestone?.deliverables.join("\n") ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSubmitting(true); setError(null);

    const payload = {
      title:        form.title.trim(),
      description:  form.description.trim() || undefined,
      agreedAmount: form.agreedAmount ? parseFloat(form.agreedAmount) : undefined,
      dueDate:      form.dueDate || undefined,
      deliverables: form.deliverables
        .split("\n")
        .map((d) => d.trim())
        .filter(Boolean),
    };

    try {
      if (isEdit) {
        await apiClient.patch(endpoints.milestones.update(projectId, milestone!.id), payload);
      } else {
        await apiClient.post(endpoints.milestones.create(projectId), payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to save milestone.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "520px",
        maxHeight: "90vh", overflowY: "auto",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {isEdit ? "Edit Milestone" : "New Milestone"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "18px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Backend Development" required autoFocus />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What does this milestone cover?" rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Agreed Amount (ZAR)</label>
              <input style={inputStyle} type="number" value={form.agreedAmount} onChange={(e) => set("agreedAmount", e.target.value)} placeholder="0.00" min="0" />
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input style={inputStyle} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Deliverables (one per line)</label>
            <textarea
              value={form.deliverables}
              onChange={(e) => set("deliverables", e.target.value)}
              placeholder={"Payment gateway integration\nAdmin dashboard\nUnit tests"}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
            />
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Each line becomes a separate deliverable item
            </p>
          </div>

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
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Milestone"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm, onCancel }: {
  title:         string;
  message:       string;
  confirmLabel:  string;
  danger?:       boolean;
  onConfirm:     () => Promise<void>;
  onCancel:      () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onCancel} />
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "360px",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>{title}</h3>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 500,
            background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
          }}>Cancel</button>
          <button
            onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }}
            disabled={loading}
            style={{
              flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 600,
              background: danger ? "#ef4444" : "var(--color-accent)",
              border: "none", borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: danger ? "#fff" : "var(--color-accent-text)",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Milestone card ───────────────────────────────────────────────────────────
function MilestoneCard({ milestone, canManage, canSubmit, onEdit, onSubmit, onApprove, onReject, onDelete }: {
  milestone:  Milestone;
  canManage:  boolean;
  canSubmit:  boolean;
  onEdit:     (m: Milestone) => void;
  onSubmit:   (m: Milestone) => void;
  onApprove:  (m: Milestone) => void;
  onReject:   (m: Milestone) => void;
  onDelete:   (m: Milestone) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const amount = milestone.agreedAmount ? parseFloat(milestone.agreedAmount) : null;

  return (
    <div style={{
      background: "var(--color-card-bg)",
      border: "1px solid var(--color-card-border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--color-card-shadow)",
      overflow: "hidden",
      transition: "border-color 0.15s",
    }}>
      {/* Card header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", cursor: "pointer",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          {/* Order indicator */}
          <div style={{
            width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
            background: milestone.status === "APPROVED"
              ? "rgba(34,197,94,0.15)"
              : "rgba(132,204,22,0.12)",
            border: `1px solid ${milestone.status === "APPROVED" ? "rgba(34,197,94,0.3)" : "rgba(132,204,22,0.25)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "12px", fontWeight: 700,
            color: milestone.status === "APPROVED" ? "#22c55e" : "var(--color-accent)",
          }}>
            {milestone.order + 1}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
              {milestone.title}
            </p>
            <div style={{ display: "flex", gap: "12px", marginTop: "3px", flexWrap: "wrap" }}>
              {amount && (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  ZAR {amount.toLocaleString()}
                </span>
              )}
              {milestone.dueDate && (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Due {new Date(milestone.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {milestone._count.tasks > 0 && (
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {milestone._count.tasks} task{milestone._count.tasks !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
          <StatusBadge status={milestone.status} />
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
            ▾
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--color-border)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Description */}
          {milestone.description && (
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {milestone.description}
            </p>
          )}

          {/* Deliverables */}
          {milestone.deliverables.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                Deliverables
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {milestone.deliverables.map((d, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: "var(--color-accent)", flexShrink: 0, marginTop: "5px",
                    }} />
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>{d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linked invoice */}
          {milestone.invoices.length > 0 && (
            <div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
                Invoice
              </p>
              {milestone.invoices.map((inv) => (
                <div key={inv.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                }}>
                  <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                    {inv.invoiceNumber}
                  </span>
                  <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                      ZAR {parseFloat(inv.amount).toLocaleString()}
                    </span>
                    <span style={{
                      fontSize: "11px", fontWeight: 500,
                      padding: "2px 8px", borderRadius: "999px",
                      background: inv.status === "PAID" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)",
                      color: inv.status === "PAID" ? "#22c55e" : "#f59e0b",
                    }}>
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "4px", borderTop: "1px solid var(--color-border)" }}>
            {/* Developer / manager — submit for review */}
            {canSubmit && ["PENDING", "IN_PROGRESS", "REJECTED"].includes(milestone.status) && (
              <button onClick={() => onSubmit(milestone)} style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                background: "var(--color-accent)", border: "none",
                borderRadius: "var(--radius-sm)", cursor: "pointer",
                color: "var(--color-accent-text)",
              }}>
                Submit for review
              </button>
            )}

            {/* Manager — approve */}
            {canManage && milestone.status === "SUBMITTED" && (
              <button onClick={() => onApprove(milestone)} style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#22c55e",
              }}>
                Approve{milestone.agreedAmount ? " & generate invoice" : ""}
              </button>
            )}

            {/* Manager — reject */}
            {canManage && milestone.status === "SUBMITTED" && (
              <button onClick={() => onReject(milestone)} style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 500,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ef4444",
              }}>
                Reject
              </button>
            )}

            {/* Manager — edit */}
            {canManage && milestone.status !== "APPROVED" && (
              <button onClick={() => onEdit(milestone)} style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 500,
                background: "var(--color-bg)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
              }}>
                Edit
              </button>
            )}

            {/* Manager — delete */}
            {canManage && milestone.status !== "APPROVED" && (
              <button onClick={() => onDelete(milestone)} style={{
                padding: "6px 14px", fontSize: "12px", fontWeight: 500,
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ef4444",
              }}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MILESTONES TAB ───────────────────────────────────────────────────────────
export function MilestonesTab({ projectId, callerRole }: {
  projectId:  string;
  callerRole: string;
}) {
  const [milestones,  setMilestones]  = useState<Milestone[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [showModal,   setShowModal]   = useState(false);
  const [editing,     setEditing]     = useState<Milestone | null>(null);
  const [confirm,     setConfirm]     = useState<{
    type: "submit" | "approve" | "reject" | "delete";
    milestone: Milestone;
  } | null>(null);

  const canManage = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);
  const canSubmit = ["MANAGER", "DEVELOPER", "ADMIN", "SUPER_ADMIN"].includes(callerRole);

  const fetchMilestones = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const { data } = await apiClient.get(endpoints.milestones.list(projectId));
      setMilestones(data.data?.milestones ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load milestones.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchMilestones(); }, [fetchMilestones]);

  // ── Action handlers ──────────────────────────────────────────────────────────
  const handleSubmit = async (m: Milestone) => {
    await apiClient.patch(endpoints.milestones.submit(projectId, m.id));
    await fetchMilestones();
  };

  const handleApprove = async (m: Milestone) => {
    await apiClient.patch(endpoints.milestones.approve(projectId, m.id));
    await fetchMilestones();
  };

  const handleReject = async (m: Milestone) => {
    await apiClient.patch(endpoints.milestones.reject(projectId, m.id));
    await fetchMilestones();
  };

  const handleDelete = async (m: Milestone) => {
    await apiClient.delete(endpoints.milestones.delete(projectId, m.id));
    setMilestones((prev) => prev.filter((x) => x.id !== m.id));
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const approved  = milestones.filter((m) => m.status === "APPROVED").length;
  const submitted = milestones.filter((m) => m.status === "SUBMITTED").length;
  const pending   = milestones.filter((m) => ["PENDING", "IN_PROGRESS"].includes(m.status)).length;
  const totalValue = milestones
    .filter((m) => m.agreedAmount)
    .reduce((sum, m) => sum + parseFloat(m.agreedAmount!), 0);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading milestones...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>Milestones</h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            Track deliverables and trigger invoices on approval
          </p>
        </div>
        {canManage && (
          <button onClick={() => { setEditing(null); setShowModal(true); }} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 18px", fontSize: "13px", fontWeight: 600,
            background: "var(--color-accent)", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            color: "var(--color-accent-text)",
          }}>
            + Add Milestone
          </button>
        )}
      </div>

      {/* Stats */}
      {milestones.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
          {[
            { label: "Total",     value: milestones.length, color: "var(--color-text-primary)" },
            { label: "Approved",  value: approved,          color: "#22c55e" },
            { label: "In Review", value: submitted,         color: "#f59e0b" },
            { label: "Pending",   value: pending,           color: "#94a3b8" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: "12px 16px",
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "var(--radius-md)",
            }}>
              <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
              <p style={{ fontSize: "22px", fontWeight: 300, color, lineHeight: 1 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Total value banner */}
      {totalValue > 0 && (
        <div style={{
          padding: "12px 18px",
          background: "rgba(132,204,22,0.06)",
          border: "1px solid rgba(132,204,22,0.2)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>Total milestone value</span>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-accent)" }}>
            ZAR {totalValue.toLocaleString()}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center", padding: "20px" }}>{error}</p>
      )}

      {/* Milestone list */}
      {milestones.length === 0 && !error ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>
            No milestones yet
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            Break the project into milestones. Each approved milestone auto-generates an invoice.
          </p>
          {canManage && (
            <button onClick={() => { setEditing(null); setShowModal(true); }} style={{
              padding: "9px 20px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>
              Add first milestone
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              canManage={canManage}
              canSubmit={canSubmit}
              onEdit={(m) => { setEditing(m); setShowModal(true); }}
              onSubmit={(m) => setConfirm({ type: "submit",  milestone: m })}
              onApprove={(m) => setConfirm({ type: "approve", milestone: m })}
              onReject={(m) => setConfirm({ type: "reject",  milestone: m })}
              onDelete={(m) => setConfirm({ type: "delete",  milestone: m })}
            />
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <MilestoneModal
          projectId={projectId}
          milestone={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={fetchMilestones}
        />
      )}

      {/* Confirm dialogs */}
      {confirm?.type === "submit" && (
        <ConfirmDialog
          title="Submit for review?"
          message={`"${confirm.milestone.title}" will be sent to the manager for approval.`}
          confirmLabel="Submit"
          onConfirm={async () => { await handleSubmit(confirm.milestone); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "approve" && (
        <ConfirmDialog
          title="Approve milestone?"
          message={`"${confirm.milestone.title}" will be marked complete.${confirm.milestone.agreedAmount ? ` An invoice for ZAR ${parseFloat(confirm.milestone.agreedAmount).toLocaleString()} will be generated automatically.` : ""}`}
          confirmLabel="Approve"
          onConfirm={async () => { await handleApprove(confirm.milestone); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "reject" && (
        <ConfirmDialog
          title="Reject milestone?"
          message={`"${confirm.milestone.title}" will be sent back for revision.`}
          confirmLabel="Reject"
          danger
          onConfirm={async () => { await handleReject(confirm.milestone); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === "delete" && (
        <ConfirmDialog
          title="Delete milestone?"
          message={`This will permanently delete "${confirm.milestone.title}". This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={async () => { await handleDelete(confirm.milestone); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
