"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProject } from "@/shared/hooks/useProjects";
import { projectService } from "@/shared/services/project.service";
import { useTeamUsers } from "@/shared/hooks/useTeamUsers";
import { MilestonesTab } from "./MilestonesTab";
import { TasksTab } from "./TasksTab";
import { useAuth } from "@/shared/context/AuthContext";
import { DocumentsTab } from "./DocumentsTab";
import { InvoicesTab }  from "./InvoicesTab";
import { AIWorkersPanel } from "./AIWorkersPanel";
import { ChangeRequestsTab } from "./ChangeRequestsTab";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  INTAKE:          { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Intake"          },
  SCOPE_DRAFT:     { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b", label: "Scope Draft"     },
  SCOPE_REVIEW:    { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b", label: "Scope Review"    },
  IN_DESIGN:       { bg: "rgba(59,130,246,0.1)",  color: "#3b82f6", label: "In Design"       },
  DESIGN_REVIEW:   { bg: "rgba(59,130,246,0.1)",  color: "#3b82f6", label: "Design Review"   },
  CONTRACT_DRAFT:  { bg: "rgba(168,85,247,0.1)",  color: "#a855f7", label: "Contract Draft"  },
  CONTRACT_REVIEW: { bg: "rgba(168,85,247,0.1)",  color: "#a855f7", label: "Contract Review" },
  ACTIVE:          { bg: "rgba(132,204,22,0.1)",  color: "#84cc16", label: "Active"          },
  ON_HOLD:         { bg: "rgba(245,158,11,0.1)",  color: "#f59e0b", label: "On Hold"         },
  COMPLETE:        { bg: "rgba(34,197,94,0.1)",   color: "#22c55e", label: "Complete"        },
  ARCHIVED:        { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Archived"        },
};

const STATUS_FLOW = [
  "INTAKE", "SCOPE_DRAFT", "SCOPE_REVIEW",
  "IN_DESIGN", "DESIGN_REVIEW",
  "CONTRACT_DRAFT", "CONTRACT_REVIEW",
  "ACTIVE", "ON_HOLD", "COMPLETE", "ARCHIVED",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function displayName(user: any) {
  return user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email || "—";
}

function initials(user: any) {
  return displayName(user)
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.INTAKE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 12px", borderRadius: "999px",
      fontSize: "12px", fontWeight: 500,
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`,
    }}>
      {s.label}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 32 }: { user: any; size?: number }) {
  return (
    <div style={{
      width: `${size}px`, height: `${size}px`,
      borderRadius: "50%",
      background: user?.avatarUrl ? "transparent" : "rgba(132,204,22,0.15)",
      border: "1px solid rgba(132,204,22,0.3)",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden", flexShrink: 0,
      fontSize: `${Math.floor(size * 0.35)}px`, fontWeight: 700,
      color: "var(--color-accent)",
    }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : initials(user)
      }
    </div>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, link }: { label: string; value: string; link?: boolean }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
      <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" style={{
          fontSize: "13px", color: "var(--color-accent)",
          textDecoration: "none", wordBreak: "break-all",
        }}>
          {value}
        </a>
      ) : (
        <p style={{ fontSize: "13px", color: "var(--color-text-primary)" }}>{value}</p>
      )}
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({ title, children, action }: {
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
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────
function PlaceholderTab({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "80px 40px", textAlign: "center",
      background: "var(--color-card-bg)",
      border: "1px solid var(--color-card-border)",
      borderRadius: "var(--radius-lg)",
    }}>
      <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>
        {label}
      </p>
      <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
        Coming in the next slice
      </p>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ project }: { project: any }) {
  const budget = project.budget ? parseFloat(project.budget) : null;
  const spent  = project.spent  ? parseFloat(project.spent)  : 0;
  const progress = budget && budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Milestones", value: project._count?.milestones ?? 0 },
          { label: "Tasks",      value: project._count?.tasks      ?? 0 },
          { label: "Documents",  value: project._count?.documents  ?? 0 },
          { label: "Invoices",   value: project._count?.invoices   ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{
            padding: "14px 18px",
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-card-border)",
            borderRadius: "var(--radius-md)",
          }}>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ fontSize: "26px", fontWeight: 300, color: "var(--color-text-primary)", lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Project details */}
        <SectionCard title="Project Details">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {project.description && (
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Description</p>
                <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>{project.description}</p>
              </div>
            )}
            <InfoRow label="Start Date" value={project.startDate ? new Date(project.startDate).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }) : ""} />
            <InfoRow label="Deadline"   value={project.deadline  ? new Date(project.deadline).toLocaleDateString("en-ZA",  { day: "numeric", month: "long", year: "numeric" }) : ""} />
            <InfoRow label="Currency"   value={project.currency} />
          </div>
        </SectionCard>

        {/* Financial */}
        <SectionCard title="Budget">
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {budget ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Budget</p>
                    <p style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {project.currency} {budget.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: "11px", color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Spent</p>
                    <p style={{ fontSize: "20px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                      {project.currency} {spent.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Budget utilisation</span>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-accent)" }}>{progress}%</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress}%`, background: "var(--color-accent)", borderRadius: "999px", transition: "width 0.6s ease" }} />
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>No budget set</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Links */}
      {(project.repositoryUrl || project.liveSiteUrl || project.figmaUrl) && (
        <SectionCard title="Links">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
            {project.repositoryUrl && <InfoRow label="Repository" value={project.repositoryUrl} link />}
            {project.liveSiteUrl   && <InfoRow label="Live Site"  value={project.liveSiteUrl}   link />}
            {project.figmaUrl      && <InfoRow label="Figma"      value={project.figmaUrl}      link />}
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ─── TEAM TAB ─────────────────────────────────────────────────────────────────
function TeamTab({ project, canManage, onRefetch }: {
  project:   any;
  canManage: boolean;
  onRefetch: () => void;
}) {
  const { users: allUsers } = useTeamUsers();
  const [showAdd,      setShowAdd]      = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const [memberRole,   setMemberRole]   = useState("");
  const [isAdding,     setIsAdding]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [removing,     setRemoving]     = useState<string | null>(null);

  // Users not already on the project
  const existingIds = new Set([
    project.manager?.id,
    project.client?.id,
    ...project.members.map((m: any) => m.user.id),
  ]);
  const available = allUsers.filter((u) => !existingIds.has(u.id) && u.role !== "CLIENT");

  const handleAdd = async () => {
    if (!selectedUser) return;
    setIsAdding(true); setError(null);
    try {
      await projectService.addMember(project.id, selectedUser, memberRole || undefined);
      setShowAdd(false);
      setSelectedUser(""); setMemberRole("");
      onRefetch();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to add member.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setRemoving(userId);
    try {
      await projectService.removeMember(project.id, userId);
      onRefetch();
    } finally {
      setRemoving(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px", color: "var(--color-text-primary)",
    outline: "none",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Key people */}
      <SectionCard title="Project Manager">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar user={project.manager} size={40} />
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)" }}>{displayName(project.manager)}</p>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{project.manager?.email}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Client">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar user={project.client} size={40} />
          <div>
            <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)" }}>{displayName(project.client)}</p>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{project.client?.email}</p>
          </div>
        </div>
      </SectionCard>

      {/* Team members */}
      <SectionCard
        title={`Team Members (${project.members.length})`}
        action={canManage ? (
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              padding: "5px 12px", fontSize: "12px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}
          >
            + Add Member
          </button>
        ) : undefined}
      >
        {/* Add member form */}
        {showAdd && (
          <div style={{
            marginBottom: "16px", padding: "14px",
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px", alignItems: "end" }}>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>User</p>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                >
                  <option value="">Select user</option>
                  {available.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email} ({u.role.toLowerCase()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "5px" }}>Role on project</p>
                <input
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  placeholder="e.g. Lead Developer"
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <button
                onClick={handleAdd}
                disabled={!selectedUser || isAdding}
                style={{
                  padding: "8px 16px", fontSize: "13px", fontWeight: 600,
                  background: "var(--color-accent)", border: "none",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  color: "var(--color-accent-text)", opacity: !selectedUser || isAdding ? 0.5 : 1,
                  whiteSpace: "nowrap",
                }}
              >
                {isAdding ? "Adding..." : "Add"}
              </button>
            </div>
            {error && <p style={{ fontSize: "12px", color: "#ef4444", marginTop: "8px" }}>{error}</p>}
          </div>
        )}

        {project.members.length === 0 ? (
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", textAlign: "center", padding: "20px 0" }}>
            No team members added yet
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {project.members.map((member: any) => (
              <div
                key={member.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--color-border)",
                }}
                className="last-of-type:border-0"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <Avatar user={member.user} size={32} />
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>
                      {displayName(member.user)}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {member.role || member.user.role.toLowerCase()} · {member.user.email}
                    </p>
                  </div>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemove(member.user.id)}
                    disabled={removing === member.user.id}
                    style={{
                      padding: "3px 10px", fontSize: "11px", fontWeight: 500,
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                      color: "#ef4444", opacity: removing === member.user.id ? 0.5 : 1,
                    }}
                  >
                    {removing === member.user.id ? "..." : "Remove"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── PROJECT DETAIL PAGE ──────────────────────────────────────────────────────

type Tab = "overview" | "tasks" | "team" | "documents" | "milestones" | "invoices" | "changes";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview",   label: "Overview"   },
  { key: "milestones", label: "Milestones" },
  { key: "tasks",      label: "Tasks"      },
  { key: "team",       label: "Team"       },
  { key: "documents",  label: "Documents"  },
  { key: "invoices",   label: "Invoices"   },
  { key: "changes",    label: "Changes" },
];

export function ProjectDetailPage({ id, callerRole, basePath }: {
  id:         string;
  callerRole: string;
  basePath:   string;
}) {
  const router = useRouter();
  const { user } = useAuth();  
  const { project, isLoading, error, refetch } = useProject(id);
  const [activeTab,       setActiveTab]       = useState<Tab>("overview");
  const [changingStatus,  setChangingStatus]  = useState(false);
  const [showStatusMenu,  setShowStatusMenu]  = useState(false);

  const canManage = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);

  const handleStatusChange = async (status: string) => {
    setChangingStatus(true);
    setShowStatusMenu(false);
    try {
      await projectService.updateStatus(id, status);
      await refetch();
    } finally {
      setChangingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading project...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ textAlign: "center", padding: "80px" }}>
        <p style={{ fontSize: "15px", color: "#ef4444", marginBottom: "16px" }}>{error ?? "Project not found."}</p>
        <button onClick={() => router.back()} style={{
          padding: "8px 18px", fontSize: "13px", fontWeight: 500,
          background: "var(--color-bg)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
        }}>← Go back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* ── Header ── */}
      <div style={{
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px 24px",
        marginBottom: "20px",
        boxShadow: "var(--color-card-shadow)",
      }}>
        {/* Back + title row */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
          <div>
            <button
              onClick={() => router.push(`${basePath}/projects`)}
              style={{
                fontSize: "12px", color: "var(--color-text-muted)",
                background: "none", border: "none", cursor: "pointer",
                padding: "0 0 6px 0", display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              ← Projects
            </button>
            <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
              {project.name}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
              Client: {displayName(project.client)} · Manager: {displayName(project.manager)}
            </p>
          </div>

          {/* Status changer */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => canManage && setShowStatusMenu(!showStatusMenu)}
              disabled={changingStatus}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: "none", border: "none", cursor: canManage ? "pointer" : "default",
                padding: 0, opacity: changingStatus ? 0.6 : 1,
              }}
            >
              <StatusBadge status={project.status} />
              {canManage && (
                <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>▾</span>
              )}
            </button>

            {showStatusMenu && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setShowStatusMenu(false)} />
                <div style={{
                  position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 20,
                  background: "var(--color-card-bg)",
                  border: "1px solid var(--color-card-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  minWidth: "160px", overflow: "hidden",
                }}>
                  {STATUS_FLOW.map((s) => {
                    const st = STATUS_STYLE[s];
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        style={{
                          display: "flex", alignItems: "center", gap: "8px",
                          width: "100%", padding: "9px 14px", textAlign: "left",
                          background: project.status === s ? "var(--color-bg)" : "transparent",
                          border: "none", cursor: "pointer", fontSize: "13px",
                          color: project.status === s ? st.color : "var(--color-text-secondary)",
                          fontWeight: project.status === s ? 600 : 400,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--color-bg)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = project.status === s ? "var(--color-bg)" : "transparent"; }}
                      >
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: st.color, flexShrink: 0 }} />
                        {st.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "2px", borderTop: "1px solid var(--color-border)", paddingTop: "16px", marginTop: "4px" }}>
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "6px 14px", fontSize: "13px", fontWeight: 500,
                borderRadius: "var(--radius-sm)", border: "none", cursor: "pointer",
                background: activeTab === key ? "var(--color-accent)" : "transparent",
                color: activeTab === key ? "var(--color-accent-text)" : "var(--color-text-muted)",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === "overview" && (
        <>
          {canManage && (
           <AIWorkersPanel
              projectId={id}
              onDocumentGenerated={() => {
                refetch();
                setActiveTab("milestones");
              }}
            />
          )}
          <OverviewTab project={project} />
        </>
      )}
      
      {activeTab === "team"       && <TeamTab project={project} canManage={canManage} onRefetch={refetch} />}         

      {activeTab === "milestones" && (<MilestonesTab key={`milestones-${activeTab}`} projectId={id} callerRole={callerRole} />)}
      {activeTab === "tasks" && (<TasksTab projectId={id} callerRole={callerRole} callerId={user?.id ?? ""} projectMembers={project.members}/>)}

      {activeTab === "documents" && (<DocumentsTab projectId={id} callerRole={callerRole} /> )}
      {activeTab === "invoices" && (<InvoicesTab projectId={id} callerRole={callerRole} clientId={project.client.id}/>)}

      {activeTab === "changes" && (<ChangeRequestsTab projectId={id} callerRole={callerRole} />)}
    </div>
  );
}
