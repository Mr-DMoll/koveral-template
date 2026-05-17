"use client";

import { useAuth } from "@/shared/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      const roleRedirects: Record<string, string> = {
        SUPER_ADMIN: "/super-admin",
        ADMIN:       "/admin",
        MANAGER:     "/manager",
        DEVELOPER:   "/developer",
        CLIENT:      "/client",
      };
      router.push(roleRedirects[user.role] || "/login");
    }
  }, [user, router]);

  return <div className="text-slate-400 text-sm p-8">Redirecting...</div>;
}