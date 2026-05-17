"use client";

import { useState } from "react";
import { useAdmins } from "../hooks/useAdmins";
import type { AdminUser } from "../services/super-admin.service";
import {
  StatusBadge, Avatar, Modal, ConfirmDialog,
  FormInput, PageHeader, StatGrid, Table, TableRow, Td, ActionButton,
} from "@/shared/components/ui/UIComponents";

// ─── Add Admin Modal ──────────────────────────────────────────────────────────
function AddAdminModal({ onClose, onSubmit }: {
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
}) {
  const [email, setEmail]           = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(email.trim().toLowerCase());
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to create admin.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add New Admin">
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <FormInput label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" required autoFocus />
        {error && (
          <p style={{ fontSize: "13px", color: "#ef4444", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "var(--radius-sm)", padding: "10px 14px" }}>
            {error}
          </p>
        )}
        <p style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
          An activation email will be sent. The admin will set their own password.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button type="button" onClick={onClose} style={{
            flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 500,
            background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--color-text-secondary)",
          }}>
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !email.trim()} style={{
            flex: 1, padding: "9px 16px", fontSize: "13px", fontWeight: 600,
            background: "var(--color-accent)", border: "none",
            borderRadius: "var(--radius-sm)", cursor: "pointer",
            color: "var(--color-accent-text)", opacity: isSubmitting || !email.trim() ? 0.5 : 1,
          }}>
            {isSubmitting ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Admin Row ────────────────────────────────────────────────────────────────
function AdminRow({ admin, onSuspend, onActivate, onDelete, onResend }: {
  admin: AdminUser;
  onSuspend: (id: string) => Promise<void>;
  onActivate: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onResend: (email: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<"suspend" | "activate" | "delete" | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const name = admin.displayName || [admin.firstName, admin.lastName].filter(Boolean).join(" ") || admin.email;
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleResend = async () => {
    setIsResending(true);
    try { await onResend(admin.email); setResendSuccess(true); setTimeout(() => setResendSuccess(false), 3000); }
    finally { setIsResending(false); }
  };

  return (
    <>
      <TableRow>
        <Td>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Avatar initials={initials} />
            <div>
              <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1 }}>{name}</p>
              {name !== admin.email && <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "2px" }}>{admin.email}</p>}
            </div>
          </div>
        </Td>
        <Td><StatusBadge status={admin.accountStatus} /></Td>
        <Td>{new Date(admin.createdAt).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</Td>
        <Td>
          <div style={{ display: "flex", gap: "6px" }}>
            {admin.accountStatus === "PENDING" && (
              <ActionButton onClick={handleResend} disabled={isResending} variant="default">
                {isResending ? "Sending..." : resendSuccess ? "✓ Sent" : "Resend invite"}
              </ActionButton>
            )}
            {admin.accountStatus === "ACTIVE" && (
              <ActionButton onClick={() => setConfirm("suspend")} variant="warning">Suspend</ActionButton>
            )}
            {admin.accountStatus === "SUSPENDED" && (
              <ActionButton onClick={() => setConfirm("activate")} variant="success">Activate</ActionButton>
            )}
            <ActionButton onClick={() => setConfirm("delete")} variant="danger">Delete</ActionButton>
          </div>
        </Td>
      </TableRow>

      {confirm === "suspend" && <ConfirmDialog title="Suspend admin?" message={`${name} will lose access immediately.`} confirmLabel="Suspend" danger onConfirm={async () => { await onSuspend(admin.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
      {confirm === "activate" && <ConfirmDialog title="Reactivate admin?" message={`${name} will regain full access.`} confirmLabel="Activate" onConfirm={async () => { await onActivate(admin.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
      {confirm === "delete" && <ConfirmDialog title="Delete admin account?" message={`This will permanently delete ${name}'s account.`} confirmLabel="Delete" danger onConfirm={async () => { await onDelete(admin.id); setConfirm(null); }} onCancel={() => setConfirm(null)} />}
    </>
  );
}

// ─── ADMINS PAGE ──────────────────────────────────────────────────────────────
export default function AdminsPage() {
  const { admins, isLoading, error, provisionAdmin, suspendAdmin, activateAdmin, deleteAdmin, resendInvite } = useAdmins();
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <PageHeader
        title="Admins"
        subtitle="Manage who has admin access to the platform"
        action={
          <button onClick={() => setShowAddModal(true)} style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "9px 18px", fontSize: "13px", fontWeight: 600,
            background: "var(--color-accent)", border: "none",
            borderRadius: "var(--radius-md)", cursor: "pointer",
            color: "var(--color-accent-text)",
          }}>
            + Add Admin
          </button>
        }
      />

      <StatGrid stats={[
        { label: "Total",     value: admins.length },
        { label: "Active",    value: admins.filter(a => a.accountStatus === "ACTIVE").length,    color: "#22c55e" },
        { label: "Pending",   value: admins.filter(a => a.accountStatus === "PENDING").length,   color: "#f59e0b" },
        { label: "Suspended", value: admins.filter(a => a.accountStatus === "SUSPENDED").length, color: "#ef4444" },
      ]} />

      <Table
        headers={["Admin", "Status", "Added", "Actions"]}
        loading={isLoading}
        error={error}
        empty={admins.length === 0 ? (
          <div style={{ padding: "60px", textAlign: "center" }}>
            <p style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", marginBottom: "6px" }}>No admins yet</p>
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "16px" }}>Add an admin to give them platform access</p>
            <button onClick={() => setShowAddModal(true)} style={{
              padding: "8px 18px", fontSize: "13px", fontWeight: 600,
              background: "var(--color-accent)", border: "none",
              borderRadius: "var(--radius-md)", cursor: "pointer",
              color: "var(--color-accent-text)",
            }}>Add first admin</button>
          </div>
        ) : undefined}
      >
        {admins.map((admin) => (
          <AdminRow key={admin.id} admin={admin} onSuspend={suspendAdmin} onActivate={activateAdmin} onDelete={deleteAdmin} onResend={resendInvite} />
        ))}
      </Table>

      {showAddModal && <AddAdminModal onClose={() => setShowAddModal(false)} onSubmit={provisionAdmin} />}
    </div>
  );
}
