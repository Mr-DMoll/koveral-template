"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskUser {
  id:          string;
  firstName:   string | null;
  lastName:    string | null;
  displayName: string | null;
  email:       string;
  avatarUrl:   string | null;
}

interface Task {
  id:          string;
  title:       string;
  description: string | null;
  status:      string;
  priority:    string;
  dueDate:     string | null;
  completedAt: string | null;
  assignee:    TaskUser | null;
  createdBy:   TaskUser;
  milestone:   { id: string; title: string } | null;
}

interface Milestone {
  id:    string;
  title: string;
}

// ─── Kanban columns ───────────────────────────────────────────────────────────
const COLUMNS: { key: string; label: string; color: string }[] = [
  { key: "BACKLOG",     label: "Backlog",     color: "#94a3b8" },
  { key: "TODO",        label: "To Do",       color: "#3b82f6" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#f59e0b" },
  { key: "REVIEW",      label: "Review",      color: "#a855f7" },
  { key: "DONE",        label: "Done",        color: "#22c55e" },
];

// ─── Priority config ──────────────────────────────────────────────────────────
const PRIORITY: Record<string, { color: string; label: string }> = {
  LOW:      { color: "#94a3b8", label: "Low"      },
  MEDIUM:   { color: "#3b82f6", label: "Medium"   },
  HIGH:     { color: "#f59e0b", label: "High"     },
  CRITICAL: { color: "#ef4444", label: "Critical" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function userName(user: TaskUser | null) {
  if (!user) return "Unassigned";
  return user.displayName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email;
}

function userInitials(user: TaskUser | null) {
  if (!user) return "?";
  return userName(user).split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Mini avatar ──────────────────────────────────────────────────────────────
function MiniAvatar({ user }: { user: TaskUser | null }) {
  return (
    <div style={{
      width: "22px", height: "22px", borderRadius: "50%",
      background: user ? "rgba(132,204,22,0.15)" : "rgba(148,163,184,0.15)",
      border: `1px solid ${user ? "rgba(132,204,22,0.3)" : "rgba(148,163,184,0.3)"}`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "9px", fontWeight: 700, flexShrink: 0,
      color: user ? "var(--color-accent)" : "#94a3b8",
      overflow: "hidden",
    }}>
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : userInitials(user)
      }
    </div>
  );
}

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, canManage, isAssignee, onClick }: {
  task:       Task;
  canManage:  boolean;
  isAssignee: boolean;
  onClick:    () => void;
}) {
  const p = PRIORITY[task.priority] ?? PRIORITY.MEDIUM;
  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        display: "flex", flexDirection: "column", gap: "8px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(132,204,22,0.08)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--color-card-border)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Priority dot + title */}
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        <div style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: p.color, flexShrink: 0, marginTop: "5px",
        }} />
        <p style={{
          fontSize: "13px", fontWeight: 500,
          color: "var(--color-text-primary)", lineHeight: 1.4,
        }}>
          {task.title}
        </p>
      </div>

      {/* Milestone tag */}
      {task.milestone && (
        <span style={{
          display: "inline-block", padding: "1px 8px",
          background: "rgba(59,130,246,0.08)",
          border: "1px solid rgba(59,130,246,0.2)",
          borderRadius: "999px", fontSize: "10px",
          color: "#3b82f6", width: "fit-content",
        }}>
          {task.milestone.title}
        </span>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "2px" }}>
        <MiniAvatar user={task.assignee} />
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {task.dueDate && (
            <span style={{
              fontSize: "10px",
              color: isOverdue ? "#ef4444" : "var(--color-text-muted)",
              fontWeight: isOverdue ? 600 : 400,
            }}>
              {isOverdue ? "⚠ " : ""}
              {new Date(task.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
            </span>
          )}
          <span style={{
            fontSize: "10px", fontWeight: 500,
            color: p.color,
            padding: "1px 6px",
            background: `${p.color}15`,
            borderRadius: "999px",
          }}>
            {p.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Task modal (create + edit) ───────────────────────────────────────────────
function TaskModal({ projectId, task, milestones, members, onClose, onSaved }: {
  projectId:  string;
  task?:      Task | null;
  milestones: Milestone[];
  members:    TaskUser[];
  onClose:    () => void;
  onSaved:    () => void;
}) {
  const isEdit = !!task;

  const [form, setForm] = useState({
    title:       task?.title       ?? "",
    description: task?.description ?? "",
    status:      task?.status      ?? "BACKLOG",
    priority:    task?.priority    ?? "MEDIUM",
    assigneeId:  task?.assignee?.id  ?? "",
    milestoneId: task?.milestone?.id ?? "",
    dueDate:     task?.dueDate ? task.dueDate.split("T")[0] : "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setIsSubmitting(true); setError(null);

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim() || undefined,
      status:      form.status,
      priority:    form.priority,
      assigneeId:  form.assigneeId  || undefined,
      milestoneId: form.milestoneId || undefined,
      dueDate:     form.dueDate     || undefined,
    };

    try {
      if (isEdit) {
        await apiClient.patch(endpoints.tasks.update(projectId, task!.id), payload);
      } else {
        await apiClient.post(endpoints.tasks.create(projectId), payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to save task.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "520px",
        maxHeight: "90vh", overflowY: "auto",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "24px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            {isEdit ? "Edit Task" : "New Task"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "18px" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Implement payment gateway" required autoFocus />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Task details..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)}>
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Assign to</label>
            <select style={inputStyle} value={form.assigneeId} onChange={(e) => set("assigneeId", e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{userName(m)}</option>
              ))}
            </select>
          </div>

          {milestones.length > 0 && (
            <div>
              <label style={labelStyle}>Milestone</label>
              <select style={inputStyle} value={form.milestoneId} onChange={(e) => set("milestoneId", e.target.value)}>
                <option value="">No milestone</option>
                {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Due Date</label>
            <input style={inputStyle} type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </div>

          {error && (
            <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
              {error}
            </p>
          )}

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
              {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Quick status updater (for developers) ────────────────────────────────────
function QuickStatusModal({ projectId, task, onClose, onSaved }: {
  projectId: string;
  task:      Task;
  onClose:   () => void;
  onSaved:   () => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (status: string) => {
    setIsUpdating(true);
    try {
      await apiClient.patch(endpoints.tasks.update(projectId, task.id), { status });
      onSaved();
      onClose();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: "340px",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-lg)", padding: "20px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>Update Status</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "16px" }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "14px", lineHeight: 1.4 }}>
          {task.title}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => handleStatusChange(col.key)}
              disabled={isUpdating || task.status === col.key}
              style={{
                padding: "9px 14px", fontSize: "13px", fontWeight: 500,
                textAlign: "left", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)", cursor: task.status === col.key ? "default" : "pointer",
                background: task.status === col.key ? `${col.color}15` : "var(--color-bg)",
                color: task.status === col.key ? col.color : "var(--color-text-secondary)",
                display: "flex", alignItems: "center", gap: "8px",
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, flexShrink: 0 }} />
              {col.label}
              {task.status === col.key && <span style={{ marginLeft: "auto", fontSize: "11px" }}>current</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TASKS TAB ────────────────────────────────────────────────────────────────
export function TasksTab({ projectId, callerRole, callerId, projectMembers }: {
  projectId:      string;
  callerRole:     string;
  callerId:       string;
  projectMembers: any[];
}) {
  const [tasks,      setTasks]      = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState<Task | null>(null);
  const [quickStatus, setQuickStatus] = useState<Task | null>(null);

  const canManage  = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(callerRole);
  const isDeveloper = callerRole === "DEVELOPER";

  // Team members for assignee dropdown
  const members: TaskUser[] = projectMembers
    .filter((m) => m.user.role !== "CLIENT")
    .map((m) => m.user);

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const [tasksRes, milestonesRes] = await Promise.all([
        apiClient.get(endpoints.tasks.list(projectId)),
        apiClient.get(endpoints.milestones.list(projectId)),
      ]);
      setTasks(tasksRes.data.data?.tasks ?? []);
      setMilestones(milestonesRes.data.data?.milestones ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleDelete = async (task: Task) => {
    await apiClient.delete(endpoints.tasks.delete(projectId, task.id));
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  };

  const handleCardClick = (task: Task) => {
    if (canManage) {
      setEditing(task);
      setShowModal(true);
    } else if (isDeveloper && task.assignee?.id === callerId) {
      setQuickStatus(task);
    }
  };

  // Group tasks by status
  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = tasks.filter((t) => t.status === col.key);
    return acc;
  }, {} as Record<string, Task[]>);

  const done    = tasks.filter((t) => t.status === "DONE").length;
  const total   = tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "60px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading tasks...</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>Tasks</h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {isDeveloper ? "Click a task to update its status" : "Manage and assign project tasks"}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "9px 18px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}
          >
            + Add Task
          </button>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div style={{
          padding: "12px 18px",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", gap: "14px",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{done} of {total} tasks done</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-accent)" }}>{progress}%</span>
            </div>
            <div style={{ height: "5px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress}%`, background: "var(--color-accent)", borderRadius: "999px", transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* Kanban board */}
      {total === 0 && !error ? (
        <div style={{
          padding: "60px 40px", textAlign: "center",
          background: "var(--color-card-bg)",
          border: "1px solid var(--color-card-border)",
          borderRadius: "var(--radius-lg)",
        }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No tasks yet</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
            Break down the work into tasks and assign them to developers
          </p>
          {canManage && (
            <button onClick={() => { setEditing(null); setShowModal(true); }} style={{
              padding: "9px 20px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>
              Add first task
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
          overflowX: "auto",
        }}>
          {COLUMNS.map((col) => {
            const colTasks = byStatus[col.key] ?? [];
            return (
              <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "200px" }}>
                {/* Column header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--color-card-bg)",
                  border: "1px solid var(--color-card-border)",
                  borderRadius: "var(--radius-md)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color, flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{col.label}</span>
                  </div>
                  <span style={{
                    fontSize: "11px", fontWeight: 600,
                    padding: "1px 6px", borderRadius: "999px",
                    background: `${col.color}15`, color: col.color,
                  }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      canManage={canManage}
                      isAssignee={task.assignee?.id === callerId}
                      onClick={() => handleCardClick(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      {showModal && (
        <TaskModal
          projectId={projectId}
          task={editing}
          milestones={milestones}
          members={members}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={fetchTasks}
        />
      )}

      {/* Quick status modal for developers */}
      {quickStatus && (
        <QuickStatusModal
          projectId={projectId}
          task={quickStatus}
          onClose={() => setQuickStatus(null)}
          onSaved={fetchTasks}
        />
      )}
    </div>
  );
}
