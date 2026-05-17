import { Request, Response } from "express";
import { prisma } from "@repo/database";
import { HttpStatus, Role } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";

// ─── SUBMIT INTAKE FORM (public — no auth required) ───────────────────────────

export const submitIntake = catchAsync(async (req: Request, res: Response) => {
  const {
    clientName, clientEmail, clientPhone, companyName,
    projectName, projectType, description,
    budgetRange, preferredTimeline, referenceLinks,
  } = req.body;

  if (!clientName || !clientEmail || !projectName || !projectType || !description) {
    throw new AppError(
      "Name, email, project name, type, and description are required.",
      HttpStatus.BAD_REQUEST,
    );
  }

  const intake = await prisma.intakeForm.create({
    data: {
      clientName:        clientName.trim(),
      clientEmail:       clientEmail.trim().toLowerCase(),
      clientPhone:       clientPhone?.trim(),
      companyName:       companyName?.trim(),
      projectName:       projectName.trim(),
      projectType:       projectType.trim(),
      description:       description.trim(),
      budgetRange:       budgetRange?.trim(),
      preferredTimeline: preferredTimeline?.trim(),
      referenceLinks:    referenceLinks ?? [],
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: "Thank you — we will be in touch within 24 hours.",
    data:    { intakeId: intake.id },
  });
});

// ─── LIST INTAKE FORMS (ADMIN / MANAGER) ─────────────────────────────────────

export const listIntakes = catchAsync(async (req: Request, res: Response) => {
  const { converted } = req.query;

  const intakes = await prisma.intakeForm.findMany({
    where: {
      ...(converted !== undefined && {
        isConverted: converted === "true",
      }),
    },
    orderBy: { createdAt: "desc" },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: intakes.length,
    data:    { intakes },
  });
});

// ─── GET SINGLE INTAKE ────────────────────────────────────────────────────────

export const getIntake = catchAsync(async (req: Request, res: Response) => {
  const intake = await prisma.intakeForm.findUnique({
    where:   { id: req.params.id },
    include: { project: { select: { id: true, name: true, status: true } } },
  });

  if (!intake) {
    throw new AppError("Intake form not found.", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { intake },
  });
});

// ─── CONVERT INTAKE TO PROJECT ────────────────────────────────────────────────
// Admin/Manager reviews intake and creates a project from it

export const convertIntake = catchAsync(async (req: Request, res: Response) => {
  const { clientId, managerId, budget, currency, deadline } = req.body;

  const intake = await prisma.intakeForm.findUnique({
    where: { id: req.params.id },
  });

  if (!intake) {
    throw new AppError("Intake form not found.", HttpStatus.NOT_FOUND);
  }

  if (intake.isConverted) {
    throw new AppError("This intake has already been converted to a project.", HttpStatus.CONFLICT);
  }

  if (!clientId) {
    throw new AppError("A client user ID is required to convert this intake.", HttpStatus.BAD_REQUEST);
  }

  const resolvedManagerId =
    managerId ?? (req.user!.role === Role.MANAGER ? req.user!.userId : undefined);

  if (!resolvedManagerId) {
    throw new AppError("A manager must be assigned.", HttpStatus.BAD_REQUEST);
  }

  // Create the project and mark intake as converted in one transaction
  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        name:        intake.projectName,
        description: intake.description,
        managerId:   resolvedManagerId,
        clientId,
        budget:      budget ? parseFloat(budget) : undefined,
        currency:    currency ?? "ZAR",
        deadline:    deadline ? new Date(deadline) : undefined,
        status:      "INTAKE",
      },
    });

    await tx.intakeForm.update({
      where: { id: intake.id },
      data:  { isConverted: true, projectId: p.id },
    });

    return p;
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "INTAKE_CONVERTED",
      meta:   { intakeId: intake.id, projectId: project.id },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: "Intake converted to project successfully.",
    data:    { projectId: project.id },
  });
});