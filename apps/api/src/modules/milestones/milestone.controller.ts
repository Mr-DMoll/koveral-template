import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const pid = (req: Request) => req.params.projectId as string;
const mid = (req: Request) => req.params.id as string;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function assertProjectAccess(
  projectId: string,
  userId: string,
  role: Role,
) {
  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: {
      managerId: true,
      clientId:  true,
      members:   { select: { userId: true } },
    },
  });

  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const hasAccess =
    role === Role.SUPER_ADMIN ||
    role === Role.ADMIN ||
    project.managerId === userId ||
    project.clientId  === userId ||
    project.members.some((m) => m.userId === userId);

  if (!hasAccess) {
    throw new AppError("You do not have access to this project.", HttpStatus.FORBIDDEN);
  }

  return project;
}

// ─── LIST MILESTONES ──────────────────────────────────────────────────────────

export const listMilestones = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const milestones = await prisma.milestone.findMany({
    where:   { projectId: pid(req) },
    orderBy: { order: "asc" },
    include: {
      _count: { select: { tasks: true } },
      invoices: {
        select: { id: true, invoiceNumber: true, status: true, amount: true },
      },
    },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: milestones.length,
    data:    { milestones },
  });
});

// ─── GET SINGLE MILESTONE ─────────────────────────────────────────────────────

export const getMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const milestone = await prisma.milestone.findUnique({
    where:   { id: mid(req) },
    include: {
      tasks:   { select: { id: true, title: true, status: true, assignee: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      invoices: { select: { id: true, invoiceNumber: true, status: true, amount: true } },
    },
  });

  if (!milestone || milestone.projectId !== pid(req)) {
    throw new AppError("Milestone not found.", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { milestone },
  });
});

// ─── CREATE MILESTONE ─────────────────────────────────────────────────────────

export const createMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  // Only manager or admin can create milestones
  if (
    callerRole !== Role.ADMIN &&
    callerRole !== Role.SUPER_ADMIN &&
    project.managerId !== callerId
  ) {
    throw new AppError("Only the project manager can create milestones.", HttpStatus.FORBIDDEN);
  }

  const { title, description, agreedAmount, dueDate, deliverables, order } = req.body;

  if (!title) {
    throw new AppError("Title is required.", HttpStatus.BAD_REQUEST);
  }

  // Auto-set order to last position if not provided
  const lastMilestone = await prisma.milestone.findFirst({
    where:   { projectId: pid(req) },
    orderBy: { order: "desc" },
    select:  { order: true },
  });

  const milestone = await prisma.milestone.create({
    data: {
      projectId:    pid(req),
      title,
      description,
      agreedAmount: agreedAmount ? parseFloat(agreedAmount) : undefined,
      dueDate:      dueDate ? new Date(dueDate) : undefined,
      deliverables: deliverables ?? [],
      order:        order ?? (lastMilestone ? lastMilestone.order + 1 : 0),
    },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "MILESTONE_CREATED",
      meta:   { milestoneId: milestone.id, projectId: pid(req), title },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success",
    data:   { milestone },
  });
});

// ─── UPDATE MILESTONE ─────────────────────────────────────────────────────────

export const updateMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  if (
    callerRole !== Role.ADMIN &&
    callerRole !== Role.SUPER_ADMIN &&
    project.managerId !== callerId
  ) {
    throw new AppError("Only the project manager can update milestones.", HttpStatus.FORBIDDEN);
  }

  const existing = await prisma.milestone.findUnique({ where: { id: mid(req) } });
  if (!existing || existing.projectId !== pid(req)) {
    throw new AppError("Milestone not found.", HttpStatus.NOT_FOUND);
  }

  // Cannot edit an approved milestone
  if (existing.status === "APPROVED") {
    throw new AppError("Approved milestones cannot be edited.", HttpStatus.FORBIDDEN);
  }

  const { title, description, agreedAmount, dueDate, deliverables, order } = req.body;

  const milestone = await prisma.milestone.update({
    where: { id: mid(req) },
    data: {
      ...(title        && { title }),
      ...(description  !== undefined && { description }),
      ...(agreedAmount !== undefined && { agreedAmount: agreedAmount ? parseFloat(agreedAmount) : null }),
      ...(dueDate      !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(deliverables !== undefined && { deliverables }),
      ...(order        !== undefined && { order }),
    },
    include: {
      _count: { select: { tasks: true } },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { milestone },
  });
});

// ─── SUBMIT FOR APPROVAL ──────────────────────────────────────────────────────
// Developer or manager marks milestone as complete — sends to manager for approval

export const submitMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const milestone = await prisma.milestone.findUnique({ where: { id: mid(req) } });
  if (!milestone || milestone.projectId !== pid(req)) {
    throw new AppError("Milestone not found.", HttpStatus.NOT_FOUND);
  }

  if (milestone.status !== "PENDING" && milestone.status !== "IN_PROGRESS" && milestone.status !== "REJECTED") {
    throw new AppError(`Cannot submit a milestone with status: ${milestone.status}`, HttpStatus.BAD_REQUEST);
  }

  const updated = await prisma.milestone.update({
    where: { id: mid(req) },
    data:  { status: "SUBMITTED" },
  });

  // Notify the project manager
  const project = await prisma.project.findUnique({
    where:  { id: pid(req) },
    select: { managerId: true, name: true },
  });

  if (project) {
    await prisma.notification.create({
      data: {
        userId:    project.managerId,
        projectId: pid(req),
        title:     "Milestone ready for review",
        message:   `"${milestone.title}" has been submitted for approval on ${project.name}.`,
        type:      "milestone_submitted",
      },
    });
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { milestone: updated },
  });
});

// ─── APPROVE MILESTONE ────────────────────────────────────────────────────────
// Manager approves — triggers invoice creation

export const approveMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  // Only manager or admin can approve
  if (
    callerRole !== Role.ADMIN &&
    callerRole !== Role.SUPER_ADMIN &&
    project.managerId !== callerId
  ) {
    throw new AppError("Only the project manager can approve milestones.", HttpStatus.FORBIDDEN);
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: mid(req) } });
  if (!milestone || milestone.projectId !== pid(req)) {
    throw new AppError("Milestone not found.", HttpStatus.NOT_FOUND);
  }

  if (milestone.status !== "SUBMITTED") {
    throw new AppError("Only submitted milestones can be approved.", HttpStatus.BAD_REQUEST);
  }

  // Approve and auto-generate invoice in one transaction
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.milestone.update({
      where: { id: mid(req) },
      data: {
        status:      "APPROVED",
        approvedById: callerId,
        approvedAt:  new Date(),
        completedAt: new Date(),
      },
    });

    // Auto-generate invoice if milestone has an agreed amount
    let invoice = null;
    if (milestone.agreedAmount) {
      // Generate invoice number: INV-YYYY-NNNN
      const count = await tx.invoice.count({ where: { projectId: pid(req) } });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

      invoice = await tx.invoice.create({
        data: {
          projectId:     pid(req),
          milestoneId:   mid(req),
          invoiceNumber,
          amount:        milestone.agreedAmount,
          currency:      "ZAR",
          status:        "DRAFT",
          description:   `${milestone.title} — milestone completion`,
          dueDate:       new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      });

      // Update project spent amount
      await tx.project.update({
        where: { id: pid(req) },
        data:  { spent: { increment: milestone.agreedAmount } },
      });
    }

    return { milestone: updated, invoice };
  });

  // Notify the client
  const fullProject = await prisma.project.findUnique({
    where:  { id: pid(req) },
    select: { clientId: true, name: true },
  });

  if (fullProject) {
    await prisma.notification.create({
      data: {
        userId:    fullProject.clientId,
        projectId: pid(req),
        title:     "Milestone approved",
        message:   `"${milestone.title}" has been approved on ${fullProject.name}.${result.invoice ? " An invoice has been generated." : ""}`,
        type:      "milestone_approved",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "MILESTONE_APPROVED",
      meta:   {
        milestoneId: mid(req),
        projectId:   pid(req),
        invoiceId:   result.invoice?.id,
      },
    },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: result.invoice
      ? "Milestone approved and invoice generated."
      : "Milestone approved.",
    data: result,
  });
});

// ─── REJECT MILESTONE ─────────────────────────────────────────────────────────

export const rejectMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  if (
    callerRole !== Role.ADMIN &&
    callerRole !== Role.SUPER_ADMIN &&
    project.managerId !== callerId
  ) {
    throw new AppError("Only the project manager can reject milestones.", HttpStatus.FORBIDDEN);
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: mid(req) } });
  if (!milestone || milestone.projectId !== pid(req)) {
    throw new AppError("Milestone not found.", HttpStatus.NOT_FOUND);
  }

  if (milestone.status !== "SUBMITTED") {
    throw new AppError("Only submitted milestones can be rejected.", HttpStatus.BAD_REQUEST);
  }

  const { reason } = req.body;

  const updated = await prisma.milestone.update({
    where: { id: mid(req) },
    data:  { status: "REJECTED" },
  });

  // Notify team members
  const projectMembers = await prisma.projectMember.findMany({
    where:  { projectId: pid(req) },
    select: { userId: true },
  });

  await prisma.notification.createMany({
    data: projectMembers.map((m) => ({
      userId:    m.userId,
      projectId: pid(req),
      title:     "Milestone rejected",
      message:   `"${milestone.title}" was rejected.${reason ? ` Reason: ${reason}` : ""}`,
      type:      "milestone_rejected",
    })),
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { milestone: updated },
  });
});

// ─── DELETE MILESTONE ─────────────────────────────────────────────────────────

export const deleteMilestone = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  if (
    callerRole !== Role.ADMIN &&
    callerRole !== Role.SUPER_ADMIN &&
    project.managerId !== callerId
  ) {
    throw new AppError("Only the project manager can delete milestones.", HttpStatus.FORBIDDEN);
  }

  const milestone = await prisma.milestone.findUnique({ where: { id: mid(req) } });
  if (!milestone || milestone.projectId !== pid(req)) {
    throw new AppError("Milestone not found.", HttpStatus.NOT_FOUND);
  }

  if (milestone.status === "APPROVED") {
    throw new AppError("Approved milestones cannot be deleted.", HttpStatus.FORBIDDEN);
  }

  await prisma.milestone.delete({ where: { id: mid(req) } });

  return res.status(HttpStatus.NO_CONTENT).send();
});