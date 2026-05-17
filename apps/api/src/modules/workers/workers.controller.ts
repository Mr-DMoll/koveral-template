import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";
import { scopeWorker, contractWorker, taskGeneratorWorker, handoverWorker, changeRequestWorker } from "./workers.js";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

async function assertManagerAccess(projectId: string, userId: string, role: Role) {
  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: { managerId: true, name: true, status: true },
  });

  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const canRun =
    role === Role.ADMIN ||
    role === Role.SUPER_ADMIN ||
    project.managerId === userId;

  if (!canRun) {
    throw new AppError("Only the project manager can run automation workers.", HttpStatus.FORBIDDEN);
  }

  return project;
}

// ─── TRIGGER SCOPE WORKER ────────────────────────────────────────────────────
// POST /api/v1/projects/:projectId/workers/scope
// Reads intake form, generates scope document, saves it, moves project to SCOPE_DRAFT

export const triggerScopeWorker = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;
  const projectId  = req.params.projectId;

  const project = await assertManagerAccess(projectId, callerId, callerRole);

  // Check project is in a state where scope makes sense
  if (!["INTAKE", "SCOPE_DRAFT"].includes(project.status)) {
    throw new AppError(
      `Cannot generate scope for a project in ${project.status} status.`,
      HttpStatus.BAD_REQUEST,
    );
  }

  // Run the worker
  let content: string;
  try {
    content = await scopeWorker(projectId);
  } catch (err: any) {
    throw new AppError(
      `Scope generation failed: ${err.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Deactivate previous scope docs
  await prisma.document.updateMany({
    where: { projectId, type: "SCOPE", isLatest: true },
    data:  { isLatest: false },
  });

  // Count existing scope versions
  const prevCount = await prisma.document.count({ where: { projectId, type: "SCOPE" } });

  // Save the generated document
  const document = await prisma.document.create({
    data: {
      projectId,
      type:         "SCOPE",
      title:        `Project Scope — ${project.name}`,
      content,
      uploadedById: callerId,
      version:      prevCount + 1,
      isLatest:     true,
    },
  });

  // Move project to SCOPE_DRAFT
  await prisma.project.update({
    where: { id: projectId },
    data:  { status: "SCOPE_DRAFT" },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "SCOPE_GENERATED",
      meta:   { projectId, documentId: document.id },
    },
  });

  // Notify the manager (self-notification as confirmation)
  await prisma.notification.create({
    data: {
      userId:    callerId,
      projectId,
      title:     "Scope document generated",
      message:   `AI has generated a scope document for "${project.name}". Please review and edit before sharing with the client.`,
      type:      "scope_generated",
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: "Scope document generated successfully.",
    data:    { document },
  });
});

// ─── TRIGGER CONTRACT WORKER ─────────────────────────────────────────────────
// POST /api/v1/projects/:projectId/workers/contract

export const triggerContractWorker = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;
  const projectId  = req.params.projectId;

  const project = await assertManagerAccess(projectId, callerId, callerRole);

  if (!["SCOPE_REVIEW", "CONTRACT_DRAFT", "IN_DESIGN", "DESIGN_REVIEW"].includes(project.status)) {
    throw new AppError(
      "Contract can only be generated after the scope has been reviewed.",
      HttpStatus.BAD_REQUEST,
    );
  }

  let content: string;
  try {
    content = await contractWorker(projectId);
  } catch (err: any) {
    throw new AppError(
      `Contract generation failed: ${err.message}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  // Deactivate previous contracts
  await prisma.document.updateMany({
    where: { projectId, type: "CONTRACT", isLatest: true },
    data:  { isLatest: false },
  });

  const prevCount = await prisma.document.count({ where: { projectId, type: "CONTRACT" } });

  const document = await prisma.document.create({
    data: {
      projectId,
      type:         "CONTRACT",
      title:        `Service Agreement — ${project.name}`,
      content,
      uploadedById: callerId,
      version:      prevCount + 1,
      isLatest:     true,
    },
  });

  // Move to CONTRACT_DRAFT
  await prisma.project.update({
    where: { id: projectId },
    data:  { status: "CONTRACT_DRAFT" },
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "CONTRACT_GENERATED",
      meta:   { projectId, documentId: document.id },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: "Contract generated successfully.",
    data:    { document },
  });
});

// ─── WORKER STATUS ────────────────────────────────────────────────────────────
// GET /api/v1/projects/:projectId/workers/status
// Returns which workers are available to run based on project status

export const workerStatus = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;
  const projectId  = req.params.projectId;

  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: {
      status:    true,
      managerId: true,
      intakeForm: { select: { id: true, description: true } },
      documents:  {
        where:   { isLatest: true },
        select:  { type: true },
      },
    },
  });

  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const isManager =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  const hasScope    = project.documents.some((d) => d.type === "SCOPE");
  const hasContract = project.documents.some((d) => d.type === "CONTRACT");
  const hasHandover = project.documents.some((d) => d.type === "HANDOVER");
  const hasTasks    = (await prisma.milestone.count({ where: { projectId } })) > 0;
  const hasIntake   = !!project.intakeForm;

  return res.status(HttpStatus.OK).json({
    status: "success",
    data: {
      canRunScope:    isManager && ["INTAKE", "SCOPE_DRAFT"].includes(project.status),
      canRunContract: isManager && ["SCOPE_REVIEW", "CONTRACT_DRAFT", "IN_DESIGN", "DESIGN_REVIEW"].includes(project.status),
      canRunTasks:    isManager && ["SCOPE_DRAFT", "SCOPE_REVIEW", "CONTRACT_DRAFT", "CONTRACT_REVIEW", "ACTIVE"].includes(project.status),
      canRunHandover: isManager && ["ACTIVE", "COMPLETE"].includes(project.status),
      hasScope,
      hasContract,
      hasHandover,
      hasTasks,
      hasIntake,
      projectStatus: project.status,
    },
  });

});


// ─── TRIGGER TASK GENERATOR ───────────────────────────────────────────────────
// POST /api/v1/projects/:projectId/workers/tasks
// Reads scope document → generates milestones + tasks → saves to DB

export const triggerTaskGenerator = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;
  const projectId  = req.params.projectId;

  // Check access
  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: { managerId: true, name: true, status: true, budget: true, startDate: true, deadline: true },
  });

  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const canRun =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!canRun) throw new AppError("Only the project manager can run workers.", HttpStatus.FORBIDDEN);

  // Run the worker
  let generated;
  try {
    generated = await taskGeneratorWorker(projectId);
  } catch (err: any) {
    throw new AppError(`Task generation failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Save milestones and tasks in a transaction
  const result = await prisma.$transaction(async (tx) => {
  const createdMilestones = [];

  for (let i = 0; i < generated.length; i++) {
    const gen = generated[i];

    const startDate = project.startDate ? new Date(project.startDate) : new Date();
    const dueDate   = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + (gen.dueWeeks * 7));

    const agreedAmount = project.budget
      ? (parseFloat(project.budget.toString()) * gen.budgetPct / 100)
      : null;

    const milestone = await tx.milestone.create({
      data: {
        projectId,
        title:        gen.title,
        description:  gen.description,
        deliverables: gen.deliverables,
        dueDate,
        agreedAmount: agreedAmount ?? undefined,
        order:        i,
        status:       "PENDING",
      },
    });

    // Batch create all tasks for this milestone in one call
    await tx.task.createMany({
      data: gen.tasks.map((task) => ({
        projectId,
        milestoneId: milestone.id,
        title:       task.title,
        description: task.description,
        priority:    task.priority,
        status:      "BACKLOG",
        createdById: callerId,
      })),
    });

    createdMilestones.push(milestone);
  }

  return createdMilestones;
}, {
  timeout: 30000, // 30 seconds
});




  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "TASKS_GENERATED",
      meta: {
        projectId,
        milestonesCreated: result.length,
        tasksCreated: generated.reduce((sum, m) => sum + m.tasks.length, 0),
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId:    callerId,
      projectId,
      title:     "Tasks & milestones generated",
      message:   `AI generated ${result.length} milestones and ${generated.reduce((s, m) => s + m.tasks.length, 0)} tasks for "${project.name}". Review in the Milestones and Tasks tabs.`,
      type:      "tasks_generated",
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: `Generated ${result.length} milestones and ${generated.reduce((s, m) => s + m.tasks.length, 0)} tasks.`,
    data: {
      milestonesCreated: result.length,
      tasksCreated:      generated.reduce((sum, m) => sum + m.tasks.length, 0),
    },
  });
});

// ─── TRIGGER HANDOVER WORKER ──────────────────────────────────────────────────
// POST /api/v1/projects/:projectId/workers/handover

export const triggerHandoverWorker = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;
  const projectId  = req.params.projectId;

  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: { managerId: true, name: true, status: true },
  });

  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const canRun =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!canRun) throw new AppError("Only the project manager can run workers.", HttpStatus.FORBIDDEN);

  if (!["COMPLETE", "ACTIVE"].includes(project.status)) {
    throw new AppError("Handover document can only be generated for active or complete projects.", HttpStatus.BAD_REQUEST);
  }

  let content: string;
  try {
    content = await handoverWorker(projectId);
  } catch (err: any) {
    throw new AppError(`Handover generation failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Deactivate previous handover docs
  await prisma.document.updateMany({
    where: { projectId, type: "HANDOVER", isLatest: true },
    data:  { isLatest: false },
  });

  const prevCount = await prisma.document.count({ where: { projectId, type: "HANDOVER" } });

  const document = await prisma.document.create({
    data: {
      projectId,
      type:         "HANDOVER",
      title:        `Project Handover — ${project.name}`,
      content,
      uploadedById: callerId,
      version:      prevCount + 1,
      isLatest:     true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "HANDOVER_GENERATED",
      meta:   { projectId, documentId: document.id },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: "Handover document generated.",
    data:    { document },
  });
});

// ─── TRIGGER CHANGE REQUEST WORKER ────────────────────────────────────────────
// Also add to import: changeRequestWorker

// POST /api/v1/projects/:projectId/workers/change-request
// Body: { changeRequestId: string }

export const triggerChangeRequestWorker = catchAsync(async (req: Request, res: Response) => {
  const callerRole       = req.user!.role as Role;
  const callerId         = req.user!.userId;
  const projectId        = req.params.projectId;
  const { changeRequestId } = req.body;

  if (!changeRequestId) {
    throw new AppError("changeRequestId is required.", HttpStatus.BAD_REQUEST);
  }

  const project = await prisma.project.findUnique({
    where:  { id: projectId },
    select: { managerId: true, name: true },
  });

  if (!project) throw new AppError("Project not found.", HttpStatus.NOT_FOUND);

  const canRun =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!canRun) throw new AppError("Only the project manager can run workers.", HttpStatus.FORBIDDEN);

  let content: string;
  try {
    content = await changeRequestWorker(projectId, changeRequestId);
  } catch (err: any) {
    throw new AppError(`Change request generation failed: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  // Save as OTHER document type with CR reference in title
  const crCount = await prisma.document.count({
    where: { projectId, title: { contains: "Change Request" } },
  });

  const document = await prisma.document.create({
    data: {
      projectId,
      type:         "OTHER",
      title:        `Change Request #${crCount + 1} — ${project.name}`,
      content,
      uploadedById: callerId,
      version:      1,
      isLatest:     true,
    },
  });

  // Mark change request as having a document
  await prisma.changeRequest.update({
    where: { id: changeRequestId },
    data:  { status: "PENDING" }, // reset to pending after document generated
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "CHANGE_REQUEST_DOCUMENT_GENERATED",
      meta:   { projectId, changeRequestId, documentId: document.id },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: "Change request document generated.",
    data:    { document },
  });
});