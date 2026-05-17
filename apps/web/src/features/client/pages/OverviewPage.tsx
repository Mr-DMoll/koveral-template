"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/shared/context/AuthContext";
import apiClient from "@/api/client";

interface DashboardData {
  hasProject:      boolean;
  projects:        any[];
  milestones:      any[];
  pendingInvoices: any[];
  recentComments:  any[];
  stats: {
    totalMilestones: number; approvedMilestones: number;
    progressPct: number; outstandingAmount: number;
    outstandingCount: number; currency: string;
  } | null;
}

function displayName(u: any) {
  return u?.displayName || [u?.firstName, u?.lastName].filter(Boolean).join(" ") || u?.email || "—";
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000); const hours = Math.floor(diff / 3600000); const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now"; if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`; if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

const MILESTONE_STATUS: Record<string, { color: string; label: string }> = {
  PENDING:     { color: "#94a3b8", label: "Pending"     },
  IN_PROGRESS: { color: "#3b82f6", label: "In Progress" },
  SUBMITTED:   { color: "#f59e0b", label: "In Review"   },
  APPROVED:    { color: "#22c55e", label: "Approved"    },
  REJECTED:    { color: "#ef4444", label: "Rejected"    },
};

const STATUS_LABEL: Record<string, string> = {
  INTAKE: "Intake", SCOPE_DRAFT: "Scope Draft", SCOPE_REVIEW: "Scope Review",
  IN_DESIGN: "In Design", DESIGN_REVIEW: "Design Review",
  CONTRACT_DRAFT: "Contract Draft", CONTRACT_REVIEW: "Contract Review",
  ACTIVE: "Active", ON_HOLD: "On Hold", COMPLETE: "Complete", ARCHIVED: "Archived",
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

export function ClientOverviewPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get("/client/dashboard").then((r) => setData(r.data.data)).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
      <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: "13px" }}>Loading your dashboard...</span>
    </div>
  );

  if (!data?.hasProject) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>{greeting()}, {displayName(user)}</h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>Welcome to your client portal</p>
      </div>
      <div style={{ padding: "60px 40px", textAlign: "center", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)" }}>
        <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No project assigned yet</p>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Your project manager will assign your project shortly. You'll be able to track progress, review documents and manage invoices here.</p>
      </div>
    </div>
  );

  const project = data.projects[0];
  const stats   = data.stats!;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>{greeting()}, {displayName(user)}</h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>{project.name}</p>
        </div>
        <button onClick={() => router.push(`/client/projects/${project.id}`)} style={{
          padding: "8px 18px", fontSize: "13px", fontWeight: 600,
          background: "var(--color-accent)", border: "none", borderRadius: "var(--radius-md)",
          cursor: "pointer", color: "var(--color-accent-text)",
        }}>View project →</button>
      </div>

      {/* Outstanding invoice alert */}
      {stats.outstandingCount > 0 && (
        <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "var(--radius-lg)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#ef4444" }}>
            💳 {stats.outstandingCount} invoice{stats.outstandingCount > 1 ? "s" : ""} outstanding — {stats.currency} {stats.outstandingAmount.toLocaleString()}
          </p>
          <button onClick={() => router.push("/client/invoices")} style={{ padding: "5px 14px", fontSize: "12px", fontWeight: 600, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "#ef4444" }}>
            View invoices
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
        {[
          { label: "Overall Progress", value: `${stats.progressPct}%`, color: "#84cc16" },
          { label: "Milestones Done",  value: `${stats.approvedMilestones} / ${stats.totalMilestones}`, color: "var(--color-text-primary)" },
          { label: "Project Status",   value: STATUS_LABEL[project.status] ?? project.status, color: "#3b82f6" },
          { label: "Outstanding",      value: stats.outstandingCount > 0 ? `${stats.currency} ${stats.outstandingAmount.toLocaleString()}` : "All paid", color: stats.outstandingCount > 0 ? "#ef4444" : "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: "16px 20px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--color-card-shadow)" }}>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>{label}</p>
            <p style={{ fontSize: "18px", fontWeight: 600, color, lineHeight: 1.2 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ padding: "20px 24px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)", boxShadow: "var(--color-card-shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>Project Progress</span>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-accent)" }}>{stats.progressPct}%</span>
        </div>
        <div style={{ height: "8px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${stats.progressPct}%`, background: "var(--color-accent)", borderRadius: "999px", transition: "width 0.6s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            {project.startDate ? `Started: ${new Date(project.startDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}` : "Not started"}
          </span>
          <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            {project.deadline ? `Deadline: ${new Date(project.deadline).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}` : "No deadline set"}
          </span>
        </div>
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px" }}>
        {/* Milestones */}
        <Card title="Milestones" action={
          <button onClick={() => router.push(`/client/projects/${project.id}`)} style={{ fontSize: "12px", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer" }}>View project →</button>
        }>
          {data.milestones.length === 0
            ? <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0" }}>No milestones yet</p>
            : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {data.milestones.map((m: any, i: number) => {
                  const ms = MILESTONE_STATUS[m.status] ?? MILESTONE_STATUS.PENDING;
                  return (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: i < data.milestones.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: ms.color, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{m.title}</p>
                        {m.dueDate && <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginTop: "2px" }}>{new Date(m.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</p>}
                      </div>
                      {m.agreedAmount && <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{project.currency} {parseFloat(m.agreedAmount).toLocaleString()}</p>}
                      <span style={{ fontSize: "10px", fontWeight: 500, padding: "2px 8px", borderRadius: "999px", background: `${ms.color}15`, color: ms.color, whiteSpace: "nowrap" }}>{ms.label}</span>
                    </div>
                  );
                })}
              </div>
            )
          }
        </Card>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Manager */}
          <Card title="Your Project Manager">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "50%", background: "rgba(132,204,22,0.15)", border: "1px solid rgba(132,204,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700, color: "var(--color-accent)", overflow: "hidden", flexShrink: 0 }}>
                {project.manager?.avatarUrl
                  ? <img src={project.manager.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : displayName(project.manager).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)
                }
              </div>
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{displayName(project.manager)}</p>
                <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{project.manager?.email}</p>
              </div>
            </div>
          </Card>

          {/* Recent updates */}
          <Card title="Recent Updates" action={
            <button onClick={() => router.push(`/client/projects/${project.id}`)} style={{ fontSize: "12px", color: "var(--color-accent)", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
          }>
            {data.recentComments.length === 0
              ? <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "16px 0" }}>No updates yet</p>
              : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {data.recentComments.map((c: any, i: number) => (
                    <div key={c.id} style={{ padding: "8px 0", borderBottom: i < data.recentComments.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                      <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)" }}>{displayName(c.author)}</p>
                      <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "2px 0", lineHeight: 1.4 }}>{c.content.length > 80 ? `${c.content.slice(0, 80)}...` : c.content}</p>
                      <p style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{timeAgo(c.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )
            }
          </Card>

          {/* Quick links */}
          {(project.repositoryUrl || project.liveSiteUrl || project.figmaUrl) && (
            <Card title="Project Links">
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {project.liveSiteUrl && <a href={project.liveSiteUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--color-accent)", textDecoration: "none" }}>🌐 Live site ↗</a>}
                {project.figmaUrl    && <a href={project.figmaUrl}    target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--color-accent)", textDecoration: "none" }}>🎨 Figma designs ↗</a>}
                {project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer" style={{ fontSize: "13px", color: "var(--color-accent)", textDecoration: "none" }}>💻 Repository ↗</a>}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
