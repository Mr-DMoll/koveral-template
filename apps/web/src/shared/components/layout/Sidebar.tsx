import { cookies } from "next/headers";
import SidebarClient from "./SidebarClient";
import { NAV_CONFIG } from "@/shared/config/nav.config";

export default async function Sidebar() {
  const cookieStore = await cookies();
  const rawRole     = cookieStore.get("user_role")?.value ?? "";
  const role        = rawRole.toUpperCase() as keyof typeof NAV_CONFIG;

  const navItems = NAV_CONFIG[role] ?? [];

  return <SidebarClient navItems={navItems} role={role} />;
}
