"use client";

import { useState, useEffect } from "react";
import { marked } from "marked";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

interface Document {
  id:        string;
  type:      string;
  title:     string;
  content:   string | null;
  version:   number;
  createdAt: string;
  updatedAt: string;
  uploadedBy: {
    id: string; firstName: string | null; lastName: string | null;
    displayName: string | null; email: string;
  };
}

marked.setOptions({ breaks: true });

function userName(u: any) {
  return u?.displayName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "—";
}

export function RichDocumentEditor({ document, projectId, onClose, onSaved }: {
  document:  Document;
  projectId: string;
  onClose:   () => void;
  onSaved:   (updated: Document) => void;
}) {
  const [title,       setTitle]       = useState(document.title);
  const [content,     setContent]     = useState(document.content ?? "");
  const [preview,     setPreview]     = useState("");
  const [isSaving,    setIsSaving]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [isDirty,     setIsDirty]     = useState(false);
  const [activePanel, setActivePanel] = useState<"edit" | "preview">("edit");

  // Render markdown preview
  useEffect(() => {
    setPreview(marked(content) as string);
  }, [content]);

  const handleSave = async () => {
    setIsSaving(true); setError(null);
    try {
      const { data } = await apiClient.patch(
        endpoints.documents.update(projectId, document.id),
        { title: title.trim(), content: content.trim() },
      );
      setIsDirty(false);
      onSaved(data.data?.document ?? { ...document, title, content });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (!window.confirm("You have unsaved changes. Close anyway?")) return;
    }
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", flexDirection: "column",
      background: "var(--color-bg)",
      height: "100vh",
    }}>
      {/* ── Top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 24px",
        background: "var(--color-card-bg)",
        borderBottom: "1px solid var(--color-border)",
        flexShrink: 0, gap: "12px",
      }}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
          <button onClick={handleClose} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", fontSize: "13px", fontWeight: 500,
            background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)", cursor: "pointer",
            color: "var(--color-text-secondary)", flexShrink: 0,
          }}>
            ← Back
          </button>

          {/* Editable title */}
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
            style={{
              flex: 1, padding: "6px 10px",
              background: "var(--color-bg)",
              border: "1px solid transparent",
              borderRadius: "var(--radius-sm)",
              fontSize: "14px", fontWeight: 600,
              color: "var(--color-text-primary)",
              outline: "none", minWidth: 0,
            }}
            onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; }}
            onBlur={(e)  => { e.target.style.borderColor = "transparent"; }}
          />

          {isDirty && (
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
              Unsaved changes
            </span>
          )}
        </div>

        {/* Right */}
        <div style={{ display: "flex", gap: "8px", flexShrink: 0, alignItems: "center" }}>
          {/* Preview toggle (mobile-like) */}
          <div style={{
            display: "flex", gap: "2px", padding: "3px",
            background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
          }}>
            {(["edit", "preview"] as const).map((panel) => (
              <button key={panel} onClick={() => setActivePanel(panel)} style={{
                padding: "4px 12px", fontSize: "12px", fontWeight: 500,
                background: activePanel === panel ? "var(--color-accent)" : "transparent",
                border: "none", borderRadius: "4px", cursor: "pointer",
                color: activePanel === panel ? "var(--color-accent-text)" : "var(--color-text-muted)",
                transition: "all 0.15s",
              }}>
                {panel === "edit" ? "Edit" : "Preview"}
              </button>
            ))}
          </div>

          {error && (
            <span style={{ fontSize: "12px", color: "#ef4444" }}>{error}</span>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            style={{
              padding: "7px 18px", fontSize: "13px", fontWeight: 600,
              background: isDirty ? "var(--color-accent)" : "var(--color-bg)",
              border: `1px solid ${isDirty ? "var(--color-accent)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-sm)", cursor: isDirty ? "pointer" : "not-allowed",
              color: isDirty ? "var(--color-accent-text)" : "var(--color-text-muted)",
              opacity: isSaving ? 0.6 : 1, transition: "all 0.15s",
            }}
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Edit panel */}
        {activePanel === "edit" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Toolbar hint */}
            <div style={{
              padding: "8px 24px",
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-card-bg)",
              flexShrink: 0,
              display: "flex", gap: "16px", alignItems: "center",
            }}>
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Markdown supported</span>
              {[
                { label: "# H1",   insert: "# "    },
                { label: "## H2",  insert: "## "   },
                { label: "**B**",  insert: "****",  cursor: 2 },
                { label: "_I_",    insert: "__",    cursor: 1 },
                { label: "- List", insert: "\n- "  },
                { label: "| Table", insert: "\n| Col 1 | Col 2 |\n|-------|-------|\n| Cell | Cell |\n" },
              ].map(({ label, insert, cursor }) => (
                <button key={label} onClick={() => {
                  const textarea = window.document.getElementById("doc-editor") as HTMLTextAreaElement;
                  if (!textarea) return;
                  const start = textarea.selectionStart;
                  const end   = textarea.selectionEnd;
                  const selected = content.slice(start, end);
                  const before = content.slice(0, start);
                  const after  = content.slice(end);
                  const newContent = before + insert.replace("****", `**${selected}**`).replace("__", `_${selected}_`) + after;
                  setContent(newContent);
                  setIsDirty(true);
                }} style={{
                  padding: "2px 8px", fontSize: "11px", fontWeight: 500,
                  background: "var(--color-bg)", border: "1px solid var(--color-border)",
                  borderRadius: "4px", cursor: "pointer", color: "var(--color-text-secondary)",
                  fontFamily: "monospace",
                }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              id="doc-editor"
              value={content}
              onChange={(e) => { setContent(e.target.value); setIsDirty(true); }}
              spellCheck={false}
              style={{
                flex: 1, padding: "24px 32px",
                background: "var(--color-bg)",
                border: "none", outline: "none", resize: "none",
                fontSize: "14px", fontFamily: "'Courier New', monospace",
                color: "var(--color-text-secondary)",
                lineHeight: 1.7,
              }}
              placeholder="Start writing in markdown..."
            />
          </div>
        )}

        {/* Preview panel */}
        {activePanel === "preview" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
            <div style={{
              width: "100%",
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--color-card-shadow)",
              overflow: "hidden",
            }}>
              {/* Doc header */}
              <div style={{
                padding: "32px 40px 24px",
                borderBottom: "3px solid var(--color-accent)",
              }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                  {document.type.replace(/_/g, " ")}
                </p>
                <h1 style={{ fontSize: "26px", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.3, marginBottom: "12px" }}>
                  {title}
                </h1>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Version {document.version}</span>
                  <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{userName(document.uploadedBy)}</span>
                </div>
              </div>

              {/* Rendered content */}
              <div
                style={{ padding: "32px 40px" }}
                dangerouslySetInnerHTML={{ __html: preview || `<p style="color: var(--color-text-muted); font-style: italic;">Nothing to preview yet.</p>` }}
                className="doc-content"
              />
            </div>
          </div>
        )}
      </div>

      {/* Markdown styles */}
      <style>{`
        .doc-content h1 { font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin: 28px 0 12px; line-height: 1.3; }
        .doc-content h2 { font-size: 18px; font-weight: 600; color: var(--color-text-primary); margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
        .doc-content h3 { font-size: 15px; font-weight: 600; color: var(--color-text-primary); margin: 20px 0 8px; }
        .doc-content h4 { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin: 16px 0 6px; text-transform: uppercase; letter-spacing: 0.05em; }
        .doc-content p  { font-size: 14px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 14px; }
        .doc-content ul, .doc-content ol { margin: 0 0 14px 20px; }
        .doc-content li { font-size: 14px; color: var(--color-text-secondary); line-height: 1.7; margin-bottom: 4px; }
        .doc-content strong { font-weight: 700; color: var(--color-text-primary); }
        .doc-content em { font-style: italic; }
        .doc-content code { background: var(--color-bg); padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; color: var(--color-accent); border: 1px solid var(--color-border); }
        .doc-content pre { background: var(--color-bg); border: 1px solid var(--color-border); padding: 16px; border-radius: var(--radius-md); overflow-x: auto; margin-bottom: 14px; }
        .doc-content pre code { background: none; border: none; padding: 0; color: var(--color-text-secondary); }
        .doc-content blockquote { border-left: 3px solid var(--color-accent); padding: 8px 16px; margin: 0 0 14px; background: rgba(132,204,22,0.04); border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
        .doc-content table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
        .doc-content th { background: var(--color-bg); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--color-text-primary); border: 1px solid var(--color-border); font-size: 12px; text-transform: uppercase; }
        .doc-content td { padding: 10px 14px; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
        .doc-content tr:nth-child(even) td { background: var(--color-bg); }
        .doc-content hr { border: none; border-top: 1px solid var(--color-border); margin: 24px 0; }
        .doc-content a { color: var(--color-accent); text-decoration: none; }
      `}</style>
    </div>
  );
}
