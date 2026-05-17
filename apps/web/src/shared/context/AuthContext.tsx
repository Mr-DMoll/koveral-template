"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { authService } from "@/features/auth/services/auth.service";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "DEVELOPER" | "CLIENT";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  accountStatus: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await authService.getMe();
        setUser(response.data?.user || null);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    const { user, token } = response.data?.data ?? {};
    if (token) localStorage.setItem("auth_token", token);
    setUser(user ?? null);
    if (user) {
      const roleRoutes: Record<string, string> = {
        SUPER_ADMIN: "/super-admin",
        ADMIN:       "/admin",
        MANAGER:     "/manager",
        DEVELOPER:   "/developer",
        CLIENT:      "/client",
      };
      window.location.href = roleRoutes[user.role] ?? "/";
    }
  };

  
  const logout = async () => {
    await authService.logout();
    setUser(null);
    window.location.href = "/"; // hard redirect — clears all state
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
