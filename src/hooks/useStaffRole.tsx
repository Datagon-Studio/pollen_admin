import { useQuery } from "@tanstack/react-query";
import { userApi } from "@/services/user.api";
import {
  isStaffRole,
  type StaffRole,
  canMutateCompliance,
  canManagePlatform,
} from "@/lib/staff-roles";
import { useAuth } from "@/hooks/useAuth";
import { isDevBypassEnabled } from "@/lib/dev-bypass";
import type { StaffProfile } from "@/services/user.api";

const DEV_BYPASS_PROFILE: StaffProfile = {
  user_id: "dev-bypass",
  email: "dev@pollean.local",
  role: "superadmin",
  full_name: "Dev Bypass",
  profile_image_url: null,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
};

export function useStaffRole() {
  const { user, loading: authLoading } = useAuth();
  const devBypass = isDevBypassEnabled();

  const {
    data: profile,
    isLoading: profileLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["staff-profile", user?.id],
    queryFn: () => userApi.getProfile(),
    enabled: !!user && !devBypass,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (devBypass) {
    const role: StaffRole = "superadmin";
    return {
      profile: DEV_BYPASS_PROFILE,
      role,
      isStaff: true,
      isSuperAdmin: true,
      isOps: false,
      isSupport: false,
      canMutateCompliance: true,
      canManagePlatform: true,
      loading: false,
      error: null,
      refetch: async () => {},
    };
  }

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
