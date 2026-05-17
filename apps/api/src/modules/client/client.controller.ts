import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";

// ─── CLIENT DASHBOARD ────────────────────────────────────────────────────────

export const clientDashboard = catchAsync(async (req: Request, res: Response) => {
  const clientId = req.user!.userId;

  const projects = await prisma.project.findMany({
    where: { clientId },
    select: {
      id: true, name: true, status: true,
      budget: true, spent: true, currency: true,
      startDate: true, deadline: true, completedAt: true,
      repositoryUrl: true, liveSiteUrl: true, figmaUrl: true,
      manager: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true },
      },
      _count: { select: { milestones: true, tasks: true, documents: true, invoices: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  if (projects.length === 0) {
    return res.status(HttpStatus.OK).json({
      status: "success",
      data:   { hasProject: false, projects: [], milestones: [], pendingInvoices: [], recentComments: [], stats: null },
    });
  }

  const projectIds = projects.map((p) => p.id);

  const [milestones, invoices, recentComments] = await Promise.all([
    prisma.milestone.findMany({
      where:   { projectId: { in: projectIds } },
      orderBy: { order: "asc" },
      select: {
        id: true, title: true, status: true,
        agreedAmount: true, dueDate: true, completedAt: true,
        projectId: true,
      },
    }),

    prisma.invoice.findMany({
      where: {
        projectId: { in: projectIds },
        status:    { in: ["SENT", "OVERDUE"] },
      },
      select: {
        id: true, invoiceNumber: true, amount: true,
        currency: true, status: true, dueDate: true, projectId: true,
      },
      orderBy: { dueDate: "asc" },
    }),

    prisma.comment.findMany({
      where: { projectId: { in: projectIds }, isInternal: false },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true, content: true, createdAt: true,
        author: {
          select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true },
        },
      },
    }),
  ]);

  const totalMilestones    = milestones.length;
  const approvedMilestones = milestones.filter((m) => m.status === "APPROVED").length;
  const progressPct        = totalMilestones > 0 ? Math.round((approvedMilestones / totalMilestones) * 100) : 0;
  const outstandingAmount  = invoices.reduce((s, i) => s + parseFloat(i.amount.toString()), 0);

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      hasProject: true,
      projects,
      milestones,
      pendingInvoices: invoices,
      recentComments,
      stats: {
        totalMilestones,
        approvedMilestones,
        progressPct,
        outstandingAmount,
        outstandingCount: invoices.length,
        currency:         projects[0]?.currency ?? "ZAR",
      },
    },
  });
});
