"use client";
import { use } from "react";
import { ProjectDetailPage } from "@/shared/components/projects/ProjectDetailPage";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <ProjectDetailPage id={id} callerRole="CLIENT" basePath="/client" />;
}
