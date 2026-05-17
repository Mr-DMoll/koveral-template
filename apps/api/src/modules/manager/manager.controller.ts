import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";

// ─── MANAGER DASHBOARD ───────────────────────────────────────────────────────
// Single endpoint that returns everything the manager overview needs.

export const managerDashboard = catchAsync(async (req: Request, res: Response) => {
  const managerId = req.user!.userId;

  // All projects managed by this manager
  const projects = await prisma.project.findMany({
    where:   { managerId },
    select: {
      id: true, name: true, status: true,
      budget: true, spent: true, currency: true,
      deadline: true, createdAt: true,
      client: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      },
      members:  { select: { userId: true } },
      _count: {
        select: { milestones: true, tasks: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const projectIds = projects.map((p) => p.id);

  // Run all counts in parallel
  const [
    activeTasks,
    overdueTasks,
    pendingMilestones,
    submittedMilestones,
    upcomingDeadlines,
    recentAuditLogs,
  ] = await Promise.all([
    // Open tasks across all managed projects
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status:    { in: ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW"] },
      },
    }),

    // Overdue tasks
    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        status:    { notIn: ["DONE"] },
        dueDate:   { lt: new Date() },
      },
    }),

    // Milestones waiting on manager approval (SUBMITTED)
    prisma.milestone.findMany({
      where: {
        projectId: { in: projectIds },
        status:    "SUBMITTED",
      },
      select: {
        id: true, title: true, agreedAmount: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),

    // Count of submitted milestones
    prisma.milestone.count({
      where: {
        projectId: { in: projectIds },
        status:    "SUBMITTED",
      },
    }),

    // Projects with deadline in next 14 days
    prisma.project.findMany({
      where: {
        managerId,
        status:   { notIn: ["COMPLETE", "ARCHIVED"] },
        deadline: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      },
      select: {
        id: true, name: true, deadline: true, status: true,
        client: { select: { displayName: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { deadline: "asc" },
      take: 5,
    }),

    // Recent audit logs for this manager
    prisma.auditLog.findMany({
      where:   { userId: managerId },
      orderBy: { createdAt: "desc" },
      take:    10,
      select:  { id: true, action: true, meta: true, createdAt: true },
    }),
  ]);

  // Project summary stats
  const activeProjects   = projects.filter((p) => p.status === "ACTIVE").length;
  const totalTeamMembers = new Set(projects.flatMap((p) => p.members.map((m) => m.userId))).size;

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      stats: {
        totalProjects:       projects.length,
        activeProjects,
        totalTeamMembers,
        openTasks:           activeTasks,
        overdueTasks,
        pendingApprovals:    submittedMilestones,
      },
      projects:            projects.slice(0, 6),
      pendingMilestones,
      upcomingDeadlines,
      recentActivity:      recentAuditLogs,
    },
  });
});

// ─── MANAGER ACTIVITY ────────────────────────────────────────────────────────

export const managerActivity = catchAsync(async (req: Request, res: Response) => {
  const managerId = req.user!.userId;
  const page      = parseInt(req.query.page as string) || 1;
  const limit     = 20;
  const skip      = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where:   { userId: managerId },
      orderBy: { createdAt: "desc" },
      skip,
      take:    limit,
    }),
    prisma.auditLog.count({ where: { userId: managerId } }),
  ]);

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      logs,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      },
    },
  });
});
