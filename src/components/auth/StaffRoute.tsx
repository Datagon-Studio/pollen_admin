import { Navigate, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useStaffRole } from "@/hooks/useStaffRole";
import type { StaffRole } from "@/lib/staff-roles";
import { canMutateCompliance, canManagePlatform } from "@/lib/staff-roles";
import { ProfileLoadError } from "@/components/auth/ProfileLoadError";

type StaffRouteProps = {
  children: React.ReactNode;
  /** Require ops or superadmin (KYC, settlements) */
  requireCompliance?: boolean;
  /** Require superadmin only (staff management, account lifecycle) */
  requirePlatformAdmin?: boolean;
  /** Explicit minimum role list */
  allowedRoles?: StaffRole[];
};

export function StaffRoute({
  children,
  requireCompliance = false,
  requirePlatformAdmin = false,
  allowedRoles,
}: StaffRouteProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading, logout } = useAuth();
  const { role, isStaff, loading: roleLoading, error: profileError, profile } = useStaffRole();
  const rejectingRef = useRef(false);

  // Non-staff accounts (e.g. group admin) should fail like a normal sign-in, not a debug page.
  useEffect(() => {
    if (authLoading || roleLoading || !user || profileError) return;
    if (isStaff && role) return;
    if (rejectingRef.current) return;

    rejectingRef.current = true;
    let cancelled = false;
    (async () => {
      await logout();
      queryClient.clear();
      if (!cancelled) {
        navigate("/signin", {
          replace: true,
          state: { authError: "Invalid email or password." },
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    roleLoading,
    user,
    profileError,
    isStaff,
    role,
    logout,
    queryClient,
    navigate,
  ]);

  if (authLoading || roleLoading || (user && !profileError && !isStaff)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (profileError && !profile) {
    return (
      <ProfileLoadError
        message={profileError instanceof Error ? profileError.message : "Profile request failed"}
      />
    );
  }

  if (!isStaff || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Signing out…</p>
      </div>
    );
  }

  if (requirePlatformAdmin && !canManagePlatform(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (requireCompliance && !canMutateCompliance(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
}
