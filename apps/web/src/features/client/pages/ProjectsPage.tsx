"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/api/client";
import { ProjectDetailPage } from "@/shared/components/projects/ProjectDetailPage";

// ─── CLIENT PROJECTS PAGE ─────────────────────────────────────────────────────
// Clients typically have one project. Show it directly or a list if multiple.

export function ClientProjectsPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMultiple, setHasMultiple] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get("/projects")
      .then((res) => {
        const list = res.data.data?.projects ?? [];
        if (list.length === 1) {
          setProjectId(list[0].id);
        } else if (list.length > 1) {
          setHasMultiple(true);
          setProjects(list);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "80px", color: "var(--color-text-muted)" }}>
        <div style={{ width: "16px", height: "16px", border: "2px solid var(--color-border)", borderTopColor: "var(--color-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <span style={{ fontSize: "13px" }}>Loading your project...</span>
      </div>
    );
  }

  // Single project — show detail directly
  if (projectId) {
    return <ProjectDetailPage id={projectId} callerRole="CLIENT" basePath="/client" />;
  }

  // Multiple projects — show list (edge case)
  if (hasMultiple) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>My Projects</h1>
          <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>Select a project to view details</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {projects.map((p: any) => (
            <div
              key={p.id}
              onClick={() => router.push(`/client/projects/${p.id}`)}
              style={{
                padding: "16px 20px",
                background: "var(--color-card-bg)",
                border: "1px solid var(--color-card-border)",
                borderRadius: "var(--radius-lg)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{p.name}</p>
              <span style={{ fontSize: "12px", color: "var(--color-accent)" }}>View →</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No project
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>My Project</h1>
      </div>
      <div style={{ padding: "60px 40px", textAlign: "center", background: "var(--color-card-bg)", border: "1px solid var(--color-card-border)", borderRadius: "var(--radius-lg)" }}>
        <p style={{ fontSize: "15px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No project assigned yet</p>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>Your project manager will assign your project shortly.</p>
      </div>
    </div>
  );
}
