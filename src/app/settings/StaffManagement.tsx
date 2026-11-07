import { FormEvent, Fragment, useEffect, useId, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  staffRoleLabel,
  staffRoleSummary,
  templatePages,
  type PortalPageId,
  type StaffRole,
} from "@/lib/staff-roles";
import { useSortedRows } from "@/lib/table-sort";
import { cn } from "@/lib/utils";
import { adminApi, type AdminStaffMember } from "@/services/admin.api";

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
const STAFF_QUERY_KEY = ["admin-staff"] as const;

function toStaffMember(row: AdminStaffMember): StaffMember {
  return {
    id: row.user_id,
    fullName: row.full_name?.trim() || "",
    email: row.email,
    role: row.role,
    pages: templatePages(row.role),
    status: row.last_sign_in_at ? "active" : "invited",
    lastSignIn: row.last_sign_in_at,
  };
}

function displayName(member: Pick<StaffMember, "fullName" | "email">): string {
  return member.fullName.trim() || member.email;
}

function isCurrent(member: StaffMember): boolean {
  return member.status === "active" || member.status === "invited";
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
  const queryClient = useQueryClient();
  const staffQuery = useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: () => adminApi.listStaff(),
  });
  const staff = useMemo(
    () => (staffQuery.data ?? []).map(toStaffMember),
    [staffQuery.data]
  );
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
  const [saving, setSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogTitleId = useId();

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

  const changeRole = async (member: StaffMember, next: StaffRole) => {
    if (next === member.role || saving) return;
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
    setSaving(true);
    try {
      await adminApi.changeStaffRole(member.id, next);
      await queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      const name = displayName(member);
      setNotice(
        isSelf(member)
          ? `You are now ${staffRoleLabel(next)}. Sign in again if a page disappears.`
          : `${name} is now ${staffRoleLabel(next)}.`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not change that role.");
    } finally {
      setSaving(false);
    }
  };

  const submitInvite = async (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const email = inviteEmail.trim().toLowerCase();
    const fullName = inviteName.trim();
    if (!EMAIL_PATTERN.test(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    const existing = staff.find((member) => member.email.toLowerCase() === email);
    if (existing) {
      setFormError(
        `${displayName(existing)} already has portal access as ${staffRoleLabel(existing.role)}.`
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
    setSaving(true);
    setFormError(null);
    try {
      const invited = await adminApi.inviteStaff({
        email,
        fullName: fullName || undefined,
        role: inviteRole,
        signIn: inviteSetup,
        password: inviteSetup === "password" ? invitePassword : undefined,
        autoConfirm: inviteSetup === "password" ? inviteAutoConfirm : undefined,
      });
      await queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      setStatusFilter("current");
      setSearchQuery("");
      const name = fullName || email;
      const roleName = staffRoleLabel(inviteRole);
      if (invited.delivery === "password-link") {
        setNotice(`${name} is invited as ${roleName}. They will get an email to set a password.`);
      } else if (invited.delivery === "sign-in-link") {
        setNotice(
          `${name} already had a login. They are now ${roleName} and will get an email to sign in with their existing password.`
        );
      } else if (inviteAutoConfirm) {
        setNotice(`${name} can sign in as ${roleName} with the password you set.`);
      } else {
        setNotice(
          `${name} has a password as ${roleName}. They still need to confirm their email before signing in.`
        );
      }
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not invite that person.");
    } finally {
      setSaving(false);
    }
  };

  const confirmRevoke = async () => {
    if (!dialogMember || dialog.type !== "revoke" || saving) return;
    if (roleLocked(dialogMember)) {
      setFormError("Promote another super admin before revoking this one.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await adminApi.revokeStaff(dialogMember.id);
      await queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      const name = displayName(dialogMember);
      setNotice(
        isSelf(dialogMember)
          ? "Your portal access was removed."
          : `${name} no longer has portal access. Invite them again to restore it.`
      );
      closeDialog();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not revoke access.");
    } finally {
      setSaving(false);
    }
  };

  const confirmRestore = () => {
    if (!dialogMember || dialog.type !== "restore") return;
    setNotice(`Invite ${displayName(dialogMember)} again to restore portal access.`);
    closeDialog();
  };

  const filtersActive =
    searchQuery.trim() !== "" || roleFilter !== "all" || statusFilter !== "current";

  return (
    <SectionPage
      title="Staff"
      description="Invite ops, support, and other super admins. Access follows the role. Super admin only."
      badge={null}
      actions={
        <Button type="button" onClick={openInvite}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Invite staff
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">
        An email invite sends a password link. Setting a password creates the login here. Revoking
        access sets their platform role back to a regular user. A group login, if they have one,
        stays.
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
            <option value="all">All statuses</option>
          </select>
        </div>

        <p aria-live="polite" className={cn("text-sm", !notice && "sr-only")}>
          {notice ?? ""}
        </p>

        {staffQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading staff…</p>
        ) : staffQuery.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {staffQuery.error instanceof Error ? staffQuery.error.message : "Could not load staff."}
          </p>
        ) : filtered.length === 0 ? (
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
                            disabled={locked || revoked || saving}
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
                              Pages for {displayName(member)} follow the {staffRoleLabel(member.role)}{" "}
                              role.
                              {staffLocked ? " The Staff page stays on so the portal keeps an admin." : ""}
                            </p>
                            <PageChecks
                              pages={member.pages}
                              disabled
                              staffLocked={staffLocked}
                              onToggle={() => undefined}
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
                  These pages come with {staffRoleLabel(inviteRole)}. Access follows the role.
                </p>
                <PageChecks pages={invitePages} disabled onToggle={() => undefined} />
              </fieldset>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : inviteSetup === "email" ? "Invite" : "Create login"}
                </Button>
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
                  {displayName(dialogMember)} ({dialogMember.email}) will leave the staff roster.
                  A group login, if they have one, stays. Invite them again to restore portal
                  access.
                </p>
              </div>
              {formError && (
                <p role="alert" className="text-sm text-destructive">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeDialog} autoFocus disabled={saving}>
                  Keep access
                </Button>
                <Button type="button" variant="destructive" onClick={confirmRevoke} disabled={saving}>
                  {saving ? "Revoking…" : "Revoke access"}
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
