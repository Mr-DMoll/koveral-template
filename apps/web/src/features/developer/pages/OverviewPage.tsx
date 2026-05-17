"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/AuthContext";
import apiClient from "@/api/client";

interface DashboardData {
  stats: {
    assignedProjects: number; openTasks: number;
    completedToday: number; inReview: number;
    overdueCount: number; dueTodayCount: number;
  };
  projects: any[];
  myTasks:  any[];
}

function displayName(u: any) {
  return u?.displayName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "—";
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#94a3b8", MEDIUM: "#3b82f6", HIGH: "#f59e0b", CRITICAL: "#ef4444",
};
const STATUS_COLOR: Record<string, string> = {
  BACKLOG: "#94a3b8", TODO: "#3b82f6", IN_PROGRESS: "#f59e0b", REVIEW: "#a855f7", DONE: "#22c55e",
};
const STATUS_LABEL: Record<string, string> = {
  BACKLOG: "Backlog", TODO: "To Do", IN_PROGRESS: "In Progress", REVIEW: "Review", DONE: "Done",
};

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--color-card-shadow)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1px solid var(--color-border)" }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

export function DeveloperOverviewPage() {
  const router   = useRouter();
  const { user } = useAuth();
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/developer/dashboard")
      .then((r) => setData(r.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  };

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
      <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: "13px" }}>Loading your dashboard...</span>
    </div>
  );

  const s = data?.stats;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>
          {greeting()}, {displayName(user)}
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
          {new Date().toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Overdue alert */}
      {(s?.overdueCount ?? 0) > 0 && (
        <div style={{ padding: "12px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>
            ⚠ {s!.overdueCount} overdue task{s!.overdueCount > 1 ? "s" : ""} — action these first
          </p>
          <button onClick={() => router.push("/developer/tasks")} style={{ padding: "5px 14px", fontSize: "12px", fontWeight: 600, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ef4444" }}>
            View tasks
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        {[
          { label: "Assigned Projects", value: s?.assignedProjects ?? 0, color: "#84cc16",   sub: undefined },
          { label: "Open Tasks",        value: s?.openTasks        ?? 0, color: (s?.overdueCount ?? 0) > 0 ? "#ef4444" : "var(--color-text-primary)", sub: s?.dueTodayCount ? `${s.dueTodayCount} due today` : undefined },
          { label: "Completed Today",   value: s?.completedToday   ?? 0, color: "#22c55e",   sub: "Keep it up" },
          { label: "In Review",         value: s?.inReview         ?? 0, color: "#a855f7",   sub: "Awaiting feedback" },
        ].map(({ label, value, color, sub }) => (
          <div key={label} style={{ padding: "16px 20px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--color-card-shadow)" }}>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{label}</p>
            <p style={{ fontSize: "30px", fontWeight: 300, color, lineHeight: 1 }}>{value}</p>
            {sub && <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
        {/* Tasks */}
        <Card title="My Tasks" action={
          <button onClick={() => router.push("/developer/tasks")} style={{ fontSize: "12px", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
        }>
          {(data?.myTasks?.length ?? 0) === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0" }}>No open tasks — great work!</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data!.myTasks.slice(0, 8).map((t: any, i: number) => {
                const pColor    = PRIORITY_COLOR[t.priority] ?? "#94a3b8";
                const stColor   = STATUS_COLOR[t.status]     ?? "#94a3b8";
                const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
                return (
                  <div
                    key={t.id}
                    onClick={() => router.push(`/developer/projects/${t.project.id}`)}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: i < Math.min(data!.myTasks.length, 8) - 1 ? "1px solid var(--color-border)" : "none", cursor: "pointer" }}
                  >
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: pColor, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</p>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "1px" }}>{t.project.name}{t.milestone ? ` · ${t.milestone.title}` : ""}</p>
                    </div>
                    {t.dueDate && (
                      <span style={{ fontSize: "11px", color: isOverdue ? "#ef4444" : "var(--color-text-muted)", fontWeight: isOverdue ? 600 : 400, whiteSpace: "nowrap" }}>
                        {isOverdue ? "⚠ " : ""}{new Date(t.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "999px", background: `${stColor}15`, color: stColor, whiteSpace: "nowrap" }}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Projects */}
          <Card title="My Projects" action={
            <button onClick={() => router.push("/developer/projects")} style={{ fontSize: "12px", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
          }>
            {(data?.projects?.length ?? 0) === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>Not assigned to any projects yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data!.projects.map((p: any, i: number) => (
                  <div key={p.id} onClick={() => router.push(`/developer/projects/${p.id}`)} style={{ padding: "10px 0", borderBottom: i < data!.projects.length - 1 ? "1px solid var(--color-border)" : "none", cursor: "pointer" }}>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "3px" }}>{p.name}</p>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                      {displayName(p.manager)}{p.deadline && ` · Due ${new Date(p.deadline).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
                    </p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{p._count.tasks} tasks</span>
                      <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{p._count.milestones} milestones</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Today's focus */}
          <div style={{ padding: "16px 20px", background: "rgba(132,204,22,0.06)", border: "1px solid rgba(132,204,22,0.2)", borderRadius: "var(--radius-lg)" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-accent)", marginBottom: "8px" }}>Today's Focus</p>
            {(s?.dueTodayCount ?? 0) === 0 && (s?.overdueCount ?? 0) === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
                {(s?.completedToday ?? 0) > 0 ? `Great — ${s!.completedToday} task${s!.completedToday > 1 ? "s" : ""} completed today!` : "No tasks due today. Pick something from your backlog."}
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                {(s?.overdueCount ?? 0) > 0 && <p style={{ fontSize: "13px", color: "#ef4444" }}>• {s!.overdueCount} overdue task{s!.overdueCount > 1 ? "s" : ""} need attention</p>}
                {(s?.dueTodayCount ?? 0) > 0 && <p style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>• {s!.dueTodayCount} task{s!.dueTodayCount > 1 ? "s" : ""} due today</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
