"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChangeRequest {
  id:            string;
  type:          string;
  description:   string;
  price:         string | null;
  status:        string;
  requestedById: string;
  approvedById:  string | null;
  approvedAt:    string | null;
  createdAt:     string;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PENDING:  { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b", label: "Pending"  },
  APPROVED: { bg: "rgba(34,197,94,0.1)",   color: "#22c55e", label: "Approved" },
  REJECTED: { bg: "rgba(239,68,68,0.1)",   color: "#ef4444", label: "Rejected" },
  PAID:     { bg: "rgba(132,204,22,0.1)",  color: "#84cc16", label: "Paid"     },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.PENDING;
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

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateChangeRequestModal({ projectId, onClose, onSaved }: {
  projectId: string;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const [form, setForm] = useState({ type: "scope_change", description: "", price: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [generating,   setGenerating]   = useState(false);
  const [crId,         setCrId]         = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim()) return;
    setIsSubmitting(true); setError(null);
    try {
      const { data } = await apiClient.post(
        endpoints.changeRequests.create(projectId),
        {
          type:        form.type,
          description: form.description.trim(),
          price:       form.price ? parseFloat(form.price) : undefined,
        },
      );
      setCrId(data.data?.changeRequest?.id);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create change request.");
      setIsSubmitting(false);
    }
  };

  const handleGenerateDoc = async () => {
    if (!crId) return;
    setGenerating(true); setError(null);
    try {
      await apiClient.post(`/projects/${projectId}/workers/change-request`, {
        changeRequestId: crId,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to generate document.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: "520px",
        background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {crId ? "Generate Document" : "New Change Request"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "18px" }}>✕</button>
        </div>

        {/* Step 1 — create the change request */}
        {!crId ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Change Type *</label>
              <select style={inputStyle} value={form.type} onChange={(e) => set("type", e.target.value)}>
                <option value="scope_change">Scope Change</option>
                <option value="design_revision">Design Revision</option>
                <option value="feature_addition">Feature Addition</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe what the client is requesting and why it falls outside the original scope..."
                rows={4}
                style={{ ...inputStyle, resize: "vertical" }}
                required
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Additional Cost (ZAR)</label>
              <input
                type="number" min="0" step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="0.00"
                style={inputStyle}
              />
            </div>
            {error && (
              <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px" }}>
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
                {isSubmitting ? "Creating..." : "Create & Generate Doc →"}
              </button>
            </div>
          </form>
        ) : (
          /* Step 2 — generate the AI document */
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{
              padding: "14px 16px",
              background: "rgba(34,197,94,0.06)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: "var(--radius-md)",
            }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#22c55e", marginBottom: "4px" }}>✓ Change request created</p>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                Now generate a formal document for the client to review and sign.
              </p>
            </div>

            {error && (
              <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => { onSaved(); onClose(); }} style={{
                flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 500,
                background: "var(--color-bg)", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
              }}>
                Skip document
              </button>
              <button onClick={handleGenerateDoc} disabled={generating} style={{
                flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 600,
                background: "rgba(132,204,22,0.15)", border: "1px solid rgba(132,204,22,0.3)",
                borderRadius: "var(--radius-sm)", cursor: generating ? "not-allowed" : "pointer",
                color: "var(--color-accent)", opacity: generating ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}>
                {generating ? (
                  <>
                    <div style={{ width: "10px", height: "10px", border: "2px solid rgba(132,204,22,0.3)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Generating...
                  </>
                ) : "✦ Generate AI Document"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CHANGE REQUESTS TAB ──────────────────────────────────────────────────────
export function ChangeRequestsTab({ projectId, callerRole }: {
  projectId:  string;
  callerRole: string;
}) {
  const [requests,   setRequests]   = useState<ChangeRequest[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [updating,   setUpdating]   = useState<string | null>(null);

  const canManage = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const { data } = await apiClient.get(endpoints.changeRequests.list(projectId));
      setRequests(data.data?.requests ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load change requests.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleStatusUpdate = async (id: string, status: string) => {
    setUpdating(id);
    try {
      await apiClient.patch(endpoints.changeRequests.updateStatus(projectId, id), { status });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (id: string) => {
    await apiClient.delete(endpoints.changeRequests.delete(projectId, id));
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px", color: "var(--color-text-muted)" }}>
      <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: "13px" }}>Loading change requests...</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>Change Requests</h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            Track scope changes, revisions, and additions outside the original agreement
          </p>
        </div>
        {canManage && (
          <button onClick={() => setShowModal(true)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 18px", fontSize: "13px", fontWeight: 600,
            background: "var(--color-accent)", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            color: "var(--color-accent-text)",
          }}>
            + New Change Request
          </button>
        )}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* List */}
      {requests.length === 0 && !error ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>
            No change requests
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            When a client requests work outside the original scope, log it here. The AI will generate a formal document for them to sign.
          </p>
          {canManage && (
            <button onClick={() => setShowModal(true)} style={{
              padding: "9px 20px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>
              Log first change request
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {requests.map((cr) => (
            <div
              key={cr.id}
              style={{
                padding: "16px 20px",
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-card-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--color-card-shadow)",
                display: "flex", flexDirection: "column", gap: "10px",
              }}
            >
              {/* Top row */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                    <span style={{
                      fontSize: "11px", fontWeight: 700, padding: "2px 8px",
                      borderRadius: "999px", background: "rgba(132,204,22,0.1)",
                      color: "var(--color-accent)", border: "1px solid rgba(132,204,22,0.2)",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {cr.type.replace(/_/g, " ")}
                    </span>
                    <StatusBadge status={cr.status} />
                  </div>
                  <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                    {cr.description}
                  </p>
                </div>

                {cr.price && (
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "2px" }}>Additional cost</p>
                    <p style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                      ZAR {parseFloat(cr.price).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: "10px", borderTop: "1px solid var(--color-border)",
              }}>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {new Date(cr.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                  {cr.approvedAt && ` · Approved ${new Date(cr.approvedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
                </p>

                {canManage && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    {cr.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(cr.id, "APPROVED")}
                          disabled={updating === cr.id}
                          style={{
                            padding: "4px 12px", fontSize: "12px", fontWeight: 600,
                            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)",
                            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#22c55e",
                            opacity: updating === cr.id ? 0.5 : 1,
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(cr.id, "REJECTED")}
                          disabled={updating === cr.id}
                          style={{
                            padding: "4px 12px", fontSize: "12px", fontWeight: 500,
                            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ef4444",
                            opacity: updating === cr.id ? 0.5 : 1,
                          }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {cr.status === "APPROVED" && (
                      <button
                        onClick={() => handleStatusUpdate(cr.id, "PAID")}
                        disabled={updating === cr.id}
                        style={{
                          padding: "4px 12px", fontSize: "12px", fontWeight: 600,
                          background: "rgba(132,204,22,0.1)", border: "1px solid rgba(132,204,22,0.2)",
                          borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-accent)",
                          opacity: updating === cr.id ? 0.5 : 1,
                        }}
                      >
                        Mark paid
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(cr.id)}
                      style={{
                        padding: "4px 12px", fontSize: "12px", fontWeight: 500,
                        background: "var(--color-bg)", border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-muted)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CreateChangeRequestModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSaved={fetchRequests}
        />
      )}
    </div>
  );
}
