import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const pid = (req: Request) => req.params.projectId as string;
const iid = (req: Request) => req.params.id as string;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function assertProjectAccess(projectId: string, userId: string, role: Role) {
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

// ─── LIST INVOICES ────────────────────────────────────────────────────────────

export const listInvoices = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const { status } = req.query;

  const invoices = await prisma.invoice.findMany({
    where: {
      projectId: pid(req),
      ...(status && { status: status as any }),
    },
    include: {
      milestone: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: invoices.length,
    data:    { invoices },
  });
});

// ─── GET SINGLE INVOICE ───────────────────────────────────────────────────────

export const getInvoice = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const invoice = await prisma.invoice.findUnique({
    where:   { id: iid(req) },
    include: { milestone: { select: { id: true, title: true } } },
  });

  if (!invoice || invoice.projectId !== pid(req)) {
    throw new AppError("Invoice not found.", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { invoice },
  });
});

// ─── UPDATE INVOICE STATUS ────────────────────────────────────────────────────

export const updateInvoiceStatus = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  const { status } = req.body;
  if (!status) throw new AppError("Status is required.", HttpStatus.BAD_REQUEST);

  const invoice = await prisma.invoice.findUnique({ where: { id: iid(req) } });
  if (!invoice || invoice.projectId !== pid(req)) {
    throw new AppError("Invoice not found.", HttpStatus.NOT_FOUND);
  }

  // Only manager/admin can update invoice status
  // Exception: client can mark as paid (future Stripe integration)
  const isManager =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  const isClient = project.clientId === callerId;

  if (!isManager && !isClient) {
    throw new AppError("Insufficient permissions.", HttpStatus.FORBIDDEN);
  }

  // Clients can only mark as paid
  if (isClient && status !== "PAID") {
    throw new AppError("Clients can only mark invoices as paid.", HttpStatus.FORBIDDEN);
  }

  const data: any = { status };
  if (status === "SENT") data.sentAt = new Date();
  if (status === "PAID") data.paidAt = new Date();

  const updated = await prisma.invoice.update({
    where:   { id: iid(req) },
    data,
    include: { milestone: { select: { id: true, title: true } } },
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "INVOICE_STATUS_UPDATED",
      meta:   { invoiceId: iid(req), projectId: pid(req), newStatus: status },
    },
  });

  // Notify client when invoice is sent
  if (status === "SENT") {
    await prisma.notification.create({
      data: {
        userId:    project.clientId,
        projectId: pid(req),
        title:     "New invoice",
        message:   `Invoice ${invoice.invoiceNumber} has been sent for payment.`,
        type:      "invoice_sent",
      },
    });
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { invoice: updated },
  });
});

// ─── CREATE MANUAL INVOICE ────────────────────────────────────────────────────
// For cases outside of milestone approval (deposits, change requests etc.)

export const createInvoice = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  const isManager =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!isManager) {
    throw new AppError("Only the project manager can create invoices.", HttpStatus.FORBIDDEN);
  }

  const { amount, description, dueDate, isDeposit, milestoneId } = req.body;

  if (!amount) throw new AppError("Amount is required.", HttpStatus.BAD_REQUEST);

  const count = await prisma.invoice.count({ where: { projectId: pid(req) } });
  const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

  const invoice = await prisma.invoice.create({
    data: {
      projectId:    pid(req),
      milestoneId:  milestoneId || undefined,
      invoiceNumber,
      amount:       parseFloat(amount),
      currency:     "ZAR",
      status:       "DRAFT",
      description:  description?.trim(),
      isDeposit:    isDeposit ?? false,
      dueDate:      dueDate ? new Date(dueDate) : undefined,
    },
    include: { milestone: { select: { id: true, title: true } } },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success",
    data:   { invoice },
  });
});