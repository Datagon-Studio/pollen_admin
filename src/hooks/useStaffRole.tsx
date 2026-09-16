import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/services/user.api";
import {
  isStaffRole,
  type StaffRole,
  canMutateCompliance,
  canManagePlatform,
} from "@/lib/staff-roles";
import { useAuth } from "@/hooks/useAuth";

export function useStaffRole() {
  const { user, loading: authLoading } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["staff-profile", user?.id],
    queryFn: () => userApi.getProfile(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const role: StaffRole | null =
    profile?.role && isStaffRole(profile.role) ? profile.role : null;

  return {
    profile,
    role,
    isStaff: !!role,
    isSuperAdmin: role === "superadmin",
    isOps: role === "ops",
    isSupport: role === "support",
    canMutateCompliance: role ? canMutateCompliance(role) : false,
    canManagePlatform: role ? canManagePlatform(role) : false,
    loading: authLoading || (!!user && profileLoading),
    error,
    refetch,
  };
}
