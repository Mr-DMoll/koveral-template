"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatAction(action: string, meta: any): { label: string; detail: string | null } {
  const map: Record<string, (m: any) => { label: string; detail: string | null }> = {
    PROJECT_CREATED:        (m) => ({ label: "Created project",           detail: m?.projectName ?? null }),
    PROJECT_UPDATED:        ()  => ({ label: "Updated project",           detail: null }),
    PROJECT_STATUS_CHANGED: (m) => ({ label: "Changed project status",    detail: m?.from && m?.to ? `${m.from} → ${m.to}` : null }),
    MILESTONE_CREATED:      (m) => ({ label: "Created milestone",         detail: m?.title ?? null }),
    MILESTONE_APPROVED:     ()  => ({ label: "Approved milestone",        detail: null }),
    DOCUMENT_CREATED:       (m) => ({ label: "Created document",          detail: m?.title ?? null }),
    INVOICE_STATUS_UPDATED: (m) => ({ label: "Updated invoice status",    detail: m?.newStatus ?? null }),
    INTAKE_CONVERTED:       ()  => ({ label: "Converted intake",          detail: null }),
    PROJECT_DELETED:        (m) => ({ label: "Deleted project",           detail: m?.projectName ?? null }),
  };
  const fn = map[action];
  return fn ? fn(meta) : { label: action.replace(/_/g, " ").toLowerCase(), detail: null };
}

const ACTION_COLOR: Record<string, string> = {
  PROJECT_CREATED:        "#84cc16",
  PROJECT_DELETED:        "#ef4444",
  MILESTONE_APPROVED:     "#22c55e",
  INVOICE_STATUS_UPDATED: "#3b82f6",
  DOCUMENT_CREATED:       "#a855f7",
  PROJECT_STATUS_CHANGED: "#f59e0b",
  INTAKE_CONVERTED:       "#84cc16",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Group logs by date
function groupByDate(logs: any[]) {
  const groups: Record<string, any[]> = {};
  logs.forEach((log) => {
    const key = new Date(log.createdAt).toLocaleDateString("en-ZA", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return groups;
}

// ─── MANAGER ACTIVITY PAGE ────────────────────────────────────────────────────
export function ManagerActivityPage() {
  const [logs,      setLogs]      = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page,      setPage]      = useState(1);
  const [hasMore,   setHasMore]   = useState(false);
  const [total,     setTotal]     = useState(0);
  const [error,     setError]     = useState<string | null>(null);

  const fetchLogs = useCallback(async (p: number, append = false) => {
    try {
      append ? setIsLoadingMore(true) : setIsLoading(true);
      const { data } = await apiClient.get(`/manager/activity?page=${p}`);
      const newLogs  = data.data?.logs ?? [];
      const pagination = data.data?.pagination;

      setLogs((prev) => append ? [...prev, ...newLogs] : newLogs);
      setTotal(pagination?.total ?? 0);
      setHasMore(p < (pagination?.pages ?? 1));
      setPage(p);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load activity.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading activity...</span>
      </div>
    );
  }

  const grouped = groupByDate(logs);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>Activity</h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            Your complete action history
          </p>
        </div>
        {total > 0 && (
          <div style={{
            padding: "6px 14px",
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-card-border)",
            borderRadius: "var(--radius-md)",
          }}>
            <span style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              {total} total actions
            </span>
          </div>
        )}
      </div>

      {error && <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {logs.length === 0 && !error ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No activity yet</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
            Actions you take — creating projects, approving milestones, sending invoices — will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {Object.entries(grouped).map(([date, dayLogs]) => (
            <div key={date}>
              {/* Date header */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  {date}
                </p>
                <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
              </div>

              {/* Log entries */}
              <div style={{
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-card-border)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
              }}>
                {dayLogs.map((log: any, i: number) => {
                  const { label, detail } = formatAction(log.action, log.meta);
                  const dotColor = ACTION_COLOR[log.action] ?? "#94a3b8";
                  return (
                    <div
                      key={log.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "14px",
                        padding: "14px 20px",
                        borderBottom: i < dayLogs.length - 1 ? "1px solid var(--color-border)" : "none",
                      }}
                    >
                      {/* Dot */}
                      <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        background: dotColor, flexShrink: 0, marginTop: "5px",
                      }} />

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                          {label}
                        </p>
                        {detail && (
                          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
                            {detail}
                          </p>
                        )}
                      </div>

                      {/* Time */}
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", flexShrink: 0 }}>
                        {new Date(log.createdAt).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                onClick={() => fetchLogs(page + 1, true)}
                disabled={isLoadingMore}
                style={{
                  padding: "9px 24px", fontSize: "13px", fontWeight: 500,
                  background: "var(--color-card-bg)",
                  border: "1px solid var(--color-card-border)",
                  borderRadius: "var(--radius-md)", cursor: "pointer",
                  color: "var(--color-text-secondary)",
                  opacity: isLoadingMore ? 0.6 : 1,
                }}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
