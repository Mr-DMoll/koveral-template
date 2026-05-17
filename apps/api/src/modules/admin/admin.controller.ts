import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────

export const adminDashboard = catchAsync(async (req: Request, res: Response) => {
  const [
    totalProjects,
    activeProjects,
    totalStaff,
    totalClients,
    recentProjects,
    invoiceStats,
    pendingMilestones,
    recentLogs,
  ] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),

    prisma.user.count({
      where: { role: { in: ["MANAGER", "DEVELOPER"] }, accountStatus: "ACTIVE" },
    }),

    prisma.user.count({
      where: { role: "CLIENT", accountStatus: "ACTIVE" },
    }),

    prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: {
        id: true, name: true, status: true,
        deadline: true, currency: true, budget: true, spent: true,
        client:  { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
        manager: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
        _count:  { select: { tasks: true, milestones: true } },
      },
    }),

    // Invoice revenue stats
    prisma.invoice.aggregate({
      _sum: { amount: true },
      where: { status: "PAID" },
    }),

    // Milestones awaiting approval across all projects
    prisma.milestone.findMany({
      where:   { status: "SUBMITTED" },
      take:    5,
      orderBy: { createdAt: "asc" },
      select: {
        id: true, title: true, agreedAmount: true,
        project: { select: { id: true, name: true } },
        approvedById: true,
      },
    }),

    // Recent audit logs across all users
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, displayName: true, email: true, role: true },
        },
      },
    }),
  ]);

  // Outstanding invoices
  const outstandingInvoices = await prisma.invoice.aggregate({
    _sum:   { amount: true },
    _count: { id: true },
    where:  { status: { in: ["SENT", "OVERDUE"] } },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      stats: {
        totalProjects,
        activeProjects,
        totalStaff,
        totalClients,
        totalRevenue:       parseFloat(invoiceStats._sum.amount?.toString() ?? "0"),
        outstandingAmount:  parseFloat(outstandingInvoices._sum.amount?.toString() ?? "0"),
        outstandingCount:   outstandingInvoices._count.id,
      },
      recentProjects,
      pendingMilestones,
      recentActivity: recentLogs,
    },
  });
});

// ─── ADMIN ACTIVITY ───────────────────────────────────────────────────────────

export const adminActivity = catchAsync(async (req: Request, res: Response) => {
  const page  = parseInt(req.query.page as string) || 1;
  const limit = 25;
  const skip  = (page - 1) * limit;
  const { userId, action } = req.query;

  const where = {
    ...(userId && { userId: userId as string }),
    ...(action && { action: { contains: action as string, mode: "insensitive" as const } }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, displayName: true, email: true, role: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      logs,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
    },
  });
});

// ─── ADMIN CLIENTS ────────────────────────────────────────────────────────────

export const adminClients = catchAsync(async (req: Request, res: Response) => {
  const clients = await prisma.user.findMany({
    where:   { role: "CLIENT" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, firstName: true, lastName: true, displayName: true,
      email: true, avatarUrl: true, accountStatus: true, createdAt: true,
      clientProjects: {
        select: {
          id: true, name: true, status: true, currency: true,
          budget: true, spent: true, deadline: true,
          _count: { select: { invoices: true, milestones: true } },
        },
      },
    },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: clients.length,
    data:    { clients },
  });
});

// ─── ADMIN INVOICES ───────────────────────────────────────────────────────────

export const adminInvoices = catchAsync(async (req: Request, res: Response) => {
  const { status, projectId } = req.query;
  const page  = parseInt(req.query.page as string) || 1;
  const limit = 20;
  const skip  = (page - 1) * limit;

  const where = {
    ...(status    && { status:    status    as any }),
    ...(projectId && { projectId: projectId as string }),
  };

  const [invoices, total, stats] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        project:  { select: { id: true, name: true, client: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } } } },
        milestone: { select: { id: true, title: true } },
      },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({
      by:    ["status"],
      _sum:  { amount: true },
      _count: { id: true },
    }),
  ]);

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      invoices,
      pagination: { total, page, pages: Math.ceil(total / limit), limit },
      stats,
    },
  });
});
