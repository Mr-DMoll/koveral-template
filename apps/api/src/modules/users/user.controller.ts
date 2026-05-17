import { Request, Response } from "express";
import crypto from "crypto";
import { prisma, AccountStatus, Role as PrismaRole } from "@repo/database";
import { HttpStatus, Role, OtpType } from "@repo/types";
import { catchAsync } from "../../utils/catchAsync.js";
import { AppError } from "../../utils/appError.js";
import { sendVerificationEmail } from "../../services/mail.service.js";

const pid = (req: Request) => req.params.id as string;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const SAFE_USER_SELECT = {
  id:            true,
  email:         true,
  role:          true,
  accountStatus: true,
  firstName:     true,
  lastName:      true,
  displayName:   true,
  avatarUrl:     true,
  createdAt:     true,
  updatedAt:     true,
} as const;

// ─── STAFF PROVISIONING ───────────────────────────────────────────────────────

export const provisionStaff = catchAsync(async (req: Request, res: Response) => {
  const { email, role } = req.body;

  console.log("🔍 PROVISION DEBUG:", { email, role, callerRole: req.user?.role });

  if (!email || !role) {
    throw new AppError("Email and role are required.", HttpStatus.BAD_REQUEST);
  }

  // Nobody can provision a SUPER_ADMIN via API
  if (role === Role.SUPER_ADMIN) {
    throw new AppError(
      "Super Admin can only be created via seed script.",
      HttpStatus.FORBIDDEN,
    );
  }

  // ADMIN can only provision MANAGER and DEVELOPER
  if (
    req.user?.role === Role.ADMIN &&
    ![Role.MANAGER, Role.DEVELOPER].includes(role as Role)
  ) {
    throw new AppError(
      "Admins can only provision Managers and Developers.",
      HttpStatus.FORBIDDEN,
    );
  }

  // MANAGER can only provision DEVELOPER and CLIENT
  if (
    req.user?.role === Role.MANAGER &&
    ![Role.DEVELOPER, Role.CLIENT].includes(role as Role)
  ) {
    throw new AppError(
      "Managers can only add Developers and Clients.",
      HttpStatus.FORBIDDEN,
    );
  }

  const normalized = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalized } });
  if (existing) {
    throw new AppError(
      "A user with this email already exists.",
      HttpStatus.CONFLICT,
    );
  }

  const tempPassword = crypto.randomBytes(12).toString("hex") + "!Aa1";
  const user = await prisma.user.create({
    data: {
      email:         normalized,
      password:      tempPassword,
      role:          role as PrismaRole,
      accountStatus: "PENDING",
    },
    select: SAFE_USER_SELECT,
  });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.otpCode.create({
    data: {
      code:      token,
      target:    normalized,
      type:      OtpType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      userId:    user.id,
    },
  });

  try {
    await sendVerificationEmail(normalized, token);
  } catch (emailError: any) {
    console.error("❌ [MAIL] Failed to send activation email:", emailError?.message);
  }

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "USER_PROVISIONED",
      meta:   { provisionedEmail: normalized, provisionedRole: role },
    },
  });

  return res.status(HttpStatus.CREATED).json({
    status:  "success",
    message: `Account provisioned. Invite sent to ${normalized}.`,
    data:    { user },
  });
});

// ─── RESEND INVITE ────────────────────────────────────────────────────────────

export const resendMagicLink = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    throw new AppError("Email is required.", HttpStatus.BAD_REQUEST);
  }

  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    throw new AppError("No account found with this email.", HttpStatus.NOT_FOUND);
  }

  if (user.accountStatus === "ACTIVE") {
    throw new AppError("This account is already active.", HttpStatus.BAD_REQUEST);
  }

  await prisma.otpCode.deleteMany({ where: { userId: user.id } });

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.otpCode.create({
    data: {
      code:      token,
      target:    normalized,
      type:      OtpType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      userId:    user.id,
    },
  });

  try {
    await sendVerificationEmail(normalized, token);
  } catch (emailError: any) {
    console.error("❌ [MAIL] Failed to resend invite:", emailError?.message);
  }

  return res.status(HttpStatus.OK).json({
    status:  "success",
    message: "Invite resent successfully.",
  });
});

// ─── GET ALL USERS ────────────────────────────────────────────────────────────

export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const { role, status, search } = req.query;
  const callerRole = req.user!.role as Role;

  // Each role sees a different subset
  const excludedRoles: PrismaRole[] =
    callerRole === Role.MANAGER
      ? ["SUPER_ADMIN", "ADMIN", "MANAGER"] as PrismaRole[]
      : callerRole === Role.ADMIN
      ? ["SUPER_ADMIN", "ADMIN"] as PrismaRole[]
      : ["SUPER_ADMIN"] as PrismaRole[];

  const users = await prisma.user.findMany({
    where: {
      role: { notIn: excludedRoles },
      ...(role   && { role:          role   as PrismaRole }),
      ...(status && { accountStatus: status as AccountStatus }),
      ...(search && {
        OR: [
          { email:     { contains: search as string, mode: "insensitive" } },
          { firstName: { contains: search as string, mode: "insensitive" } },
          { lastName:  { contains: search as string, mode: "insensitive" } },
        ],
      }),
    },
    select:  SAFE_USER_SELECT,
    orderBy: { createdAt: "desc" },
  });

  return res.status(HttpStatus.OK).json({
    status:  "success",
    results: users.length,
    data:    { users },
  });
});

// ─── GET SINGLE USER ──────────────────────────────────────────────────────────

export const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where:  { id: pid(req) },
    select: SAFE_USER_SELECT,
  });

  if (!user) {
    throw new AppError("User not found.", HttpStatus.NOT_FOUND);
  }

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { user },
  });
});

// ─── UPDATE USER STATUS ───────────────────────────────────────────────────────

export const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;

  if (!status) {
    throw new AppError("Status is required.", HttpStatus.BAD_REQUEST);
  }

  const target = await prisma.user.findUnique({ where: { id: pid(req) } });
  if (!target) {
    throw new AppError("User not found.", HttpStatus.NOT_FOUND);
  }

  if (target.role === "SUPER_ADMIN") {
    throw new AppError("Super Admin status cannot be modified.", HttpStatus.FORBIDDEN);
  }

  const user = await prisma.user.update({
    where:  { id: pid(req) },
    data:   { accountStatus: status as AccountStatus },
    select: SAFE_USER_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "USER_STATUS_UPDATED",
      meta:   { targetUserId: pid(req), newStatus: status },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { user },
  });
});

// ─── UPDATE USER ROLE ─────────────────────────────────────────────────────────

export const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.body;

  if (!role) {
    throw new AppError("Role is required.", HttpStatus.BAD_REQUEST);
  }

  if (role === Role.SUPER_ADMIN) {
    throw new AppError("Direct promotion to Super Admin is not allowed.", HttpStatus.FORBIDDEN);
  }

  const target = await prisma.user.findUnique({ where: { id: pid(req) } });
  if (!target) {
    throw new AppError("User not found.", HttpStatus.NOT_FOUND);
  }

  if (target.role === "SUPER_ADMIN") {
    throw new AppError("Super Admin role cannot be changed.", HttpStatus.FORBIDDEN);
  }

  const user = await prisma.user.update({
    where:  { id: pid(req) },
    data:   { role: role as PrismaRole },
    select: SAFE_USER_SELECT,
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user!.userId,
      action: "USER_ROLE_UPDATED",
      meta:   { targetUserId: pid(req), newRole: role },
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { user },
  });
});

// ─── DELETE USER ──────────────────────────────────────────────────────────────

export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const id = pid(req);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    throw new AppError("User not found.", HttpStatus.NOT_FOUND);
  }

  if (target.role === "SUPER_ADMIN") {
    throw new AppError("Super Admin accounts cannot be deleted.", HttpStatus.FORBIDDEN);
  }

  if (id === req.user!.userId) {
    throw new AppError("You cannot delete your own account.", HttpStatus.FORBIDDEN);
  }

  await prisma.$transaction([
    prisma.otpCode.deleteMany({ where: { userId: id } }),
    prisma.auditLog.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return res.status(HttpStatus.NO_CONTENT).send();
});

// ─── UPDATE PROFILE (self) ────────────────────────────────────────────────────

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    throw new AppError("Authentication required.", HttpStatus.UNAUTHORIZED);
  }

  const allowed = [
    "firstName", "lastName", "displayName",
    "avatarUrl", "language", "city", "country", "dateOfBirth",
  ];

  const data: Record<string, any> = {};
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      data[field] =
        field === "dateOfBirth"
          ? req.body[field] ? new Date(req.body[field]) : null
          : req.body[field] ? String(req.body[field]).trim() : null;
    }
  }

  if (Object.keys(data).length === 0) {
    throw new AppError("No valid fields provided to update.", HttpStatus.BAD_REQUEST);
  }

  const current = await prisma.user.findUnique({ where: { id: userId } });
  if (!current) {
    throw new AppError("User not found.", HttpStatus.NOT_FOUND);
  }

  const merged = { ...current, ...data };
  if (merged.firstName && merged.lastName && !current.profileCompletedAt) {
    data.profileCompletedAt = new Date();
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      ...SAFE_USER_SELECT,
      language:           true,
      city:               true,
      country:            true,
      dateOfBirth:        true,
      profileCompletedAt: true,
    },
  });

  return res.status(HttpStatus.OK).json({
    status: "success",
    data:   { user },
  });
});

// ─── AVATAR PRESIGNED URL ─────────────────────────────────────────────────────

export const getAvatarPresignedUrl = catchAsync(
  async (req: Request, res: Response) => {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      throw new AppError("fileName and fileType are required.", HttpStatus.BAD_REQUEST);
    }

    // TODO: Replace with real R2 presigned URL generation
    return res.status(HttpStatus.OK).json({
      status: "success",
      data: {
        url: `https://placeholder.r2.dev/avatars/${req.user!.userId}/${fileName}`,
        key: `avatars/${req.user!.userId}/${fileName}`,
      },
    });
  },
);