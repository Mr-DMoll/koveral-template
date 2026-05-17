"use client";
import { useAuth } from "@/shared/context/AuthContext";
import { ProjectsPage } from "@/shared/components/projects/ProjectsPage";
export function ManagerProjectsPage() {
  const { user } = useAuth();
  return <ProjectsPage callerRole={user?.role ?? "MANAGER"} basePath="/manager" />;
}
