/** Platform staff roles that may access the System Admin Portal (PRD §11) */
export type StaffRole = "superadmin" | "ops" | "support";

export const STAFF_ROLES: StaffRole[] = ["superadmin", "ops", "support"];

export function isStaffRole(role: string | null | undefined): role is StaffRole {
  return !!role && STAFF_ROLES.includes(role as StaffRole);
}

/** Roles that can mutate KYC and settlements */
export function canMutateCompliance(role: StaffRole): boolean {
  return role === "superadmin" || role === "ops";
}

/** Roles that can deactivate accounts and manage staff */
export function canManagePlatform(role: StaffRole): boolean {
  return role === "superadmin";
}

export function staffRoleLabel(role: StaffRole): string {
  switch (role) {
    case "superadmin":
      return "Super admin";
    case "ops":
      return "Ops";
    case "support":
      return "Support";
  }
}
