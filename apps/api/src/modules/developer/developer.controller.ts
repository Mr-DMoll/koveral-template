import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";

// ─── DEVELOPER DASHBOARD ─────────────────────────────────────────────────────

export const developerDashboard = catchAsync(async (req: Request, res: Response) => {
  const devId = req.user!.userId;

  // Projects the developer is a member of
  const memberships = await prisma.projectMember.findMany({
    where: { userId: devId },
    select: {
      project: {
        select: {
          id: true, name: true, status: true,
          deadline: true, currency: true,
          manager: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
          _count:   { select: { milestones: true, tasks: true } },
        },
      },
    },
  });

  const projects   = memberships.map((m) => m.project);
  const projectIds = projects.map((p) => p.id);

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [myTasks, completedToday, inReview] = await Promise.all([
    // All open tasks assigned to this developer
    prisma.task.findMany({
      where: {
        assigneeId: devId,
        status:     { notIn: ["DONE"] },
      },
      include: {
        milestone: { select: { id: true, title: true } },
        project:   { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }],
      take: 20,
    }),

    // Tasks completed today
    prisma.task.count({
      where: {
        assigneeId:  devId,
        status:      "DONE",
        completedAt: { gte: todayStart, lte: today },
      },
    }),

    // Tasks in REVIEW status
    prisma.task.count({
      where: { assigneeId: devId, status: "REVIEW" },
    }),
  ]);

  const overdueCount = myTasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date()
  ).length;

  const dueTodayCount = myTasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    return d >= todayStart && d <= today;
  }).length;

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      stats: {
        assignedProjects: projects.length,
        openTasks:        myTasks.length,
        completedToday,
        inReview,
        overdueCount,
        dueTodayCount,
      },
      projects,
      myTasks,
    },
  });
});

// ─── DEVELOPER ALL TASKS ──────────────────────────────────────────────────────
// All tasks assigned to this developer across all projects, optionally filtered

export const developerTasks = catchAsync(async (req: Request, res: Response) => {
  const devId    = req.user!.userId;
  const { status, projectId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: devId,
      ...(status    && { status:    status    as any }),
      ...(projectId && { projectId: projectId as string }),
    },
    include: {
      project:   { select: { id: true, name: true } },
      milestone: { select: { id: true, title: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "asc" }, { dueDate: "asc" }],
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: tasks.length,
    data:    { tasks },
  });
});
