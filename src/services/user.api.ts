import { request } from "@/lib/api-client";
import type { StaffRole } from "@/lib/staff-roles";

export interface StaffProfile {
  user_id: string;
  email: string;
  /** Platform role from users.role — may include admin/user for non-staff */
  role: StaffRole | "admin" | "user";
  full_name: string | null;
  phone_number: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateStaffProfileInput {
  full_name?: string;
  phone_number?: string | null;
  profile_image_url?: string | null;
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

  async updateProfile(input: UpdateStaffProfileInput): Promise<StaffProfile> {
    const response = await request<StaffProfile>("/users/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to update profile");
    }
    return response.data;
  },
};
