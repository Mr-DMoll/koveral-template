import apiClient from "@/api/client";
import { endpoints } from "@/api/endpoints";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  accountStatus: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProvisionAdminData {
  email: string;
  role: "ADMIN";
}

export const superAdminService = {
  // Get all admins (SUPER_ADMIN sees ADMINs only via role filter)
  async getAdmins(): Promise<{ data: { users: AdminUser[] } }> {
    const { data } = await apiClient.get(endpoints.users.list, {
      params: { role: "ADMIN" },
    });
    return data;
  },

  // Provision a new admin
  async provisionAdmin(data: ProvisionAdminData) {
    const { data: response } = await apiClient.post(
      endpoints.users.provision,
      data,
    );
    return response;
  },

  // Resend activation email
  async resendInvite(email: string) {
    const { data } = await apiClient.post(endpoints.users.resendInvite, {
      email,
    });
    return data;
  },

  // Suspend an admin
  async suspendAdmin(id: string) {
    const { data } = await apiClient.patch(endpoints.users.status(id), {
      status: "SUSPENDED",
    });
    return data;
  },

  // Reactivate a suspended admin
  async activateAdmin(id: string) {
    const { data } = await apiClient.patch(endpoints.users.status(id), {
      status: "ACTIVE",
    });
    return data;
  },

  // Delete an admin
  async deleteAdmin(id: string) {
    const { data } = await apiClient.delete(endpoints.users.delete(id));
    return data;
  },
};
