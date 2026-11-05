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

/** Detail shown when choosing a role template. */
export function staffRoleSummary(role: StaffRole): string {
  switch (role) {
    case "superadmin":
      return "All pages, including Staff.";
    case "ops":
      return "Read pages, plus KYC and settlements.";
    case "support":
      return "Read pages only. No KYC, settlements, or Staff.";
  }
}

export type PortalPageId =
  | "dashboard"
  | "accounts"
  | "members"
  | "funds"
  | "contributions"
  | "reports"
  | "audit"
  | "settlements"
  | "kyc"
  | "staff";

export const PORTAL_PAGES: { id: PortalPageId; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "accounts", label: "Accounts" },
  { id: "members", label: "Members" },
  { id: "funds", label: "Funds" },
  { id: "contributions", label: "Contributions" },
  { id: "reports", label: "Reports" },
  { id: "audit", label: "Audit log" },
  { id: "settlements", label: "Settlements" },
  { id: "kyc", label: "KYC" },
  { id: "staff", label: "Staff" },
];

const READ_PAGES: PortalPageId[] = [
  "dashboard",
  "accounts",
  "members",
  "funds",
  "contributions",
  "reports",
  "audit",
];

/** Starting pages for a role. A person can turn pages on or off after this. */
export function templatePages(role: StaffRole): PortalPageId[] {
  if (role === "support") return [...READ_PAGES];
  if (role === "ops") return [...READ_PAGES, "settlements", "kyc"];
  return [...READ_PAGES, "settlements", "kyc", "staff"];
}

export function pagesMatchTemplate(role: StaffRole, pages: readonly PortalPageId[]): boolean {
  const template = templatePages(role);
  if (template.length !== pages.length) return false;
  const selected = new Set(pages);
  return template.every((page) => selected.has(page));
}

export function accessSummary(role: StaffRole, pages: readonly PortalPageId[]): string {
  if (pagesMatchTemplate(role, pages)) return `${staffRoleLabel(role)} template`;
  return pages.length === 1 ? "Custom · 1 page" : `Custom · ${pages.length} pages`;
}
