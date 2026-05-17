"use client";
import { use } from "react";
import { useAuth } from "@/shared/context/AuthContext";
import { ProjectDetailPage } from "@/shared/components/projects/ProjectDetailPage";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  return <ProjectDetailPage id={id} callerRole={user?.role ?? "MANAGER"} basePath="/manager" />;
}
