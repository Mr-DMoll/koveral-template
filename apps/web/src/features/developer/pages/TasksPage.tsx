"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/client";

const COLUMNS = [
  { key: "BACKLOG",     label: "Backlog",     color: "#94a3b8" },
  { key: "TODO",        label: "To Do",       color: "#3b82f6" },
  { key: "IN_PROGRESS", label: "In Progress", color: "#f59e0b" },
  { key: "REVIEW",      label: "Review",      color: "#a855f7" },
  { key: "DONE",        label: "Done",        color: "#22c55e" },
];

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "#94a3b8", MEDIUM: "#3b82f6", HIGH: "#f59e0b", CRITICAL: "#ef4444",
};

// ─── Quick status modal ───────────────────────────────────────────────────────
function StatusModal({ task, onClose, onUpdate }: {
  task:     any;
  onClose:  () => void;
  onUpdate: (taskId: string, status: string) => Promise<void>;
}) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handle = async (status: string) => {
    setIsUpdating(true);
    try { await onUpdate(task.id, status); onClose(); }
    finally { setIsUpdating(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "340px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)", padding: "20px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>Update Status</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: "16px" }}>✕</button>
        </div>
        <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "14px", lineHeight: 1.4 }}>{task.title}</p>
        <p style={{ fontSize: "11px", color: "var(--color-text-muted)", marginBottom: "8px" }}>{task.project.name}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {COLUMNS.map((col) => (
            <button
              key={col.key}
              onClick={() => handle(col.key)}
              disabled={isUpdating || task.status === col.key}
              style={{
                padding: "9px 14px", fontSize: "13px", fontWeight: 500,
                textAlign: "left", border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                cursor: task.status === col.key ? "default" : "pointer",
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

// ─── Task card ────────────────────────────────────────────────────────────────
function TaskCard({ task, onClick }: { task: any; onClick: () => void }) {
  const router    = useRouter();
  const pColor    = PRIORITY_COLOR[task.priority] ?? "#94a3b8";
  const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  return (
    <div
      onClick={onClick}
      style={{
        padding: "10px 12px",
        background: "var(--color-card-bg)",
        border: "1px solid var(--color-card-border)",
        borderRadius: "var(--radius-md)",
        cursor: "pointer",
        display: "flex", flexDirection: "column", gap: "6px",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--color-accent)"}
      onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.borderColor = "var(--color-card-border)"}
    >
      <div style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: pColor, flexShrink: 0, marginTop: "4px" }} />
        <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{task.title}</p>
      </div>

      {/* Project tag */}
      <span
        onClick={(e) => { e.stopPropagation(); router.push(`/developer/projects/${task.project.id}`); }}
        style={{ fontSize: "10px", color: "#3b82f6", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: "999px", padding: "1px 7px", width: "fit-content", cursor: "pointer" }}
      >
        {task.project.name}
      </span>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {task.dueDate ? (
          <span style={{ fontSize: "10px", color: isOverdue ? "#ef4444" : "var(--color-text-muted)", fontWeight: isOverdue ? 600 : 400 }}>
            {isOverdue ? "⚠ " : ""}{new Date(task.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
          </span>
        ) : <span />}
        <span style={{ fontSize: "10px", fontWeight: 500, padding: "1px 6px", borderRadius: "999px", background: `${pColor}15`, color: pColor }}>
          {task.priority.charAt(0) + task.priority.slice(1).toLowerCase()}
        </span>
      </div>
    </div>
  );
}

// ─── DEVELOPER TASKS PAGE ─────────────────────────────────────────────────────
export function DeveloperTasksPage() {
  const [tasks,      setTasks]      = useState<any[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [updating,   setUpdating]   = useState<any | null>(null);
  const [projects,   setProjects]   = useState<any[]>([]);
  const [filterPid,  setFilterPid]  = useState("ALL");

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true); setError(null);
      const { data } = await apiClient.get("/developer/tasks");
      const taskList = data.data?.tasks ?? [];
      setTasks(taskList);

      // Extract unique projects
      const seen = new Set<string>();
      const projs: any[] = [];
      taskList.forEach((t: any) => {
        if (!seen.has(t.project.id)) { seen.add(t.project.id); projs.push(t.project); }
      });
      setProjects(projs);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to load tasks.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatusUpdate = async (taskId: string, status: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    await apiClient.patch(`/projects/${task.project.id}/tasks/${taskId}`, { status });
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status, completedAt: status === "DONE" ? new Date().toISOString() : null } : t
    ));
  };

  const filtered = filterPid === "ALL" ? tasks : tasks.filter((t) => t.project.id === filterPid);

  const byStatus: Record<string, any[]> = {};
  COLUMNS.forEach((c) => { byStatus[c.key] = filtered.filter((t) => t.status === c.key); });

  const done  = tasks.filter((t) => t.status === "DONE").length;
  const total = tasks.length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
      <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: "13px" }}>Loading tasks...</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>My Tasks</h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
            All tasks assigned to you across all projects — click any task to update its status
          </p>
        </div>
      </div>

      {/* Progress */}
      {total > 0 && (
        <div style={{ padding: "12px 18px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
              <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{done} of {total} tasks done</span>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-accent)" }}>{pct}%</span>
            </div>
            <div style={{ height: "4px", background: "var(--color-border)", borderRadius: "999px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: "var(--color-accent)", borderRadius: "999px", transition: "width 0.4s ease" }} />
            </div>
          </div>
        </div>
      )}

      {/* Project filter */}
      {projects.length > 1 && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["ALL", ...projects.map((p) => p.id)].map((id) => {
            const label = id === "ALL" ? "All Projects" : projects.find((p) => p.id === id)?.name ?? id;
            return (
              <button
                key={id}
                onClick={() => setFilterPid(id)}
                style={{
                  padding: "5px 12px", fontSize: "12px", fontWeight: 500,
                  borderRadius: "var(--radius-sm)", border: "1px solid var(--color-border)",
                  cursor: "pointer",
                  background: filterPid === id ? "var(--color-accent)" : "var(--color-card-bg)",
                  color: filterPid === id ? "var(--color-accent-text)" : "var(--color-text-muted)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {error && <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center" }}>{error}</p>}

      {/* Kanban */}
      {total === 0 ? (
        <div style={{ padding: "60px 40px", textAlign: "center", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)" }}>
          <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No tasks assigned yet</p>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Your project manager will assign tasks to you. They'll appear here across all your projects.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", overflowX: "auto" }}>
          {COLUMNS.map((col) => {
            const colTasks = byStatus[col.key] ?? [];
            return (
              <div key={col.key} style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "200px" }}>
                {/* Column header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: col.color }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{col.label}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "1px 6px", borderRadius: "999px", background: `${col.color}15`, color: col.color }}>
                    {colTasks.length}
                  </span>
                </div>

                {/* Tasks */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {colTasks.map((task: any) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setUpdating(task)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Status update modal */}
      {updating && (
        <StatusModal
          task={updating}
          onClose={() => setUpdating(null)}
          onUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}
