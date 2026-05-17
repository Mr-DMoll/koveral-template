"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/AuthContext";
import apiClient from "@/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  stats: {
    totalProjects:    number;
    activeProjects:   number;
    totalTeamMembers: number;
    openTasks:        number;
    overdueTasks:     number;
    pendingApprovals: number;
  };
  projects:          any[];
  pendingMilestones: any[];
  upcomingDeadlines: any[];
  recentActivity:    any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayName(u: any) {
  return u?.displayName ||
    [u?.firstName, u?.lastName].filter(Boolean).join(" ") ||
    u?.email || "—";
}

function timeAgo(date: string) {
  const diff  = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function formatAction(action: string, meta: any): string {
  const map: Record<string, (m: any) => string> = {
    PROJECT_CREATED:        (m) => `Created project "${m?.projectName ?? ""}"`,
    PROJECT_UPDATED:        ()  => `Updated a project`,
    PROJECT_STATUS_CHANGED: (m) => `Changed project status to ${m?.to ?? ""}`,
    MILESTONE_CREATED:      (m) => `Created milestone "${m?.title ?? ""}"`,
    MILESTONE_APPROVED:     ()  => `Approved a milestone`,
    DOCUMENT_CREATED:       (m) => `Created document "${m?.title ?? ""}"`,
    INVOICE_STATUS_UPDATED: (m) => `Updated invoice status to ${m?.newStatus ?? ""}`,
    INTAKE_CONVERTED:       ()  => `Converted intake to project`,
  };
  const fn = map[action];
  return fn ? fn(meta) : action.replace(/_/g, " ").toLowerCase();
}

const STATUS_COLOR: Record<string, string> = {
  INTAKE: "#94a3b8", SCOPE_DRAFT: "#f59e0b", SCOPE_REVIEW: "#f59e0b",
  IN_DESIGN: "#3b82f6", DESIGN_REVIEW: "#3b82f6",
  CONTRACT_DRAFT: "#a855f7", CONTRACT_REVIEW: "#a855f7",
  ACTIVE: "#84cc16", ON_HOLD: "#f59e0b", COMPLETE: "#22c55e", ARCHIVED: "#94a3b8",
};

const STATUS_LABEL: Record<string, string> = {
  INTAKE: "Intake", SCOPE_DRAFT: "Scope Draft", SCOPE_REVIEW: "Scope Review",
  IN_DESIGN: "In Design", DESIGN_REVIEW: "Design Review",
  CONTRACT_DRAFT: "Contract Draft", CONTRACT_REVIEW: "Contract Review",
  ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETE: "Complete", ARCHIVED: "Archived",
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, alert }: {
  label: string; value: number; sub?: string; color?: string; alert?: boolean;
}) {
  return (
    <div style={{
      padding: "16px 20px",
      background: "var(--color-card-bg)",
      border: `1px solid ${alert && value > 0 ? "rgba(239,68,68,0.3)" : "var(--color-card-border)"}`,
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--color-card-shadow)",
    }}>
      <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
        {label}
      </p>
      <p style={{ fontSize: "30px", fontWeight: 300, color: color ?? "var(--color-text-primary)", lineHeight: 1 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: "12px", color: alert && value > 0 ? "#ef4444" : "var(--color-text-muted)", marginTop: "4px" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--color-card-bg)",
      border: "1px solid var(--color-card-border)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--color-card-shadow)",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid var(--color-border)",
      }}>
        <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</h3>
        {action}
      </div>
      <div style={{ padding: "16px 20px" }}>{children}</div>
    </div>
  );
}

// ─── MANAGER OVERVIEW PAGE ────────────────────────────────────────────────────
export function ManagerOverviewPage() {
  const router   = useRouter();
  const { user } = useAuth();
  const [data,      setData]      = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/manager/dashboard")
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading dashboard...</span>
      </div>
    );
  }

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

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        <StatCard label="My Projects"       value={s?.totalProjects    ?? 0} sub={`${s?.activeProjects ?? 0} active`} color="#84cc16" />
        <StatCard label="Team Members"      value={s?.totalTeamMembers ?? 0} />
        <StatCard label="Open Tasks"        value={s?.openTasks        ?? 0} sub={s?.overdueTasks ? `${s.overdueTasks} overdue` : undefined} alert={(s?.overdueTasks ?? 0) > 0} />
        <StatCard label="Pending Approvals" value={s?.pendingApprovals ?? 0} sub="Milestones to review" color={(s?.pendingApprovals ?? 0) > 0 ? "#f59e0b" : undefined} />
      </div>

      {/* Pending approvals alert */}
      {(data?.pendingMilestones?.length ?? 0) > 0 && (
        <div style={{
          padding: "14px 18px",
          background: "rgba(245,158,11,0.06)",
          border: "1px solid rgba(245,158,11,0.25)",
          borderRadius: "var(--radius-lg)",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#f59e0b" }}>
            ⏳ {data!.pendingMilestones.length} milestone{data!.pendingMilestones.length > 1 ? "s" : ""} waiting for your approval
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {data!.pendingMilestones.map((m: any) => (
              <div
                key={m.id}
                onClick={() => router.push(`/manager/projects/${m.project.id}`)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--color-card-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                }}
              >
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{m.title}</p>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{m.project.name}</p>
                </div>
                {m.agreedAmount && (
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-accent)" }}>
                    ZAR {parseFloat(m.agreedAmount).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
        {/* Projects list */}
        <Card
          title="My Projects"
          action={
            <button onClick={() => router.push("/manager/projects")} style={{
              fontSize: "12px", color: "var(--color-accent)",
              background: "none", border: "none", cursor: "pointer",
            }}>View all →</button>
          }
        >
          {(data?.projects?.length ?? 0) === 0 ? (
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0" }}>No projects yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {data!.projects.map((p: any, i: number) => {
                const color  = STATUS_COLOR[p.status] ?? "#94a3b8";
                const label  = STATUS_LABEL[p.status] ?? p.status;
                const budget = p.budget ? parseFloat(p.budget) : null;
                const spent  = p.spent  ? parseFloat(p.spent)  : 0;
                const pct    = budget   ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => router.push(`/manager/projects/${p.id}`)}
                    style={{
                      padding: "12px 0",
                      borderBottom: i < data!.projects.length - 1 ? "1px solid var(--color-border)" : "none",
                      cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>{p.name}</p>
                      <span style={{
                        fontSize: "10px", fontWeight: 600, padding: "2px 8px",
                        borderRadius: "999px", background: `${color}15`, color,
                      }}>
                        {label}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {displayName(p.client)}
                      {p.deadline && ` · Due ${new Date(p.deadline).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
                    </p>
                    {budget && (
                      <div style={{ height: "3px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-accent)", borderRadius: "999px" }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Upcoming deadlines */}
          <Card title="Upcoming Deadlines">
            {(data?.upcomingDeadlines?.length ?? 0) === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>
                No deadlines in the next 14 days
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data!.upcomingDeadlines.map((p: any, i: number) => {
                  const daysLeft = Math.ceil((new Date(p.deadline).getTime() - Date.now()) / 86400000);
                  const urgency  = daysLeft <= 3 ? "#ef4444" : daysLeft <= 7 ? "#f59e0b" : "#22c55e";
                  return (
                    <div
                      key={p.id}
                      onClick={() => router.push(`/manager/projects/${p.id}`)}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "10px 0", cursor: "pointer",
                        borderBottom: i < data!.upcomingDeadlines.length - 1 ? "1px solid var(--color-border)" : "none",
                      }}
                    >
                      <div>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{p.name}</p>
                        <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{displayName(p.client)}</p>
                      </div>
                      <span style={{
                        fontSize: "11px", fontWeight: 700,
                        color: urgency, background: `${urgency}15`,
                        padding: "2px 8px", borderRadius: "999px",
                      }}>
                        {daysLeft}d left
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Recent activity */}
          <Card
            title="Recent Activity"
            action={
              <button onClick={() => router.push("/manager/activity")} style={{
                fontSize: "12px", color: "var(--color-accent)",
                background: "none", border: "none", cursor: "pointer",
              }}>View all →</button>
            }
          >
            {(data?.recentActivity?.length ?? 0) === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>No activity yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data!.recentActivity.slice(0, 6).map((log: any, i: number) => (
                  <div
                    key={log.id}
                    style={{
                      padding: "8px 0",
                      borderBottom: i < 5 ? "1px solid var(--color-border)" : "none",
                      display: "flex", flexDirection: "column", gap: "2px",
                    }}
                  >
                    <p style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                      {formatAction(log.action, log.meta)}
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{timeAgo(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
