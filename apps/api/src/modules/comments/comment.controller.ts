import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

const pid = (req: Request) => req.params.projectId as string;
const cid = (req: Request) => req.params.id as string;

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

// ─── LIST COMMENTS ────────────────────────────────────────────────────────────
// ?documentId=xxx  → comments for that document only
// no param         → project-level comments (documentId IS NULL)

export const listComments = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project    = await assertProjectAccess(pid(req), callerId, callerRole);
  const isClient   = project.clientId === callerId && callerRole === Role.CLIENT;
  const { documentId } = req.query;

  const comments = await prisma.comment.findMany({
    where: {
      projectId:  pid(req),
      documentId: documentId ? (documentId as string) : null,
      ...(isClient && { isInternal: false }),
    },
    include: {
      author: {
        select: {
          id: true, firstName: true, lastName: true,
          displayName: true, email: true, avatarUrl: true, role: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: comments.length,
    data:    { comments },
  });
});

// ─── CREATE COMMENT ───────────────────────────────────────────────────────────

export const createComment = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  const project  = await assertProjectAccess(pid(req), callerId, callerRole);
  const isClient = project.clientId === callerId && callerRole === Role.CLIENT;

  const { content, isInternal, documentId } = req.body;

  if (!content?.trim()) {
    throw new AppError("Comment content is required.", HttpStatus.BAD_REQUEST);
  }

  if (isClient && isInternal) {
    throw new AppError("Clients cannot post internal comments.", HttpStatus.FORBIDDEN);
  }

  const comment = await prisma.comment.create({
    data: {
      projectId:  pid(req),
      documentId: documentId || null,
      authorId:   callerId,
      content:    content.trim(),
      isInternal: isInternal ?? false,
    },
    include: {
      author: {
        select: {
          id: true, firstName: true, lastName: true,
          displayName: true, email: true, avatarUrl: true, role: true,
        },
      },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status: "success",
    data:   { comment },
  });
});

// ─── DELETE COMMENT ───────────────────────────────────────────────────────────

export const deleteComment = catchAsync(async (req: Request, res: Response) => {
  const callerRole = req.user!.role as Role;
  const callerId   = req.user!.userId;

  await assertProjectAccess(pid(req), callerId, callerRole);

  const comment = await prisma.comment.findUnique({ where: { id: cid(req) } });
  if (!comment || comment.projectId !== pid(req)) {
    throw new AppError("Comment not found.", HttpStatus.NOT_FOUND);
  }

  const canDelete =
    comment.authorId === callerId ||
    callerRole === Role.ADMIN ||
    callerRole === Role.SUPER_ADMIN;

  if (!canDelete) {
    throw new AppError("You can only delete your own comments.", HttpStatus.FORBIDDEN);
  }

  await prisma.comment.delete({ where: { id: cid(req) } });

  return res.status(HttpStatus.NO_CONTENT).send();
});
