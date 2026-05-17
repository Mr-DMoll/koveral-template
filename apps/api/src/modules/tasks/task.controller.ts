import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const pid = (req: Request) => req.params.projectId as string;
const tid = (req: Request) => req.params.id as string;

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

// ─── LIST TASKS ───────────────────────────────────────────────────────────────

export const listTasks = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const { status, milestoneId, assigneeId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      projectId: pid(req),
      ...(status      && { status:      status      as any }),
      ...(milestoneId && { milestoneId: milestoneId as string }),
      ...(assigneeId  && { assigneeId:  assigneeId  as string }),
    },
    include: {
      assignee:  { select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: tasks.length,
    data:    { tasks },
  });
});

// ─── GET SINGLE TASK ──────────────────────────────────────────────────────────

export const getTask = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const task = await prisma.task.findUnique({
    where: { id: tid(req) },
    include: {
      assignee:  { select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
  });

  if (!task || task.projectId !== pid(req)) {
    throw new AppError("Task not found.", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { task },
  });
});

// ─── CREATE TASK ──────────────────────────────────────────────────────────────

export const createTask = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  // Only manager or admin can create tasks
  if (
    callerRole !== Role.ADMIN &&
    callerRole !== Role.SUPER_ADMIN &&
    project.managerId !== callerId
  ) {
    throw new AppError("Only the project manager can create tasks.", HttpStatus.FORBIDDEN);
  }

  const { title, description, status, priority, assigneeId, milestoneId, dueDate } = req.body;

  if (!title) {
    throw new AppError("Title is required.", HttpStatus.BAD_REQUEST);
  }

  // Verify assignee is on the project if provided
  if (assigneeId) {
    const isOnProject =
      project.managerId === assigneeId ||
      project.members.some((m) => m.userId === assigneeId);

    if (!isOnProject) {
      throw new AppError("Assignee is not a member of this project.", HttpStatus.BAD_REQUEST);
    }
  }

  const task = await prisma.task.create({
    data: {
      projectId:   pid(req),
      title:       title.trim(),
      description: description?.trim(),
      status:      status    ?? "BACKLOG",
      priority:    priority  ?? "MEDIUM",
      assigneeId:  assigneeId  || undefined,
      milestoneId: milestoneId || undefined,
      dueDate:     dueDate ? new Date(dueDate) : undefined,
      createdById: callerId,
    },
    include: {
      assignee:  { select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success",
    data:   { task },
  });
});

// ─── UPDATE TASK ──────────────────────────────────────────────────────────────

export const updateTask = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  const task = await prisma.task.findUnique({ where: { id: tid(req) } });
  if (!task || task.projectId !== pid(req)) {
    throw new AppError("Task not found.", HttpStatus.NOT_FOUND);
  }

  // Developers can only update status on tasks assigned to them
  const isManager =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  const isDeveloperOnTask =
    callerRole === Role.DEVELOPER && task.assigneeId === callerId;

  if (!isManager && !isDeveloperOnTask) {
    throw new AppError("You can only update tasks assigned to you.", HttpStatus.FORBIDDEN);
  }

  const { title, description, status, priority, assigneeId, milestoneId, dueDate } = req.body;

  // Developers can only change status
  const data: any = {};

  if (isManager) {
    if (title       !== undefined) data.title       = title?.trim();
    if (description !== undefined) data.description = description?.trim();
    if (priority    !== undefined) data.priority    = priority;
    if (assigneeId  !== undefined) data.assigneeId  = assigneeId  || null;
    if (milestoneId !== undefined) data.milestoneId = milestoneId || null;
    if (dueDate     !== undefined) data.dueDate     = dueDate ? new Date(dueDate) : null;
  }

  if (status !== undefined) {
    data.status = status;
    if (status === "DONE") data.completedAt = new Date();
    if (status !== "DONE") data.completedAt = null;
  }

  const updated = await prisma.task.update({
    where: { id: tid(req) },
    data,
    include: {
      assignee:  { select: { id: true, firstName: true, lastName: true, displayName: true, email: true, avatarUrl: true } },
      createdBy: { select: { id: true, firstName: true, lastName: true, displayName: true, email: true } },
      milestone: { select: { id: true, title: true } },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { task: updated },
  });
});

// ─── DELETE TASK ──────────────────────────────────────────────────────────────

export const deleteTask = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  const isManager =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!isManager) {
    throw new AppError("Only the project manager can delete tasks.", HttpStatus.FORBIDDEN);
  }

  const task = await prisma.task.findUnique({ where: { id: tid(req) } });
  if (!task || task.projectId !== pid(req)) {
    throw new AppError("Task not found.", HttpStatus.NOT_FOUND);
  }

  await prisma.task.delete({ where: { id: tid(req) } });

  return res.status(HttpStatus.NO_CONTENT).send();
});