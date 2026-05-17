"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";
import { RichDocumentViewer } from "./RichDocumentViewer";
import { RichDocumentEditor } from "./RichDocumentEditor";
import { useAuth } from "@/shared/context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProjectDocument {
  id:          string;
  type:        string;
  title:       string;
  content:     string | null;
  fileUrl:     string | null;
  fileSize:    number | null;
  mimeType:    string | null;
  version:     number;
  isLatest:    boolean;
  createdAt:   string;
  updatedAt:   string;
  uploadedBy: {
    id:          string;
    firstName:   string | null;
    lastName:    string | null;
    displayName: string | null;
    email:       string;
  };
}

// ─── Document type config ─────────────────────────────────────────────────────
const DOC_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  SCOPE:         { label: "Scope",         color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  CONTRACT:      { label: "Contract",      color: "#a855f7", bg: "rgba(168,85,247,0.1)"  },
  SPECIFICATION: { label: "Specification", color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  DESIGN_BRIEF:  { label: "Design Brief",  color: "#ec4899", bg: "rgba(236,72,153,0.1)"  },
  HANDOVER:      { label: "Handover",      color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  OTHER:         { label: "Other",         color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
};

function TypeBadge({ type }: { type: string }) {
  const t = DOC_TYPES[type] ?? DOC_TYPES.OTHER;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 500,
      background: t.bg, color: t.color,
      border: `1px solid ${t.color}30`,
      whiteSpace: "nowrap",
    }}>
      {t.label}
    </span>
  );
}

function userName(u: ProjectDocument["uploadedBy"]) {
  return u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

function formatSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

// ─── Create Document Modal (new documents only) ───────────────────────────────
function DocumentModal({ projectId, onClose, onSaved }: {
  projectId: string;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const [form, setForm] = useState({ type: "OTHER", title: "", content: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSubmitting(true); setError(null);
    try {
      await apiClient.post(endpoints.documents.create(projectId), {
        type:    form.type,
        title:   form.title.trim(),
        content: form.content.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "600px",
        maxHeight: "90vh", overflowY: "auto",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>New Document</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "18px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Document Type *</label>
            <select style={inputStyle} value={form.type} onChange={(e) => set("type", e.target.value)}>
              {Object.entries(DOC_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Project Scope v1" required autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Content</label>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder="Write the document content here (markdown supported)..."
              rows={8}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "monospace", fontSize: "12px", lineHeight: 1.6 }}
            />
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Tip: After creating, use the full-page editor for longer content.
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
              {isSubmitting ? "Creating..." : "Create Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }: {
  title: string; message: string;
  onConfirm: () => Promise<void>; onCancel: () => void;
}) {
  const [loading, setLoading] = useState(false);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onCancel} />
      <div style={{
        position: "relative", zIndex: 10, width: "100%", maxWidth: "360px",
        background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "8px" }}>{title}</h3>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px", lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 500,
            background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
          }}>Cancel</button>
          <button onClick={async () => { setLoading(true); await onConfirm(); setLoading(false); }} disabled={loading} style={{
            flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 600,
            background: "#ef4444", border: "none", borderRadius: "var(--radius-sm)",
            cursor: "pointer", color: "#fff", opacity: loading ? 0.6 : 1,
          }}>
            {loading ? "..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENTS TAB ────────────────────────────────────────────────────────────
export function DocumentsTab({ projectId, callerRole }: {
  projectId:  string;
  callerRole: string;
}) {
  const { user }  = useAuth();
  const [documents,  setDocuments]  = useState<ProjectDocument[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [viewing,    setViewing]    = useState<ProjectDocument | null>(null);
  const [editing,    setEditing]    = useState<ProjectDocument | null>(null); // opens full-page editor
  const [deleting,   setDeleting]   = useState<ProjectDocument | null>(null);
  const [typeFilter, setTypeFilter] = useState("ALL");

  const canManage = ["ADMIN", "SUPER_ADMIN", "MANAGER", "DEVELOPER"].includes(callerRole);
  const canDelete = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);

  const fetchDocuments = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const { data } = await apiClient.get(endpoints.documents.list(projectId));
      setDocuments(data.data?.documents ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load documents.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (doc: ProjectDocument) => {
    await apiClient.delete(endpoints.documents.delete(projectId, doc.id));
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
  };

  const filtered = typeFilter === "ALL"
    ? documents
    : documents.filter((d) => d.type === typeFilter);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading documents...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>Documents</h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            Project documents, contracts, and specifications
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
            + New Document
          </button>
        )}
      </div>

      {/* Type filter */}
      {documents.length > 0 && (
        <div style={{ display: "flex", gap: "2px", flexWrap: "wrap" }}>
          {["ALL", ...Object.keys(DOC_TYPES)].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: "5px 12px", fontSize: "12px", fontWeight: 500,
              borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
              cursor: "pointer",
              background: typeFilter === t ? "var(--color-accent)" : "var(--color-card-bg)",
              color: typeFilter === t ? "var(--color-accent-text)" : "var(--color-text-muted)",
              transition: "all 0.15s",
            }}>
              {t === "ALL" ? "All" : DOC_TYPES[t]?.label}
              {t !== "ALL" && <span style={{ marginLeft: "4px", opacity: 0.7 }}>{documents.filter((d) => d.type === t).length}</span>}
            </button>
          ))}
        </div>
      )}

      {error && <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* Document list */}
      {filtered.length === 0 && !error ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>
            {typeFilter !== "ALL" ? `No ${DOC_TYPES[typeFilter]?.label} documents` : "No documents yet"}
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            {canManage ? "Create a document manually or use the AI Automation panel to generate one." : "No documents have been added yet."}
          </p>
          {canManage && typeFilter === "ALL" && (
            <button onClick={() => setShowModal(true)} style={{
              padding: "9px 20px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>
              Create first document
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "14px 18px",
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-card-border)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--color-card-shadow)",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--color-card-border)"}
            >
              {/* Icon */}
              <div style={{
                width: "36px", height: "36px", borderRadius: "var(--radius-sm)",
                background: DOC_TYPES[doc.type]?.bg ?? "rgba(148,163,184,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "16px", flexShrink: 0,
              }}>📄</div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)" }}>{doc.title}</p>
                  <TypeBadge type={doc.type} />
                  {doc.version > 1 && <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>v{doc.version}</span>}
                </div>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {userName(doc.uploadedBy)} · {new Date(doc.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                  {doc.fileSize && ` · ${formatSize(doc.fileSize)}`}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                <button onClick={() => setViewing(doc)} style={{
                  padding: "5px 12px", fontSize: "12px", fontWeight: 500,
                  background: "var(--color-bg)", border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
                }}>
                  View
                </button>
                {canManage && (
                  <button
                    onClick={() => setEditing(doc)}  // ← opens full-page editor
                    style={{
                      padding: "5px 12px", fontSize: "12px", fontWeight: 500,
                      background: "var(--color-bg)", border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
                    }}
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => setDeleting(doc)} style={{
                    padding: "5px 12px", fontSize: "12px", fontWeight: 500,
                    background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ef4444",
                  }}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal — new documents only */}
      {showModal && (
        <DocumentModal
          projectId={projectId}
          onClose={() => setShowModal(false)}
          onSaved={fetchDocuments}
        />
      )}

      {/* Full-page viewer with comments */}
      {viewing && (
        <RichDocumentViewer
          document={viewing as any}
          projectId={projectId}
          callerRole={callerRole}
          callerId={user?.id ?? ""}
          onClose={() => setViewing(null)}
        />
      )}

      {/* Full-page editor */}
      {editing && (
        <RichDocumentEditor
          document={editing}
          projectId={projectId}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setDocuments((prev) =>
              prev.map((d) => d.id === updated.id ? { ...d, ...updated } : d)
            );
            setEditing(null);
          }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <ConfirmDialog
          title="Delete document?"
          message={`"${deleting.title}" will be permanently deleted.`}
          onConfirm={async () => { await handleDelete(deleting); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
