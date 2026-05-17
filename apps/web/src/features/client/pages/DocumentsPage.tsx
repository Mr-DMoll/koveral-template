"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/shared/context/AuthContext";
import apiClient from "@/api/client";
import { RichDocumentViewer } from "@/shared/components/projects/RichDocumentViewer";

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
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 500, background: t.bg, color: t.color, border: `1px solid ${t.color}30`, whiteSpace: "nowrap" }}>
      {t.label}
    </span>
  );
}

function userName(u: any) {
  return u?.displayName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "—";
}

export function ClientDocumentsPage() {
  const { user } = useAuth();
  const [documents,  setDocuments]  = useState<any[]>([]);
  const [projectId,  setProjectId]  = useState<string | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [viewing,    setViewing]    = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Get client's project first
      const projRes  = await apiClient.get("/projects");
      const projects = projRes.data.data?.projects ?? [];
      if (projects.length === 0) { setIsLoading(false); return; }

      const pid = projects[0].id;
      setProjectId(pid);

      const docsRes = await apiClient.get(`/projects/${pid}/documents`);
      setDocuments(docsRes.data.data?.documents ?? []);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading documents...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>Documents</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>Your project documents — contracts, scope, and more</p>
      </div>

      {documents.length === 0 ? (
        <div style={{ padding: "60px 40px", textAlign: "center", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No documents yet</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Your project manager will share documents here — contracts, scope documents, and handover notes.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {documents.map((doc: any) => (
            <div
              key={doc.id}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "16px 20px",
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-card-border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--color-card-shadow)",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--color-card-border)"}
            >
              {/* Icon */}
              <div style={{ width: "40px", height: "40px", borderRadius: "var(--radius-sm)", background: DOC_TYPES[doc.type]?.bg ?? "rgba(148,163,184,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 }}>
                📄
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                  <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{doc.title}</p>
                  <TypeBadge type={doc.type} />
                  {doc.version > 1 && <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>v{doc.version}</span>}
                </div>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  Shared by {userName(doc.uploadedBy)} · {new Date(doc.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => setViewing(doc)}
                style={{
                  padding: "7px 16px", fontSize: "12px", fontWeight: 600,
                  background: "var(--color-accent)", border: "none",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  color: "var(--color-accent-text)", flexShrink: 0,
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      )}

      {viewing && projectId && (
        <RichDocumentViewer
          document={viewing}
          projectId={projectId}
          callerRole="CLIENT"
          callerId={user?.id ?? ""}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
