"use client";

import { StatCard, ActivityItem, HealthMetric, SectionCard } from "@/shared/components/ui/DashboardComponents";

export function SuperAdminOverviewPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--color-text-primary)" }}>
          Platform Overview
        </h1>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "4px" }}>
          System status and platform health
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
        <StatCard title="Total Admins"    value="3"    color="from-blue-500 to-cyan-400"     sub="2 active" />
        <StatCard title="Total Users"     value="24"   color="from-green-500 to-emerald-400" sub="Across all roles" />
        <StatCard title="Active Projects" value="8"    color="from-purple-500 to-pink-500"   sub="In progress" />
        <StatCard title="Uptime"          value="99.9%" color="from-lime-500 to-green-400"   sub="Last 30 days" />
      </div>

      {/* Content */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <SectionCard title="Recent Activity">
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            <ActivityItem text="Admin account provisioned: k.katlego@gmail.com"  time="2 hours ago" />
            <ActivityItem text="Manager added to platform"                        time="5 hours ago" />
            <ActivityItem text="New developer onboarded"                          time="1 day ago"   />
            <ActivityItem text="System backup completed successfully"             time="2 days ago"  />
          </div>
        </SectionCard>

        <SectionCard title="System Health">
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <HealthMetric label="Database"       status="Operational" percentage={98}  />
            <HealthMetric label="API Services"   status="Operational" percentage={100} />
            <HealthMetric label="Storage"        status="Warning"     percentage={85}  />
            <HealthMetric label="Backup Systems" status="Operational" percentage={100} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
