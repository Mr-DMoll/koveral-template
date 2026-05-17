"use client";
import { useAuth } from "@/shared/context/AuthContext";
import { ProjectsPage } from "@/shared/components/projects/ProjectsPage";
export function DeveloperProjectsPage() {
  const { user } = useAuth();
  return <ProjectsPage callerRole={user?.role ?? "DEVELOPER"} basePath="/developer" />;
}
