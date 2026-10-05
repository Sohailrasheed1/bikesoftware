"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import {
  UserRole,
  UserPermissions,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
} from "@/types";

export interface CurrentUserState {
  user: any;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  permissions: UserPermissions;
  canViewSalesAndProfit: boolean;
  canAccessModule: (module: keyof UserPermissions) => boolean;
  isLoading: boolean;
}

const RESTRICTED_LOADING_PERMISSIONS: UserPermissions = {
  pos: false,
  workshop: false,
  inventory: false,
  customers: false,
  bills: false,
  mechanics: false,
  suppliers: false,
  reports: false,
  viewSalesAndProfit: false,
};

export function useCurrentUser(): CurrentUserState {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isLoading = status === "loading";
  const currentUser = status === "authenticated" && session?.user ? session.user : null;

  // Never default an unauthenticated or loading session to "admin" or privileged role
  const rawRole = (currentUser as any)?.role;
  const role: UserRole = currentUser ? (rawRole || "staff") : "staff";

  const isSuperAdmin = !isLoading && !!currentUser && role === "superadmin";
  const isAdmin = !isLoading && !!currentUser && (role === "admin" || role === "superadmin");
  const isStaff = !isLoading && !!currentUser && role === "staff";

  const permissions: UserPermissions = useMemo(() => {
    if (isLoading || !currentUser) {
      return RESTRICTED_LOADING_PERMISSIONS;
    }
    if (isAdmin) {
      return DEFAULT_ADMIN_PERMISSIONS;
    }
    const userPerms = (currentUser as any)?.permissions;
    if (userPerms && typeof userPerms === "object") {
      return {
        ...DEFAULT_STAFF_PERMISSIONS,
        ...userPerms,
      };
    }
    return DEFAULT_STAFF_PERMISSIONS;
  }, [isLoading, isAdmin, currentUser]);

  const canViewSalesAndProfit = useMemo(() => {
    if (isLoading || !currentUser) return false;
    if (isAdmin) return true;
    return !!permissions.viewSalesAndProfit;
  }, [isLoading, currentUser, isAdmin, permissions.viewSalesAndProfit]);

  const canAccessModule = (module: keyof UserPermissions): boolean => {
    if (isLoading || !currentUser) return false;
    if (isAdmin) return true;
    return !!permissions[module];
  };

  return {
    user: currentUser,
    role,
    isAdmin,
    isStaff,
    isSuperAdmin,
    permissions,
    canViewSalesAndProfit,
    canAccessModule,
    isLoading,
  };
}
