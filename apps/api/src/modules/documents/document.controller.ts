import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const pid = (req: Request) => req.params.projectId as string;
const did = (req: Request) => req.params.id as string;

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

// ─── LIST DOCUMENTS ───────────────────────────────────────────────────────────

export const listDocuments = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const { type } = req.query;

  const documents = await prisma.document.findMany({
    where: {
      projectId: pid(req),
      isLatest:  true,
      ...(type && { type: type as any }),
    },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: documents.length,
    data:    { documents },
  });
});

// ─── GET SINGLE DOCUMENT ──────────────────────────────────────────────────────

export const getDocument = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const document = await prisma.document.findUnique({
    where: { id: did(req) },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      },
    },
  });

  if (!document || document.projectId !== pid(req)) {
    throw new AppError("Document not found.", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { document },
  });
});

// ─── CREATE DOCUMENT (text/AI-generated) ─────────────────────────────────────

export const createDocument = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  // Clients can only view, not create
  if (callerRole === Role.CLIENT) {
    throw new AppError("Clients cannot upload documents.", HttpStatus.FORBIDDEN);
  }

  const { type, title, content, fileUrl, fileSize, mimeType } = req.body;

  if (!type || !title) {
    throw new AppError("Type and title are required.", HttpStatus.BAD_REQUEST);
  }

  // If a previous version exists for this type, mark it as not latest
  await prisma.document.updateMany({
    where: { projectId: pid(req), type, isLatest: true },
    data:  { isLatest: false },
  });

  // Get current version number
  const prevCount = await prisma.document.count({
    where: { projectId: pid(req), type },
  });

  const document = await prisma.document.create({
    data: {
      projectId:    pid(req),
      type,
      title:        title.trim(),
      content:      content?.trim(),
      fileUrl,
      fileSize,
      mimeType,
      uploadedById: callerId,
      version:      prevCount + 1,
      isLatest:     true,
    },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: callerId,
      action: "DOCUMENT_CREATED",
      meta:   { documentId: document.id, projectId: pid(req), type, title },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success",
    data:   { document },
  });
});

// ─── UPDATE DOCUMENT ──────────────────────────────────────────────────────────

export const updateDocument = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  if (callerRole === Role.CLIENT) {
    throw new AppError("Clients cannot edit documents.", HttpStatus.FORBIDDEN);
  }

  const document = await prisma.document.findUnique({ where: { id: did(req) } });
  if (!document || document.projectId !== pid(req)) {
    throw new AppError("Document not found.", HttpStatus.NOT_FOUND);
  }

  const { title, content } = req.body;

  const updated = await prisma.document.update({
    where: { id: did(req) },
    data: {
      ...(title   && { title: title.trim() }),
      ...(content !== undefined && { content: content?.trim() }),
    },
    include: {
      uploadedBy: {
        select: { id: true, firstName: true, lastName: true, displayName: true, email: true },
      },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { document: updated },
  });
});

// ─── DELETE DOCUMENT ──────────────────────────────────────────────────────────

export const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project = await assertProjectAccess(pid(req), callerId, callerRole);

  const isManager =
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN ||
    project.managerId === callerId;

  if (!isManager) {
    throw new AppError("Only the project manager can delete documents.", HttpStatus.FORBIDDEN);
  }

  const document = await prisma.document.findUnique({ where: { id: did(req) } });
  if (!document || document.projectId !== pid(req)) {
    throw new AppError("Document not found.", HttpStatus.NOT_FOUND);
  }

  await prisma.document.delete({ where: { id: did(req) } });

  return res.status(HttpStatus.NO_CONTENT).send();
});