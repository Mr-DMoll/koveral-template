import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const pid = (req: Request) => req.params.projectId as string;
const cid = (req: Request) => req.params.id as string;

async function assertManagerAccess(projectId: string, userId: string, role: Role) {
  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: { managerId: true, clientId: true, members: { select: { userId: true } } },
  });
  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const hasAccess =
    role === Role.SUPER_ADMIN || role === Role.ADMIN ||
    project.managerId === userId || project.clientId === userId ||
    project.members.some((m) => m.userId === userId);

  if (!hasAccess) throw new AppError("No access to this project.", HttpStatus.FORBIDDEN);
  return project;
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
export const listChangeRequests = catchAsync(async (req: Request, res: Response) => {
  await assertManagerAccess(pid(req), req.user!.userId, req.user!.role as Role);

  const requests = await prisma.changeRequest.findMany({
    where:   { projectId: pid(req) },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { id: true, name: true } },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success", results: requests.length, data: { requests },
  });
});

// ─── CREATE ───────────────────────────────────────────────────────────────────
export const createChangeRequest = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertManagerAccess(pid(req), callerId, callerRole);

  const { type, description, price } = req.body;
  if (!type || !description) {
    throw new AppError("Type and description are required.", HttpStatus.BAD_REQUEST);
  }

  const cr = await prisma.changeRequest.create({
    data: {
      projectId:     pid(req),
      type:          type.trim(),
      description:   description.trim(),
      price:         price ? parseFloat(price) : undefined,
      status:        "PENDING",
      requestedById: callerId,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "CHANGE_REQUEST_CREATED",
      meta:   { projectId: pid(req), changeRequestId: cr.id, type },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success", data: { changeRequest: cr },
  });
});

// ─── UPDATE STATUS ────────────────────────────────────────────────────────────
export const updateChangeRequestStatus = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertManagerAccess(pid(req), callerId, callerRole);

  const isManager =
    callerRole === Role.ADMIN || callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!isManager) throw new AppError("Only the project manager can update change requests.", HttpStatus.FORBIDDEN);

  const { status } = req.body;
  if (!status) throw new AppError("Status is required.", HttpStatus.BAD_REQUEST);

  const cr = await prisma.changeRequest.update({
    where: { id: cid(req) },
    data: {
      status,
      ...(status === "APPROVED" && { approvedById: callerId, approvedAt: new Date() }),
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success", data: { changeRequest: cr },
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteChangeRequest = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertManagerAccess(pid(req), callerId, callerRole);

  const isManager =
    callerRole === Role.ADMIN || callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!isManager) throw new AppError("Only the project manager can delete change requests.", HttpStatus.FORBIDDEN);

  await prisma.changeRequest.delete({ where: { id: cid(req) } });

  return res.status(HttpStatus.NO_CONTENT).send();
});