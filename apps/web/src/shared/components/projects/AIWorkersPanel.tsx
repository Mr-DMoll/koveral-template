"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";

interface WorkerStatus {
  canRunScope:    boolean;
  canRunContract: boolean;
  canRunTasks:    boolean;
  canRunHandover: boolean;
  hasScope:       boolean;
  hasContract:    boolean;
  hasHandover:    boolean;
  hasTasks:       boolean;
  hasIntake:      boolean;
  projectStatus:  string;
}

interface Worker {
  key:         "scope" | "contract" | "tasks" | "handover";
  title:       string;
  description: string;
  doneDesc:    string;
  canRun:      keyof WorkerStatus;
  hasDone:     keyof WorkerStatus | null;
  accentColor: string;
  lockedMsg:   string;
}

const WORKERS: Worker[] = [
  {
    key:         "scope",
    title:       "Scope Document",
    description: "Generate from intake form — objectives, milestones, tech stack, risks",
    doneDesc:    "Regenerate from intake form data",
    canRun:      "canRunScope",
    hasDone:     "hasScope",
    accentColor: "#84cc16",
    lockedMsg:   "Not available at current project status",
  },
  {
    key:         "contract",
    title:       "Service Contract",
    description: "Generate from approved scope — payment terms, IP, liability",
    doneDesc:    "Regenerate from approved scope",
    canRun:      "canRunContract",
    hasDone:     "hasContract",
    accentColor: "#a855f7",
    lockedMsg:   "Generate scope first",
  },
  {
    key:         "tasks",
    title:       "Milestones & Tasks",
    description: "Auto-generate milestones and tasks from scope document",
    doneDesc:    "Regenerate milestones and tasks",
    canRun:      "canRunTasks",
    hasDone:     "hasTasks",
    accentColor: "#3b82f6",
    lockedMsg:   "Generate scope first",
  },
  {
    key:         "handover",
    title:       "Handover Document",
    description: "Generate project handover with credentials, deployment guide, and maintenance notes",
    doneDesc:    "Regenerate handover document",
    canRun:      "canRunHandover",
    hasDone:     "hasHandover",
    accentColor: "#22c55e",
    lockedMsg:   "Available when project is Active or Complete",
  },
];

export function AIWorkersPanel({ projectId, onDocumentGenerated }: {
  projectId:           string;
  onDocumentGenerated: () => void;
}) {
  const [status,  setStatus]  = useState<WorkerStatus | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/projects/${projectId}/workers/status`);
      setStatus(data.data);
    } catch { /* silent */ }
  }, [projectId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const runWorker = async (worker: Worker["key"]) => {
    setRunning(worker); setError(null); setSuccess(null);
    try {
      const { data } = await apiClient.post(`/projects/${projectId}/workers/${worker}`);
      const messages: Record<string, string> = {
        scope:    "Scope document generated. Review it in the Documents tab.",
        contract: "Contract generated. Review it in the Documents tab.",
        tasks:    `${data.message} Review in the Milestones and Tasks tabs.`,
        handover: "Handover document generated. Review it in the Documents tab.",
      };
      setSuccess(messages[worker] ?? "Done.");
      await fetchStatus();
      onDocumentGenerated();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? `Failed to run ${worker} worker.`);
    } finally {
      setRunning(null);
    }
  };

  if (!status) return null;

  const anyAvailable = WORKERS.some(
    (w) => status[w.canRun] || (w.hasDone && status[w.hasDone as keyof WorkerStatus])
  );
  if (!anyAvailable) return null;

  return (
    <div style={{
      padding: "16px 20px",
      background: "rgba(132,204,22,0.04)",
      border: "1px solid rgba(132,204,22,0.15)",
      borderRadius: "var(--radius-lg)",
      display: "flex", flexDirection: "column", gap: "12px",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "28px", height: "28px", borderRadius: "6px",
          background: "rgba(132,204,22,0.12)",
          border: "1px solid rgba(132,204,22,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "14px",
        }}>◈</div>
        <div>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            AI Automation
          </p>
          <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
            Generate professional documents and tasks instantly
          </p>
        </div>
      </div>

      {/* Worker cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {WORKERS.map((w) => {
          const canRun    = status[w.canRun] as boolean;
          const hasDone   = w.hasDone ? status[w.hasDone as keyof WorkerStatus] as boolean : false;
          const isRunning = running === w.key;

          return (
            <div
              key={w.key}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 14px",
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-card-border)",
                borderRadius: "var(--radius-md)",
                gap: "12px",
                opacity: !canRun && !hasDone ? 0.5 : 1,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                    {w.title}
                  </p>
                  {hasDone && (
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "1px 7px",
                      borderRadius: "999px", background: "rgba(34,197,94,0.1)",
                      color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)",
                    }}>
                      Generated
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                  {hasDone ? w.doneDesc : w.description}
                </p>
              </div>

              {canRun ? (
                <button
                  onClick={() => runWorker(w.key)}
                  disabled={isRunning || !!running}
                  style={{
                    padding: "7px 16px", fontSize: "12px", fontWeight: 600,
                    background: isRunning
                      ? `${w.accentColor}30`
                      : hasDone
                        ? "var(--color-bg)"
                        : `${w.accentColor}20`,
                    border: `1px solid ${w.accentColor}40`,
                    borderRadius: "var(--radius-sm)",
                    cursor: isRunning || !!running ? "not-allowed" : "pointer",
                    color: w.accentColor, whiteSpace: "nowrap",
                    display: "flex", alignItems: "center", gap: "6px",
                    flexShrink: 0,
                    opacity: !!running && !isRunning ? 0.5 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {isRunning ? (
                    <>
                      <div style={{
                        width: "10px", height: "10px",
                        border: `2px solid ${w.accentColor}40`,
                        borderTopColor: w.accentColor,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                      }} />
                      Generating...
                    </>
                  ) : (
                    hasDone ? "↺ Regenerate" : "✦ Generate"
                  )}
                </button>
              ) : (
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {w.lockedMsg}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Success */}
      {success && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(34,197,94,0.08)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <p style={{ fontSize: "12px", color: "#22c55e" }}>✓ {success}</p>
          <button onClick={() => setSuccess(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#22c55e", fontSize: "14px" }}>✕</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          padding: "10px 14px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: "var(--radius-sm)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
        }}>
          <p style={{ fontSize: "12px", color: "#ef4444" }}>{error}</p>
          <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "14px" }}>✕</button>
        </div>
      )}

      {!status.hasIntake && (
        <p style={{ fontSize: "11px", color: "var(--color-text-muted)", fontStyle: "italic" }}>
          ℹ No intake form linked. Workers will use project description as context.
        </p>
      )}
    </div>
  );
}
