import { Navigate } from "react-router-dom";
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
  const { user, loading: authLoading } = useAuth();
  const { role, isStaff, loading: roleLoading, error: profileError, profile } = useStaffRole();

  if (authLoading || roleLoading) {
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
    return <Navigate to="/forbidden" replace state={{ platformRole: profile?.role }} />;
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
