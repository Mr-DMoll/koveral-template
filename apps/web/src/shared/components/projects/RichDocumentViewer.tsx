"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { marked } from "marked";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Document {
  id:          string;
  type:        string;
  title:       string;
  content:     string | null;
  fileUrl:     string | null;
  version:     number;
  createdAt:   string;
  updatedAt:   string;
  uploadedBy: {
    id:          string;
    firstName:   string | null;
    lastName:    string | null;
    displayName: string | null;
    email:       string;
    avatarUrl:   string | null;
  };
}

interface Comment {
  id:         string;
  content:    string;
  isInternal: boolean;
  createdAt:  string;
  author: {
    id:          string;
    firstName:   string | null;
    lastName:    string | null;
    displayName: string | null;
    email:       string;
    avatarUrl:   string | null;
    role:        string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function userName(u: any) {
  return u?.displayName ||
    [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
    u?.email || "Unknown";
}

function userInitials(u: any) {
  return userName(u).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 7)   return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

// ─── Configure marked ─────────────────────────────────────────────────────────
marked.setOptions({ breaks: true });

// ─── Comment avatar ───────────────────────────────────────────────────────────
function CommentAvatar({ author }: { author: any }) {
  return (
    <div style={{
      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
      background: "rgba(132,204,22,0.15)",
      border: "1px solid rgba(132,204,22,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "10px", fontWeight: 700, color: "var(--color-accent)",
      overflow: "hidden",
    }}>
      {author?.avatarUrl
        ? <img src={author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : userInitials(author)
      }
    </div>
  );
}

// ─── RICH DOCUMENT VIEWER ─────────────────────────────────────────────────────
export function RichDocumentViewer({ document, projectId, callerRole, callerId, onClose }: {
  document:   Document;
  projectId:  string;
  callerRole: string;
  callerId:   string;
  onClose:    () => void;
}) {
  const [comments,     setComments]     = useState<Comment[]>([]);
  const [newComment,   setNewComment]   = useState("");
  const [isInternal,   setIsInternal]   = useState(false);
  const [isPosting,    setIsPosting]    = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [renderedHtml, setRenderedHtml] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const isClient  = callerRole === "CLIENT";
  const canManage = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);

  // ── Render markdown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (document.content) {
      const html = marked(document.content) as string;
      setRenderedHtml(html);
    }
  }, [document.content]);

  // ── Fetch comments ───────────────────────────────────────────────────────────
  const fetchComments = useCallback(async () => {
    try {
      const { data } = await apiClient.get(endpoints.comments.list(projectId), {
        params: { documentId: document.id },
      });
      setComments(data.data?.comments ?? []);
    } catch {
      // silent
    }
  }, [projectId, document.id]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  // ── Post comment ─────────────────────────────────────────────────────────────
  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsPosting(true);
    try {
      await apiClient.post(endpoints.comments.create(projectId), {
        content:    newComment.trim(),
        isInternal: isInternal && !isClient,
        documentId: document.id,
      });
      setNewComment("");
      setIsInternal(false);
      await fetchComments();
    } finally {
      setIsPosting(false);
    }
  };

  // ── Delete comment ───────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    await apiClient.delete(endpoints.comments.delete(projectId, id));
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  // ── PDF Download ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${document.title}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: 'Georgia', serif;
            font-size: 13px;
            line-height: 1.7;
            color: #1a1a1a;
            padding: 48px 60px;
            max-width: 800px;
            margin: 0 auto;
          }
          .doc-header {
            border-bottom: 2px solid #84cc16;
            padding-bottom: 16px;
            margin-bottom: 32px;
          }
          .doc-title { font-size: 24px; font-weight: 700; color: #0f172a; margin-bottom: 6px; }
          .doc-meta  { font-size: 11px; color: #64748b; }
          h1 { font-size: 20px; font-weight: 700; margin: 24px 0 10px; color: #0f172a; }
          h2 { font-size: 17px; font-weight: 600; margin: 20px 0 8px;  color: #0f172a; }
          h3 { font-size: 14px; font-weight: 600; margin: 16px 0 6px;  color: #334155; }
          p  { margin-bottom: 12px; }
          ul, ol { margin: 0 0 12px 20px; }
          li { margin-bottom: 4px; }
          strong { font-weight: 700; }
          em { font-style: italic; }
          code { background: #f1f5f9; padding: 1px 6px; border-radius: 3px; font-family: monospace; font-size: 12px; }
          pre  { background: #f1f5f9; padding: 16px; border-radius: 6px; overflow-x: auto; margin-bottom: 12px; }
          pre code { background: none; padding: 0; }
          blockquote { border-left: 3px solid #84cc16; padding-left: 16px; color: #475569; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
          th { background: #f8fafc; padding: 8px 12px; text-align: left; font-weight: 600; border: 1px solid #e2e8f0; }
          td { padding: 8px 12px; border: 1px solid #e2e8f0; }
          tr:nth-child(even) td { background: #f8fafc; }
          hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
          a  { color: #84cc16; }
          @media print {
            body { padding: 0; }
            .doc-header { page-break-after: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <div class="doc-title">${document.title}</div>
          <div class="doc-meta">
            Version ${document.version} &nbsp;·&nbsp;
            ${userName(document.uploadedBy)} &nbsp;·&nbsp;
            ${new Date(document.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
        <div class="doc-content">
          ${renderedHtml || "<p>No content</p>"}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    // ── FIX 3: height: "100vh" added here ──────────────────────────────────────
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
        flexShrink: 0,
        gap: "12px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <button
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "6px 12px", fontSize: "13px", fontWeight: 500,
              background: "var(--color-bg)", border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: "var(--color-text-secondary)", flexShrink: 0,
            }}
          >
            ← Back
          </button>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {document.title}
            </p>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
              v{document.version} · {userName(document.uploadedBy)} · {new Date(document.updatedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <button
            onClick={handleDownloadPDF}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", fontSize: "12px", fontWeight: 600,
              background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)",
              borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#3b82f6",
            }}
          >
            ↓ Download PDF
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "7px 14px", fontSize: "12px", fontWeight: 600,
              background: showComments ? "var(--color-accent)" : "var(--color-bg)",
              border: `1px solid ${showComments ? "var(--color-accent)" : "var(--color-border)"}`,
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: showComments ? "var(--color-accent-text)" : "var(--color-text-secondary)",
            }}
          >
            💬 Comments {comments.length > 0 && `(${comments.length})`}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── FIX 1 + 2: full width, reduced padding, no centering constraint ── */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px",
        }}>
          <div
            ref={printRef}
            style={{
              width: "100%",
              background: "var(--color-card-bg)",
              border: "1px solid var(--color-card-border)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--color-card-shadow)",
              overflow: "hidden",
            }}
          >
            {/* Doc header */}
            <div style={{
              padding: "32px 40px 24px",
              borderBottom: "3px solid var(--color-accent)",
              background: "var(--color-card-bg)",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "8px" }}>
                {document.type.replace(/_/g, " ")}
              </p>
              <h1 style={{ fontSize: "26px", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.3, marginBottom: "12px" }}>
                {document.title}
              </h1>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Version {document.version}</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{userName(document.uploadedBy)}</span>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {new Date(document.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            </div>

            {/* Doc body */}
            <div
              style={{ padding: "32px 40px" }}
              dangerouslySetInnerHTML={{ __html: renderedHtml || `<p style="color: var(--color-text-muted); font-style: italic;">No content yet.</p>` }}
              className="doc-content"
            />
          </div>
        </div>

        {/* Comments panel */}
        {showComments && (
          <div style={{
            width: "340px",
            borderLeft: "1px solid var(--color-border)",
            background: "var(--color-card-bg)",
            display: "flex", flexDirection: "column",
            flexShrink: 0,
          }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)", flexShrink: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                Comments {comments.length > 0 && <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({comments.length})</span>}
              </p>
              {!isClient && (
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>
                  Internal comments are only visible to the team
                </p>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>No comments yet</p>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                    {isClient ? "Leave feedback on this document" : "Add notes or client feedback"}
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    style={{
                      padding: "10px 12px",
                      background: comment.isInternal ? "rgba(245,158,11,0.06)" : "var(--color-bg)",
                      border: `1px solid ${comment.isInternal ? "rgba(245,158,11,0.2)" : "var(--color-border)"}`,
                      borderRadius: "var(--radius-md)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <CommentAvatar author={comment.author} />
                        <div>
                          <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1 }}>
                            {userName(comment.author)}
                          </p>
                          <p style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{timeAgo(comment.createdAt)}</p>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {comment.isInternal && (
                          <span style={{
                            fontSize: "9px", fontWeight: 700, padding: "1px 6px",
                            borderRadius: "999px", background: "rgba(245,158,11,0.15)",
                            color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em",
                          }}>
                            Internal
                          </span>
                        )}
                        {(comment.author.id === callerId || canManage) && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: "12px", color: "var(--color-text-muted)",
                              padding: "2px 4px", lineHeight: 1,
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                      {comment.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div style={{ padding: "12px 16px", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
              <form onSubmit={handlePost} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={isClient ? "Leave feedback..." : "Add a comment..."}
                  rows={3}
                  style={{
                    width: "100%", padding: "8px 10px",
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "13px", color: "var(--color-text-primary)",
                    outline: "none", resize: "none", boxSizing: "border-box",
                    lineHeight: 1.5,
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "var(--color-accent)"; }}
                  onBlur={(e)  => { e.target.style.borderColor = "var(--color-border)"; }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handlePost(e as any);
                    }
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  {!isClient ? (
                    <label style={{ display: "flex", alignItems: "center", gap: "5px", cursor: "pointer" }}>
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} style={{ accentColor: "#f59e0b" }} />
                      <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>Internal only</span>
                    </label>
                  ) : <span />}
                  <button
                    type="submit"
                    disabled={isPosting || !newComment.trim()}
                    style={{
                      padding: "6px 14px", fontSize: "12px", fontWeight: 600,
                      background: "var(--color-accent)", border: "none",
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                      color: "var(--color-accent-text)",
                      opacity: isPosting || !newComment.trim() ? 0.5 : 1,
                    }}
                  >
                    {isPosting ? "..." : "Post"}
                  </button>
                </div>
                <p style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>⌘ + Enter to post</p>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── Markdown styles ── */}
      <style>{`
        .doc-content h1 { font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin: 28px 0 12px; line-height: 1.3; }
        .doc-content h2 { font-size: 18px; font-weight: 600; color: var(--color-text-primary); margin: 24px 0 10px; line-height: 1.3; padding-bottom: 6px; border-bottom: 1px solid var(--color-border); }
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
        .doc-content blockquote p { margin: 0; color: var(--color-text-secondary); }
        .doc-content table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px; }
        .doc-content th { background: var(--color-bg); padding: 10px 14px; text-align: left; font-weight: 600; color: var(--color-text-primary); border: 1px solid var(--color-border); font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; }
        .doc-content td { padding: 10px 14px; border: 1px solid var(--color-border); color: var(--color-text-secondary); }
        .doc-content tr:nth-child(even) td { background: var(--color-bg); }
        .doc-content hr { border: none; border-top: 1px solid var(--color-border); margin: 24px 0; }
        .doc-content a { color: var(--color-accent); text-decoration: none; }
        .doc-content a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
