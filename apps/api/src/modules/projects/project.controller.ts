import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const pid = (req: Request) => req.params.id as string;

// What each role is allowed to see
function projectWhereClause(userId: string, role: Role) {
  switch (role) {
    case Role.SUPER_ADMIN:
    case Role.ADMIN:
      return {}; // see all projects
    case Role.MANAGER:
      return { managerId: userId }; // only their managed projects
    case Role.DEVELOPER:
      return {
        members: { some: { userId } }, // only projects they are a member of
      };
    case Role.CLIENT:
      return { clientId: userId }; // only their own project
    default:
      return { id: "never" };
  }
}

const PROJECT_SELECT = {
  id:          true,
  name:        true,
  description: true,
  status:      true,
  budget:      true,
  spent:       true,
  currency:    true,
  startDate:   true,
  deadline:    true,
  completedAt: true,
  repositoryUrl: true,
  liveSiteUrl:   true,
  figmaUrl:      true,
  createdAt:   true,
  updatedAt:   true,
  manager: {
    select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true },
  },
  client: {
    select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true },
  },
  members: {
    select: {
      id: true, role: true, joinedAt: true,
      user: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true, role: true } },
    },
  },
  _count: {
    select: { milestones: true, tasks: true, documents: true, invoices: true },
  },
} as const;

// ─── LIST PROJECTS ────────────────────────────────────────────────────────────

export const listProjects = catchAsync(async (req: Request, res: Response) => {
  const { status, search } = req.query;
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const where = {
    ...projectWhereClause(callerId, callerRole),
    ...(status && { status: status as any }),
    ...(search && {
      OR: [
        { name:        { contains: search as string, mode: "insensitive" as const } },
        { description: { contains: search as string, mode: "insensitive" as const } },
      ],
    }),
  };

  const projects = await prisma.project.findMany({
    where,
    select:  PROJECT_SELECT,
    orderBy: { updatedAt: "desc" },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: projects.length,
    data:    { projects },
  });
});

// ─── GET SINGLE PROJECT ───────────────────────────────────────────────────────

export const getProject = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await prisma.project.findUnique({
    where:  { id: pid(req) },
    select: PROJECT_SELECT,
  });

  if (!project) {
    throw new AppError("Project not found.", HttpStatus.NOT_FOUND);
  }

  // Access check
  const hasAccess =
    callerRole === Role.SUPER_ADMIN ||
    callerRole === Role.ADMIN ||
    project.manager.id === callerId ||
    project.client.id  === callerId ||
    project.members.some((m) => m.user.id === callerId);

  if (!hasAccess) {
    throw new AppError("You do not have access to this project.", HttpStatus.FORBIDDEN);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { project },
  });
});

// ─── CREATE PROJECT ───────────────────────────────────────────────────────────

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const {
    name, description, clientId, managerId,
    budget, currency, startDate, deadline,
    repositoryUrl, liveSiteUrl, figmaUrl,
    intakeFormId,
  } = req.body;

  if (!name || !clientId) {
    throw new AppError("Name and client are required.", HttpStatus.BAD_REQUEST);
  }

  // Resolve manager — if not provided use the caller (if they are a manager)
  const resolvedManagerId =
    managerId ?? (req.user!.role === Role.MANAGER ? req.user!.userId : undefined);

  if (!resolvedManagerId) {
    throw new AppError("A manager must be assigned to the project.", HttpStatus.BAD_REQUEST);
  }

  // Verify client exists and has CLIENT role
  const client = await prisma.user.findUnique({ where: { id: clientId } });
  if (!client || client.role !== "CLIENT") {
    throw new AppError("Invalid client — user not found or not a client.", HttpStatus.BAD_REQUEST);
  }

  // Verify manager exists
  const manager = await prisma.user.findUnique({ where: { id: resolvedManagerId } });
  if (!manager || !["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(manager.role)) {
    throw new AppError("Invalid manager.", HttpStatus.BAD_REQUEST);
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      managerId: resolvedManagerId,
      clientId,
      budget:    budget ? parseFloat(budget) : undefined,
      currency:  currency ?? "ZAR",
      startDate: startDate ? new Date(startDate) : undefined,
      deadline:  deadline  ? new Date(deadline)  : undefined,
      repositoryUrl,
      liveSiteUrl,
      figmaUrl,
      status: "INTAKE",
    },
    select: PROJECT_SELECT,
  });

  // If created from an intake form, mark it as converted
  if (intakeFormId) {
    await prisma.intakeForm.update({
      where: { id: intakeFormId },
      data:  { isConverted: true, projectId: project.id },
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "PROJECT_CREATED",
      meta:   { projectId: project.id, projectName: name },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success",
    data:   { project },
  });
});

// ─── UPDATE PROJECT ───────────────────────────────────────────────────────────

export const updateProject = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;

  const project = await prisma.project.findUnique({ where: { id: pid(req) } });
  if (!project) {
    throw new AppError("Project not found.", HttpStatus.NOT_FOUND);
  }

  // Only admin or the assigned manager can update
  const canUpdate =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === req.user!.userId;

  if (!canUpdate) {
    throw new AppError("You do not have permission to update this project.", HttpStatus.FORBIDDEN);
  }

  const {
    name, description, status,
    budget, currency, startDate, deadline,
    repositoryUrl, liveSiteUrl, figmaUrl,
  } = req.body;

  const updated = await prisma.project.update({
    where: { id: pid(req) },
    data: {
      ...(name          && { name }),
      ...(description   !== undefined && { description }),
      ...(status        && { status }),
      ...(budget        !== undefined && { budget: budget ? parseFloat(budget) : null }),
      ...(currency      && { currency }),
      ...(startDate     !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(deadline      !== undefined && { deadline:  deadline  ? new Date(deadline)  : null }),
      ...(repositoryUrl !== undefined && { repositoryUrl }),
      ...(liveSiteUrl   !== undefined && { liveSiteUrl }),
      ...(figmaUrl      !== undefined && { figmaUrl }),
    },
    select: PROJECT_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "PROJECT_UPDATED",
      meta:   { projectId: pid(req), changes: req.body },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { project: updated },
  });
});

// ─── UPDATE PROJECT STATUS ────────────────────────────────────────────────────

export const updateProjectStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;
  const callerRole  = req.user!.role as Role;

  if (!status) {
    throw new AppError("Status is required.", HttpStatus.BAD_REQUEST);
  }

  const project = await prisma.project.findUnique({ where: { id: pid(req) } });
  if (!project) {
    throw new AppError("Project not found.", HttpStatus.NOT_FOUND);
  }

  const canUpdate =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === req.user!.userId;

  if (!canUpdate) {
    throw new AppError("Insufficient permissions to change project status.", HttpStatus.FORBIDDEN);
  }

  // Mark completedAt when moving to COMPLETE
  const completedAt = status === "COMPLETE" ? new Date() : undefined;

  const updated = await prisma.project.update({
    where: { id: pid(req) },
    data:  { status, ...(completedAt && { completedAt }) },
    select: PROJECT_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "PROJECT_STATUS_CHANGED",
      meta:   { projectId: pid(req), from: project.status, to: status },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { project: updated },
  });
});

// ─── ADD PROJECT MEMBER ───────────────────────────────────────────────────────

export const addProjectMember = catchAsync(async (req: Request, res: Response) => {
  const { userId, role: memberRole } = req.body;
  const callerRole = req.user!.role as Role;

  if (!userId) {
    throw new AppError("User ID is required.", HttpStatus.BAD_REQUEST);
  }

  const project = await prisma.project.findUnique({ where: { id: pid(req) } });
  if (!project) {
    throw new AppError("Project not found.", HttpStatus.NOT_FOUND);
  }

  const canManage =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === req.user!.userId;

  if (!canManage) {
    throw new AppError("Insufficient permissions.", HttpStatus.FORBIDDEN);
  }

  // Check user exists
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found.", HttpStatus.NOT_FOUND);
  }

  // Upsert — if already a member, update their role
  const member = await prisma.projectMember.upsert({
    where:  { projectId_userId: { projectId: pid(req), userId } },
    create: { projectId: pid(req), userId, role: memberRole ?? user.role },
    update: { role: memberRole ?? user.role },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { member },
  });
});

// ─── REMOVE PROJECT MEMBER ────────────────────────────────────────────────────

export const removeProjectMember = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const callerRole = req.user!.role as Role;

  const project = await prisma.project.findUnique({ where: { id: pid(req) } });
  if (!project) {
    throw new AppError("Project not found.", HttpStatus.NOT_FOUND);
  }

  const canManage =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === req.user!.userId;

  if (!canManage) {
    throw new AppError("Insufficient permissions.", HttpStatus.FORBIDDEN);
  }

  await prisma.projectMember.deleteMany({
    where: { projectId: pid(req), userId },
  });

  return res.status(HttpStatus.NO_CONTENT).send();
});

// ─── DELETE PROJECT ───────────────────────────────────────────────────────────

export const deleteProject = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;

  if (callerRole !== Role.ADMIN && callerRole !== Role.SUPER_ADMIN) {
    throw new AppError("Only admins can delete projects.", HttpStatus.FORBIDDEN);
  }

  const project = await prisma.project.findUnique({ where: { id: pid(req) } });
  if (!project) {
    throw new AppError("Project not found.", HttpStatus.NOT_FOUND);
  }

  await prisma.project.delete({ where: { id: pid(req) } });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "PROJECT_DELETED",
      meta:   { projectId: pid(req), projectName: project.name },
    },
  });

  return res.status(HttpStatus.NO_CONTENT).send();
});