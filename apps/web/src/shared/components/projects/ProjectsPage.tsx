"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/shared/hooks/useProjects";
import { useTeamUsers } from "@/shared/hooks/useTeamUsers";
import { projectService } from "@/shared/services/project.service";
import type { CreateProjectData } from "@/shared/services/project.service";
import { PageHeader } from "@/shared/components/ui/UIComponents";

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

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.INTAKE;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: "999px",
      fontSize: "11px", fontWeight: 500,
      background: s.bg, color: s.color,
      border: `1px solid ${s.color}30`,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────
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

// ─── Modal shell ──────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "560px",
        maxHeight: "90vh", overflowY: "auto",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "18px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form actions ─────────────────────────────────────────────────────────────
function FormActions({ onClose, isSubmitting, submitLabel }: {
  onClose: () => void; isSubmitting: boolean; submitLabel: string;
}) {
  return (
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
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}

// ─── Shared project fields ────────────────────────────────────────────────────
function ProjectFields({ form, set }: {
  form: Record<string, string>;
  set:  (k: string, v: string) => void;
}) {
  return (
    <>
      <div>
        <label style={labelStyle}>Project Name *</label>
        <input style={inputStyle} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="E-commerce Platform" required />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Brief project description..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Budget</label>
          <input style={inputStyle} type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0.00" min="0" />
        </div>
        <div>
          <label style={labelStyle}>Currency</label>
          <select style={inputStyle} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            <option value="ZAR">ZAR</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input style={inputStyle} type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Deadline</label>
          <input style={inputStyle} type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Repository URL</label>
        <input style={inputStyle} type="url" value={form.repositoryUrl} onChange={(e) => set("repositoryUrl", e.target.value)} placeholder="https://github.com/..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Live Site URL</label>
          <input style={inputStyle} type="url" value={form.liveSiteUrl} onChange={(e) => set("liveSiteUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label style={labelStyle}>Figma URL</label>
          <input style={inputStyle} type="url" value={form.figmaUrl} onChange={(e) => set("figmaUrl", e.target.value)} placeholder="https://figma.com/..." />
        </div>
      </div>
    </>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────────
function CreateProjectModal({ onClose, onCreate, callerRole }: {
  onClose:    () => void;
  onCreate:   (data: CreateProjectData) => Promise<void>;
  callerRole: string;
}) {
  const { users: clients }  = useTeamUsers("CLIENT");
  const { users: managers } = useTeamUsers("MANAGER");

  const [form, setForm] = useState({
    name: "", description: "", clientId: "", managerId: "",
    budget: "", currency: "ZAR", startDate: "", deadline: "",
    repositoryUrl: "", liveSiteUrl: "", figmaUrl: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    try {
      await onCreate({
        name:          form.name,
        description:   form.description   || undefined,
        clientId:      form.clientId,
        managerId:     form.managerId     || undefined,
        budget:        form.budget        ? parseFloat(form.budget) : undefined,
        currency:      form.currency,
        startDate:     form.startDate     || undefined,
        deadline:      form.deadline      || undefined,
        repositoryUrl: form.repositoryUrl || undefined,
        liveSiteUrl:   form.liveSiteUrl   || undefined,
        figmaUrl:      form.figmaUrl      || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create project.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell title="Create Project" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        {/* Client */}
        <div>
          <label style={labelStyle}>Client *</label>
          <select style={inputStyle} value={form.clientId} onChange={(e) => set("clientId", e.target.value)} required>
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName || [c.firstName, c.lastName].filter(Boolean).join(" ") || c.email}
              </option>
            ))}
          </select>
        </div>

        {/* Manager — only for ADMIN/SUPER_ADMIN */}
        {(callerRole === "ADMIN" || callerRole === "SUPER_ADMIN") && (
          <div>
            <label style={labelStyle}>Manager</label>
            <select style={inputStyle} value={form.managerId} onChange={(e) => set("managerId", e.target.value)}>
              <option value="">Select a manager</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName || [m.firstName, m.lastName].filter(Boolean).join(" ") || m.email}
                </option>
              ))}
            </select>
          </div>
        )}

        <ProjectFields form={form} set={set} />

        {error && (
          <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            {error}
          </p>
        )}

        <FormActions onClose={onClose} isSubmitting={isSubmitting} submitLabel="Create Project" />
      </form>
    </ModalShell>
  );
}

// ─── Edit Project Modal ───────────────────────────────────────────────────────
function EditProjectModal({ project, onClose, onSave }: {
  project: any;
  onClose: () => void;
  onSave:  (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name:          project.name          ?? "",
    description:   project.description   ?? "",
    budget:        project.budget        ? parseFloat(project.budget).toString() : "",
    currency:      project.currency      ?? "ZAR",
    startDate:     project.startDate     ? project.startDate.split("T")[0]  : "",
    deadline:      project.deadline      ? project.deadline.split("T")[0]   : "",
    repositoryUrl: project.repositoryUrl ?? "",
    liveSiteUrl:   project.liveSiteUrl   ?? "",
    figmaUrl:      project.figmaUrl      ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true); setError(null);
    try {
      await onSave({
        name:          form.name,
        description:   form.description   || undefined,
        budget:        form.budget        ? parseFloat(form.budget) : undefined,
        currency:      form.currency,
        startDate:     form.startDate     || undefined,
        deadline:      form.deadline      || undefined,
        repositoryUrl: form.repositoryUrl || undefined,
        liveSiteUrl:   form.liveSiteUrl   || undefined,
        figmaUrl:      form.figmaUrl      || undefined,
      });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to update project.");
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell title="Edit Project" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <ProjectFields form={form} set={set} />

        {error && (
          <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            {error}
          </p>
        )}

        <FormActions onClose={onClose} isSubmitting={isSubmitting} submitLabel="Save Changes" />
      </form>
    </ModalShell>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ project, onClick, onEdit }: {
  project: any;
  onClick: () => void;
  onEdit:  (project: any) => void;
}) {
  const managerName = project.manager?.displayName ||
    [project.manager?.firstName, project.manager?.lastName].filter(Boolean).join(" ") ||
    project.manager?.email;

  const clientName = project.client?.displayName ||
    [project.client?.firstName, project.client?.lastName].filter(Boolean).join(" ") ||
    project.client?.email;

  return (
    <div
      onClick={onClick}
     style={{
        padding: "24px 28px",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--color-card-shadow)",
        cursor: "pointer",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(132,204,22,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-card-border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "var(--color-card-shadow)";
      }}
    >
      {/* Header Segment — Title + Status Badge */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
        <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.2, margin: 0 }}>
          {project.name}
        </h3>
        <div style={{ flexShrink: 0 }}>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Description Segment — Strictly clamped to 2 lines with text-truncation ellipsis */}
      {project.description && (
        <p style={{
          fontSize: "13px", 
          color: "var(--color-text-secondary)",
          lineHeight: "1.5",
          margin: 0,
          overflow: "hidden", 
          textOverflow: "ellipsis",
          display: "-webkit-box", 
          WebkitLineClamp: 2, 
          WebkitBoxOrient: "vertical",
        }}>
          {project.description}
        </p>
      )}

      {/* Stakeholders Info Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "2px 0" }}>
        <div style={{ fontSize: "13px", display: "flex", gap: "16px" }}>
          <span style={{ color: "var(--color-text-muted)", width: "60px", flexShrink: 0 }}>Client:</span>
          <span style={{ color: "var(--color-text-secondary)" }}>{clientName}</span>
        </div>
        {managerName && (
          <div style={{ fontSize: "13px", display: "flex", gap: "16px" }}>
            <span style={{ color: "var(--color-text-muted)", width: "60px", flexShrink: 0 }}>Manager:</span>
            <span style={{ color: "var(--color-text-secondary)" }}>{managerName}</span>
          </div>
        )}
      </div>

      {/* Stats Box Grid Section */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)", 
        gap: "12px", 
        background: "rgba(255, 255, 255, 0.02)", 
        padding: "12px 16px", 
        borderRadius: "var(--radius-md)",
        margin: "2px 0"
      }}>
        {[
          { label: "Milestones", value: project._count?.milestones ?? 0 },
          { label: "Tasks",      value: project._count?.tasks      ?? 0 },
          { label: "Docs",       value: project._count?.documents  ?? 0 },
          { label: "Invoices",   value: project._count?.invoices   ?? 0 },
        ].map(({ label, value }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-muted)" }}>
              {label}
            </span>
            <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Subtle Divider Line */}
      <div style={{ borderTop: "1px solid var(--color-border)", opacity: 0.4, marginTop: "2px" }} />

      {/* Footer — Financial Metrics and Edit Buttons fully split on left/right wings */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {project.budget && (
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {project.currency} {parseFloat(project.budget).toLocaleString()}
            </span>
          )}
          {project.deadline && (
            <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
              Due {new Date(project.deadline).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onEdit(project); }}
          style={{
            padding: "6px 14px", 
            fontSize: "12px", 
            fontWeight: 500,
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            cursor: "pointer", 
            color: "var(--color-text-muted)",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-primary)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-text-muted)";
            (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.05)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-text-muted)";
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLElement).style.background = "rgba(255, 255, 255, 0.02)";
          }}
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── PROJECTS PAGE ────────────────────────────────────────────────────────────
export function ProjectsPage({ callerRole, basePath }: {
  callerRole: string;
  basePath:   string;
}) {
  const router = useRouter();
  const { projects, isLoading, error, createProject, refetch } = useProjects();
  const [showCreate,      setShowCreate]      = useState(false);
  const [editingProject,  setEditingProject]  = useState<any | null>(null);
  const [search,          setSearch]          = useState("");

  const canCreate = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);

  const filtered = projects.filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const active   = projects.filter((p) => p.status === "ACTIVE").length;
  const inDesign = projects.filter((p) => ["IN_DESIGN", "DESIGN_REVIEW"].includes(p.status)).length;
  const complete = projects.filter((p) => p.status === "COMPLETE").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Projects"
        subtitle="All projects you manage or are assigned to"
        action={canCreate ? (
          <button onClick={() => setShowCreate(true)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 18px", fontSize: "13px", fontWeight: 600,
            background: "var(--color-accent)", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            color: "var(--color-accent-text)",
          }}>
            + New Project
          </button>
        ) : undefined}
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {[
          { label: "Total",     value: projects.length, color: "var(--color-text-primary)" },
          { label: "Active",    value: active,          color: "#84cc16" },
          { label: "In Design", value: inDesign,        color: "#3b82f6" },
          { label: "Complete",  value: complete,        color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            padding: "14px 18px",
            background: "var(--color-card-bg)",
            border: "1px solid var(--color-card-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--color-card-shadow)",
          }}>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p style={{ fontSize: "26px", fontWeight: 300, color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search projects..."
        style={{
          width: "100%", padding: "9px 14px",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px", color: "var(--color-text-primary)",
          outline: "none", boxSizing: "border-box",
        }}
      />

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px", color: "var(--color-text-muted)" }}>
          <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <span style={{ fontSize: "13px" }}>Loading projects...</span>
        </div>
      ) : error ? (
        <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center", padding: "40px" }}>{error}</p>
      ) : filtered.length === 0 ? (
        <div style={{
          padding: "60px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>
            {search ? "No projects match your search" : "No projects yet"}
          </p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            {search ? "Try a different search term" : "Create your first project to get started"}
          </p>
          {canCreate && !search && (
            <button onClick={() => setShowCreate(true)} style={{
              padding: "9px 20px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>
              Create first project
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "10px" }}>
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => router.push(`${basePath}/projects/${project.id}`)}
              onEdit={(p) => setEditingProject(p)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreate={createProject}
          callerRole={callerRole}
        />
      )}

      {/* Edit modal */}
      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={() => setEditingProject(null)}
          onSave={async (data) => {
            await projectService.update(editingProject.id, data);
            await refetch();
            setEditingProject(null);
          }}
        />
      )}
    </div>
  );
}




