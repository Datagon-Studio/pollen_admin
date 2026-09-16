import { request } from "@/lib/api-client";
import type { StaffRole } from "@/lib/staff-roles";

export interface StaffProfile {
  user_id: string;
  email: string;
  /** Platform role from users.role — may include admin/user for non-staff */
  role: StaffRole | "admin" | "user";
  full_name: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export const userApi = {
  async getProfile(): Promise<StaffProfile> {
    const response = await request<StaffProfile>("/users/profile", {
      method: "GET",
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch profile");
    }
    return response.data;
  },
};
