import { useState, useEffect, useCallback } from "react";
import {
  superAdminService,
  type AdminUser,
} from "../services/super-admin.service";

interface UseAdminsReturn {
  admins: AdminUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  provisionAdmin: (email: string) => Promise<void>;
  suspendAdmin: (id: string) => Promise<void>;
  activateAdmin: (id: string) => Promise<void>;
  deleteAdmin: (id: string) => Promise<void>;
  resendInvite: (email: string) => Promise<void>;
}

export function useAdmins(): UseAdminsReturn {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await superAdminService.getAdmins();
      setAdmins(response.data?.users ?? []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? "Failed to load admins.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const provisionAdmin = async (email: string) => {
    await superAdminService.provisionAdmin({ email, role: "ADMIN" });
    await fetchAdmins();
  };

  const suspendAdmin = async (id: string) => {
    await superAdminService.suspendAdmin(id);
    // Optimistic update
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, accountStatus: "SUSPENDED" } : a,
      ),
    );
  };

  const activateAdmin = async (id: string) => {
    await superAdminService.activateAdmin(id);
    setAdmins((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, accountStatus: "ACTIVE" } : a,
      ),
    );
  };

  const deleteAdmin = async (id: string) => {
    await superAdminService.deleteAdmin(id);
    setAdmins((prev) => prev.filter((a) => a.id !== id));
  };

  const resendInvite = async (email: string) => {
    await superAdminService.resendInvite(email);
  };

  return {
    admins,
    isLoading,
    error,
    refetch: fetchAdmins,
    provisionAdmin,
    suspendAdmin,
    activateAdmin,
    deleteAdmin,
    resendInvite,
  };
}
