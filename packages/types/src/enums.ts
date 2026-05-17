export enum Role {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN       = "ADMIN",
  MANAGER     = "MANAGER",
  DEVELOPER   = "DEVELOPER",
  CLIENT      = "CLIENT",
}

export enum AccountStatus {
  PENDING   = "PENDING",
  ACTIVE    = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED   = "DELETED",
}

export enum OtpType {
  EMAIL_VERIFICATION = "EMAIL_VERIFICATION",
  PASSWORD_RESET     = "PASSWORD_RESET",
}