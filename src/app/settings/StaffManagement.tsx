import { FormEvent, Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, UserPlus } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SortableTh } from "@/components/ui/sortable-th";
import { StatusBadge } from "@/components/ui/status-badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useStaffRole } from "@/hooks/useStaffRole";
import { formatDate } from "@/lib/format";
import {
  PORTAL_PAGES,
  STAFF_ROLES,
  accessSummary,
  pagesMatchTemplate,
  staffRoleLabel,
  staffRoleSummary,
  templatePages,
  type PortalPageId,
  type StaffRole,
} from "@/lib/staff-roles";
import { useSortedRows } from "@/lib/table-sort";
import { cn } from "@/lib/utils";

type PortalStatus = "active" | "invited" | "revoked";

type SignInSetup = "email" | "password";

type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  role: StaffRole;
  pages: PortalPageId[];
  status: PortalStatus;
  lastSignIn: string | null;
  /** How this preview records they would sign in. No login is created yet. */
  signIn: SignInSetup;
  autoConfirm: boolean;
};

type DialogState =
  | { type: "closed" }
  | { type: "invite" }
  | { type: "revoke"; memberId: string }
  | { type: "restore"; memberId: string };

type StatusFilter = "current" | PortalStatus | "all";

const fieldClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** Sample roster so the screen can be reviewed before the staff API exists. */
function withTemplate(
  member: Omit<StaffMember, "pages" | "signIn" | "autoConfirm"> & {
    pages?: PortalPageId[];
    signIn?: SignInSetup;
    autoConfirm?: boolean;
  }
): StaffMember {
  return {
    signIn: "email",
    autoConfirm: false,
    ...member,
    pages: member.pages ?? templatePages(member.role),
  };
}

function sampleRoster(): StaffMember[] {
  return [
    withTemplate({
      id: "sample-you",
      fullName: "Kwame Asante",
      email: "kwame.asante@pollean.com",
      role: "superadmin",
      status: "active",
      lastSignIn: daysAgo(0),
      signIn: "password",
      autoConfirm: true,
    }),
    withTemplate({
      id: "sample-efua",
      fullName: "Efua Boateng",
      email: "efua.boateng@pollean.com",
      role: "superadmin",
      status: "active",
      lastSignIn: daysAgo(1),
    }),
    withTemplate({
      id: "sample-ama",
      fullName: "Ama Mensah",
      email: "ama.mensah@pollean.com",
      role: "ops",
      status: "active",
      lastSignIn: daysAgo(2),
    }),
    withTemplate({
      id: "sample-kojo",
      fullName: "Kojo Owusu",
      email: "kojo.owusu@pollean.com",
      role: "support",
      status: "active",
      lastSignIn: daysAgo(6),
      pages: templatePages("support").filter((page) => page !== "audit"),
    }),
    withTemplate({
      id: "sample-abena",
      fullName: "Abena Darko",
      email: "abena.darko@pollean.com",
      role: "support",
      status: "invited",
      lastSignIn: null,
    }),
    withTemplate({
      id: "sample-yaw",
      fullName: "Yaw Frimpong",
      email: "yaw.frimpong@pollean.com",
      role: "ops",
      status: "revoked",
      lastSignIn: daysAgo(40),
    }),
  ];
}

function displayName(member: Pick<StaffMember, "fullName" | "email">): string {
  return member.fullName.trim() || member.email;
}

function isCurrent(member: StaffMember): boolean {
  return member.status === "active" || member.status === "invited";
}

function togglePage(pages: readonly PortalPageId[], page: PortalPageId): PortalPageId[] {
  return pages.includes(page) ? pages.filter((item) => item !== page) : [...pages, page];
}

function PageChecks({
  pages,
  disabled,
  staffLocked,
  onToggle,
}: {
  pages: readonly PortalPageId[];
  disabled?: boolean;
  /** The Staff page cannot be turned off for this person. */
  staffLocked?: boolean;
  onToggle: (page: PortalPageId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
      {PORTAL_PAGES.map((page) => {
        const checked = pages.includes(page.id);
        const locked = disabled || (page.id === "staff" && checked && staffLocked);
        return (
          <label
            key={page.id}
            className={cn("flex items-center gap-2", locked ? "cursor-not-allowed opacity-60" : "cursor-pointer")}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-[hsl(var(--foreground))]"
              checked={checked}
              disabled={locked}
              onChange={() => onToggle(page.id)}
            />
            {page.label}
          </label>
        );
      })}
    </div>
  );
}

export default function StaffManagement() {
  const { profile } = useStaffRole();
  const [staff, setStaff] = useState<StaffMember[]>(sampleRoster);
  const [seededYou, setSeededYou] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | StaffRole>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("current");
  const [dialog, setDialog] = useState<DialogState>({ type: "closed" });
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("support");
  const [invitePages, setInvitePages] = useState<PortalPageId[]>(templatePages("support"));
  const [inviteSetup, setInviteSetup] = useState<SignInSetup>("email");
  const [invitePassword, setInvitePassword] = useState("");
  const [invitePasswordConfirm, setInvitePasswordConfirm] = useState("");
  const [inviteAutoConfirm, setInviteAutoConfirm] = useState(true);
  const [openPagesId, setOpenPagesId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    if (!profile || seededYou) return;
    setStaff((current) => {
      const withoutCollision = current.filter(
        (member) =>
          member.id === "sample-you" ||
          member.email.toLowerCase() !== profile.email.toLowerCase()
      );
      return withoutCollision.map((member) =>
        member.id === "sample-you"
          ? {
              ...member,
              id: profile.user_id,
              fullName: profile.full_name?.trim() || member.fullName,
              email: profile.email,
            }
          : member
      );
    });
    setSeededYou(true);
  }, [profile, seededYou]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (dialog.type === "closed") {
      if (node.open) node.close();
      return;
    }
    if (!node.open) node.showModal();
  }, [dialog]);

  const activeSuperAdmins = staff.filter(
    (member) => member.role === "superadmin" && isCurrent(member)
  ).length;

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return staff.filter((member) => {
      const matchesQuery =
        !query ||
        member.fullName.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || member.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "current" ? isCurrent(member) : member.status === statusFilter);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [staff, searchQuery, roleFilter, statusFilter]);

  const staffSort = useSortedRows(filtered, (member, column) => {
    switch (column) {
      case "name":
        return displayName(member);
      case "role":
        return staffRoleLabel(member.role);
      case "access":
        return accessSummary(member.role, member.pages);
      case "signin":
        return member.lastSignIn;
      case "status":
        return member.status;
      default:
        return "";
    }
  });

  const pagination = usePagination(
    staffSort.sorted,
    undefined,
    `${searchQuery}|${roleFilter}|${statusFilter}`
  );

  const dialogMember =
    dialog.type === "revoke" || dialog.type === "restore"
      ? staff.find((member) => member.id === dialog.memberId) ?? null
      : null;

  const openInvite = () => {
    setInviteName("");
    setInviteEmail("");
    setInviteRole("support");
    setInvitePages(templatePages("support"));
    setInviteSetup("email");
    setInvitePassword("");
    setInvitePasswordConfirm("");
    setInviteAutoConfirm(true);
    setFormError(null);
    setDialog({ type: "invite" });
  };

  const closeDialog = () => {
    setFormError(null);
    setDialog({ type: "closed" });
  };

  const isSelf = (member: StaffMember) =>
    !!profile && member.email.toLowerCase() === profile.email.toLowerCase();

  const roleLocked = (member: StaffMember) =>
    member.role === "superadmin" && isCurrent(member) && activeSuperAdmins <= 1;

  const staffPageHolders = staff.filter(
    (member) => isCurrent(member) && member.pages.includes("staff")
  ).length;

  const changeRole = (member: StaffMember, next: StaffRole) => {
    if (next === member.role) return;
    if (roleLocked(member)) {
      setNotice("The portal needs at least one super admin. Promote someone else first.");
      return;
    }
    const nextPages = templatePages(next);
    const losesStaff = member.pages.includes("staff") && !nextPages.includes("staff");
    if (losesStaff && isCurrent(member) && staffPageHolders <= 1) {
      setNotice("Someone must keep the Staff page. Give it to another person first.");
      return;
    }
    setStaff((current) =>
      current.map((row) =>
        row.id === member.id ? { ...row, role: next, pages: nextPages } : row
      )
    );
    const name = displayName(member);
    setNotice(
      isSelf(member)
        ? `Preview: this roster shows you as ${staffRoleLabel(next)}, with that template's pages. Your signed-in role is unchanged.`
        : `${name} is now ${staffRoleLabel(next)}. Pages reset to that template.`
    );
  };

  const toggleMemberPage = (member: StaffMember, page: PortalPageId) => {
    if (member.status === "revoked") return;
    const removingStaff =
      page === "staff" && member.pages.includes("staff") && isCurrent(member) && staffPageHolders <= 1;
    if (removingStaff) {
      setNotice("Someone must keep the Staff page. Give it to another person first.");
      return;
    }
    const nextPages = togglePage(member.pages, page);
    if (nextPages.length === 0) {
      setNotice("Leave at least one page on.");
      return;
    }
    setStaff((current) =>
      current.map((row) => (row.id === member.id ? { ...row, pages: nextPages } : row))
    );
    const name = displayName(member);
    setNotice(
      pagesMatchTemplate(member.role, nextPages)
        ? `${name} is back on the ${staffRoleLabel(member.role)} template.`
        : `${name} has custom page access. The ${staffRoleLabel(member.role)} role stays as the template.`
    );
  };

  const submitInvite = (event: FormEvent) => {
    event.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    const fullName = inviteName.trim();
    if (!EMAIL_PATTERN.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    const existing = staff.find((member) => member.email.toLowerCase() === email);
    if (existing && existing.status !== "revoked") {
      setFormError(
        `${displayName(existing)} already has portal access as ${staffRoleLabel(existing.role)}.`
      );
      return;
    }
    if (existing?.status === "revoked") {
      setFormError(
        `${displayName(existing)} is on the revoked list. Restore access instead of inviting again.`
      );
      return;
    }
    if (inviteSetup === "password") {
      if (invitePassword.length < 8) {
        setFormError("Use a password of at least 8 characters.");
        return;
      }
      if (invitePassword !== invitePasswordConfirm) {
        setFormError("Those passwords do not match.");
        return;
      }
    }
    if (invitePages.length === 0) {
      setFormError("Turn on at least one page.");
      return;
    }
    const readyNow = inviteSetup === "password" && inviteAutoConfirm;
    const member: StaffMember = {
      id: `invite-${email}`,
      fullName,
      email,
      role: inviteRole,
      pages: invitePages,
      status: readyNow ? "active" : "invited",
      lastSignIn: null,
      signIn: inviteSetup,
      autoConfirm: inviteSetup === "password" && inviteAutoConfirm,
    };
    setStaff((current) => [member, ...current]);
    setStatusFilter("current");
    setSearchQuery("");
    const name = fullName || email;
    if (inviteSetup === "email") {
      setNotice(
        `${name} is invited as ${staffRoleLabel(inviteRole)}. They would receive an email to set a password once the staff API is connected. Nothing was sent.`
      );
    } else if (inviteAutoConfirm) {
      setNotice(
        `${name} is set up with a password and a confirmed email as ${staffRoleLabel(inviteRole)}. No login was created in this preview.`
      );
    } else {
      setNotice(
        `${name} is set up with a password as ${staffRoleLabel(inviteRole)}. They would still need to confirm their email. No login was created in this preview.`
      );
    }
    closeDialog();
  };

  const confirmRevoke = () => {
    if (!dialogMember || dialog.type !== "revoke") return;
    if (roleLocked(dialogMember)) {
      setFormError("Promote another super admin before revoking this one.");
      return;
    }
    setStaff((current) =>
      current.map((row) =>
        row.id === dialogMember.id ? { ...row, status: "revoked" } : row
      )
    );
    const name = displayName(dialogMember);
    setNotice(
      isSelf(dialogMember)
        ? "Preview: this roster marks your access as revoked. You are still signed in."
        : `${name} no longer has portal access. Find them under Revoked.`
    );
    closeDialog();
  };

  const confirmRestore = () => {
    if (!dialogMember || dialog.type !== "restore") return;
    const nextStatus: PortalStatus = dialogMember.lastSignIn ? "active" : "invited";
    setStaff((current) =>
      current.map((row) =>
        row.id === dialogMember.id ? { ...row, status: nextStatus } : row
      )
    );
    setNotice(
      `${displayName(dialogMember)} can sign in again as ${staffRoleLabel(dialogMember.role)}.`
    );
    closeDialog();
  };

  const filtersActive =
    searchQuery.trim() !== "" || roleFilter !== "all" || statusFilter !== "current";

  return (
    <SectionPage
      title="Staff"
      description="Invite ops, support, and other super admins. A role is a starting template for which pages they can open, and you can turn pages on or off after that. Super admin only."
      badge={null}
      actions={
        <Button type="button" onClick={openInvite}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite staff
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        Preview roster with sample people. Invite, role changes, and revoke stay in this browser
        until the staff API is connected.
      </p>

      <section aria-labelledby="staff-access-heading">
        <details className="group rounded-lg border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span>
              <h2 id="staff-access-heading" className="text-lg font-semibold">
                Access by role
              </h2>
              <span className="mt-1 block max-w-2xl text-sm text-muted-foreground">
                Ops, support, and super admin are templates. Open this to compare the pages each
                one starts with.
              </span>
            </span>
            <ChevronRight
              className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t px-4 py-3">
            <ul className="divide-y text-sm md:hidden">
              {PORTAL_PAGES.map((page) => (
                <li key={page.id} className="py-3 first:pt-0 last:pb-0">
                  <p>{page.label}</p>
                  <p className="mt-1 text-muted-foreground">
                    {STAFF_ROLES.map((role, index) => {
                      const included = templatePages(role).includes(page.id);
                      return (
                        <span key={role}>
                          {index > 0 && <span aria-hidden="true"> · </span>}
                          <span className="text-foreground">{staffRoleLabel(role)}</span>{" "}
                          {included ? "yes" : "no"}
                        </span>
                      );
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[40rem] text-sm">
                <caption className="sr-only">
                  Pages included in each staff role template
                </caption>
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th scope="col" className="p-3 text-left font-medium">
                      Page
                    </th>
                    {STAFF_ROLES.map((role) => (
                      <th key={role} scope="col" className="p-3 text-left font-medium">
                        {staffRoleLabel(role)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PORTAL_PAGES.map((page) => (
                    <tr key={page.id} className="border-b last:border-0">
                      <th scope="row" className="p-3 text-left font-normal">
                        {page.label}
                      </th>
                      {STAFF_ROLES.map((role) => {
                        const included = templatePages(role).includes(page.id);
                        return (
                          <td key={role} className="p-3">
                            <span
                              className={
                                included ? "font-medium text-foreground" : "text-muted-foreground"
                              }
                            >
                              {included ? "Yes" : "No"}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      </section>

      <section aria-labelledby="staff-roster-heading" className="space-y-4">
        <div>
          <h2 id="staff-roster-heading" className="text-lg font-semibold">
            Roster
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {staff.filter(isCurrent).length} with portal access
            {staff.some((member) => member.status === "revoked")
              ? ` · ${staff.filter((member) => member.status === "revoked").length} revoked`
              : ""}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or email"
              aria-label="Search staff"
              className="pl-9"
            />
          </div>
          <select
            className={fieldClass}
            value={roleFilter}
            aria-label="Filter by role"
            onChange={(event) => setRoleFilter(event.target.value as "all" | StaffRole)}
          >
            <option value="all">All roles</option>
            {STAFF_ROLES.map((role) => (
              <option key={role} value={role}>
                {staffRoleLabel(role)}
              </option>
            ))}
          </select>
          <select
            className={fieldClass}
            value={statusFilter}
            aria-label="Filter by status"
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
          >
            <option value="current">Current access</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="revoked">Revoked</option>
            <option value="all">All statuses</option>
          </select>
        </div>

        <p aria-live="polite" className={cn("text-sm", !notice && "sr-only")}>
          {notice ?? ""}
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-lg border p-8">
            <EmptyState
              illustration={filtersActive ? "file-searching" : "collaboration"}
              title={filtersActive ? "No matching staff" : "No one has portal access"}
              description={
                filtersActive
                  ? "Try another name, role, or status."
                  : "Invite the first ops, support, or super admin."
              }
              action={
                filtersActive ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                      setStatusFilter("current");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button type="button" onClick={openInvite}>
                    Invite staff
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[52rem] text-sm">
                <caption className="sr-only">Staff with admin portal access</caption>
                <thead className="border-b bg-muted/50">
                  <tr>
                    <SortableTh
                      label="Staff"
                      column="name"
                      sortColumn={staffSort.sortColumn}
                      sortDirection={staffSort.sortDirection}
                      onSort={staffSort.onSort}
                    />
                    <SortableTh
                      label="Role"
                      column="role"
                      sortColumn={staffSort.sortColumn}
                      sortDirection={staffSort.sortDirection}
                      onSort={staffSort.onSort}
                    />
                    <SortableTh
                      label="Access"
                      column="access"
                      sortColumn={staffSort.sortColumn}
                      sortDirection={staffSort.sortDirection}
                      onSort={staffSort.onSort}
                    />
                    <SortableTh
                      label="Last sign-in"
                      column="signin"
                      sortColumn={staffSort.sortColumn}
                      sortDirection={staffSort.sortDirection}
                      onSort={staffSort.onSort}
                    />
                    <SortableTh
                      label="Status"
                      column="status"
                      sortColumn={staffSort.sortColumn}
                      sortDirection={staffSort.sortDirection}
                      onSort={staffSort.onSort}
                    />
                    <th scope="col" className="p-3 text-left font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagination.paginatedItems.map((member) => {
                    const locked = roleLocked(member);
                    const revoked = member.status === "revoked";
                    const pagesOpen = openPagesId === member.id;
                    const staffLocked =
                      member.pages.includes("staff") && isCurrent(member) && staffPageHolders <= 1;
                    return (
                      <Fragment key={member.id}>
                      <tr className="border-b align-top last:border-0">
                        <td className="p-3">
                          <p className="font-medium">
                            {displayName(member)}
                            {isSelf(member) && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-muted-foreground">{member.email}</p>
                        </td>
                        <td className="p-3">
                          <select
                            className={cn(fieldClass, "w-full min-w-[9.5rem]")}
                            aria-label={`Role for ${displayName(member)}`}
                            value={member.role}
                            disabled={locked || revoked}
                            onChange={(event) =>
                              changeRole(member, event.target.value as StaffRole)
                            }
                          >
                            {STAFF_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {staffRoleLabel(role)}
                              </option>
                            ))}
                          </select>
                          {locked && (
                            <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">
                              Last super admin. Promote someone else before changing this role.
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          {revoked ? (
                            <span className="text-muted-foreground">No portal access</span>
                          ) : (
                            <button
                              type="button"
                              className="text-left underline-offset-4 hover:underline"
                              aria-expanded={pagesOpen}
                              onClick={() =>
                                setOpenPagesId((current) =>
                                  current === member.id ? null : member.id
                                )
                              }
                            >
                              {accessSummary(member.role, member.pages)}
                            </button>
                          )}
                        </td>
                        <td className="whitespace-nowrap p-3 text-muted-foreground">
                          {member.lastSignIn ? formatDate(member.lastSignIn) : "Not yet"}
                        </td>
                        <td className="p-3">
                          {member.status === "active" && <StatusBadge status="active" />}
                          {member.status === "invited" && (
                            <StatusBadge status="pending" label="Invited" />
                          )}
                          {member.status === "revoked" && (
                            <StatusBadge status="inactive" label="Revoked" />
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {revoked ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setFormError(null);
                                setDialog({ type: "restore", memberId: member.id });
                              }}
                            >
                              Restore access
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={locked}
                              onClick={() => {
                                setFormError(null);
                                setDialog({ type: "revoke", memberId: member.id });
                              }}
                            >
                              Revoke access
                            </Button>
                          )}
                        </td>
                      </tr>
                      {pagesOpen && !revoked && (
                        <tr className="border-b last:border-0 bg-muted/30">
                          <td colSpan={6} className="p-3">
                            <p className="mb-2 text-sm text-muted-foreground">
                              Pages for {displayName(member)}. The {staffRoleLabel(member.role)}{" "}
                              role is the template
                              {staffLocked ? ". The Staff page stays on so the portal keeps an admin." : "."}
                            </p>
                            <PageChecks
                              pages={member.pages}
                              staffLocked={staffLocked}
                              onToggle={(page) => toggleMemberPage(member, page)}
                            />
                          </td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              onPageChange={pagination.setPage}
            />
          </div>
        )}
      </section>

      <dialog
        ref={dialogRef}
        aria-labelledby={dialogTitleId}
        onClose={closeDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        className="m-auto max-h-[calc(100%-2rem)] w-[min(36rem,calc(100%-2rem))] overflow-y-auto rounded-lg border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-foreground/40"
      >
        <div className="space-y-4 p-6">
          {dialog.type === "invite" && (
            <form onSubmit={submitInvite} className="space-y-4">
              <div>
                <h2 id={dialogTitleId} className="text-lg font-semibold">
                  Invite staff
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick a role template, then turn pages on or off. Nothing is emailed and no login
                  is created until the staff API is connected.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-invite-email">Email</Label>
                <Input
                  id="staff-invite-email"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="name@pollean.com"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="staff-invite-name">Name</Label>
                <Input
                  id="staff-invite-name"
                  value={inviteName}
                  onChange={(event) => setInviteName(event.target.value)}
                  autoComplete="name"
                  placeholder="Optional"
                  maxLength={255}
                />
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">How they sign in</legend>
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border p-3",
                    inviteSetup === "email" ? "border-foreground bg-secondary" : "border-border"
                  )}
                >
                  <input
                    type="radio"
                    name="staff-invite-setup"
                    value="email"
                    checked={inviteSetup === "email"}
                    onChange={() => setInviteSetup("email")}
                    className="mt-1 accent-[hsl(var(--foreground))]"
                  />
                  <span>
                    <span className="block font-medium">Email them a link</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      They receive an email and choose their own password.
                    </span>
                  </span>
                </label>
                <label
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-md border p-3",
                    inviteSetup === "password" ? "border-foreground bg-secondary" : "border-border"
                  )}
                >
                  <input
                    type="radio"
                    name="staff-invite-setup"
                    value="password"
                    checked={inviteSetup === "password"}
                    onChange={() => setInviteSetup("password")}
                    className="mt-1 accent-[hsl(var(--foreground))]"
                  />
                  <span>
                    <span className="block font-medium">Set a password</span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      You choose the password. They are not emailed.
                    </span>
                  </span>
                </label>
              </fieldset>
              {inviteSetup === "password" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="staff-invite-password">Password</Label>
                    <Input
                      id="staff-invite-password"
                      type="password"
                      required
                      minLength={8}
                      value={invitePassword}
                      onChange={(event) => setInvitePassword(event.target.value)}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-invite-password-confirm">Confirm password</Label>
                    <Input
                      id="staff-invite-password-confirm"
                      type="password"
                      required
                      minLength={8}
                      value={invitePasswordConfirm}
                      onChange={(event) => setInvitePasswordConfirm(event.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-[hsl(var(--foreground))]"
                      checked={inviteAutoConfirm}
                      onChange={(event) => setInviteAutoConfirm(event.target.checked)}
                    />
                    <span>
                      Auto-confirm their email so they can sign in without a confirmation link.
                    </span>
                  </label>
                </div>
              )}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Role template</legend>
                {STAFF_ROLES.map((role) => {
                  const selected = inviteRole === role;
                  return (
                    <label
                      key={role}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-md border p-3",
                        selected ? "border-foreground bg-secondary" : "border-border"
                      )}
                    >
                      <input
                        type="radio"
                        name="staff-invite-role"
                        value={role}
                        checked={selected}
                        onChange={() => {
                          setInviteRole(role);
                          setInvitePages(templatePages(role));
                        }}
                        className="mt-1 accent-[hsl(var(--foreground))]"
                      />
                      <span>
                        <span className="block font-medium">{staffRoleLabel(role)}</span>
                        <span className="mt-0.5 block text-sm text-muted-foreground">
                          {staffRoleSummary(role)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Pages</legend>
                <p className="text-sm text-muted-foreground">
                  Started from the {staffRoleLabel(inviteRole)} template. Uncheck a page to hide it.
                </p>
                <PageChecks pages={invitePages} onToggle={(page) => setInvitePages((current) => togglePage(current, page))} />
              </fieldset>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="submit">{inviteSetup === "email" ? "Invite" : "Create login"}</Button>
              </div>
            </form>
          )}

          {dialog.type === "revoke" && dialogMember && (
            <div className="space-y-4">
              <div>
                <h2 id={dialogTitleId} className="text-lg font-semibold">
                  Revoke portal access
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayName(dialogMember)} ({dialogMember.email}) will not be able to sign in
                  to the admin portal. A group login, if they have one, stays as it is. You can
                  restore access later.
                </p>
              </div>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} autoFocus>
                  Keep access
                </Button>
                <Button type="button" variant="destructive" onClick={confirmRevoke}>
                  Revoke access
                </Button>
              </div>
            </div>
          )}

          {dialog.type === "restore" && dialogMember && (
            <div className="space-y-4">
              <div>
                <h2 id={dialogTitleId} className="text-lg font-semibold">
                  Restore portal access
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {displayName(dialogMember)} can sign in again as{" "}
                  {staffRoleLabel(dialogMember.role)}. {staffRoleSummary(dialogMember.role)}.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button type="button" onClick={confirmRestore} autoFocus>
                  Restore access
                </Button>
              </div>
            </div>
          )}
        </div>
      </dialog>
    </SectionPage>
  );
}
