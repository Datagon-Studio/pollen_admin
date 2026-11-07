import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Loader2, Search } from "lucide-react";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
import { useMemo, useState } from "react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  adminApi,
  type AccountStaffMember,
  type AdminAccountSummary,
} from "@/services/admin.api";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { formatAmount, formatCurrency, formatDate } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

const COLUMN_COUNT = 8;

export default function AccountsList() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kycFilter, setKycFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminApi.listAccounts(),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (kycFilter !== "all" && a.kyc_status !== kycFilter) return false;
      if (!q) return true;
      return (
        (a.account_name?.toLowerCase().includes(q) ?? false) ||
        a.account_id.toLowerCase().includes(q)
      );
    });
  }, [accounts, search, statusFilter, kycFilter]);

  const accountSort = useSortedRows(filtered, (account, column) => {
    switch (column) {
      case "account":
        return account.account_name || "Unnamed account";
      case "status":
        return account.status;
      case "kyc":
        return account.kyc_status;
      case "members":
        return account.member_count;
      case "funds":
        return account.fund_count;
      case "collected":
        return account.total_collected;
      case "created":
        return account.created_at;
      default:
        return "";
    }
  });
  const pagination = usePagination(
    accountSort.sorted,
    undefined,
    `${search}|${statusFilter}|${kycFilter}`
  );

  return (
    <SectionPage
      title="Accounts"
      description="Every organization account on Pollean — status, KYC, members, funds, and collected totals. Select a row to expand its details."
      phase="ready"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or account ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
        >
          <option value="all">All KYC</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load accounts"}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {filtered.length} of {accounts.length} accounts
          </p>
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="w-8 p-3">
                    <span className="sr-only">Expand</span>
                  </th>
                  <SortableTh label="Account" column="account" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                  <SortableTh label="Status" column="status" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                  <SortableTh label="KYC" column="kyc" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                  <SortableTh label="Members" column="members" align="right" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                  <SortableTh label="Funds" column="funds" align="right" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                  <SortableTh label="Collected (GHS)" column="collected" align="right" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                  <SortableTh label="Created" column="created" sortColumn={accountSort.sortColumn} sortDirection={accountSort.sortDirection} onSort={accountSort.onSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="p-6">
                      <EmptyState
                        illustration={
                          accounts.length === 0 &&
                          !search.trim() &&
                          statusFilter === "all" &&
                          kycFilter === "all"
                            ? "empty-mailbox"
                            : "file-searching"
                        }
                        size="table"
                        description="No accounts match your filters"
                      />
                    </td>
                  </tr>
                ) : (
                  pagination.paginatedItems.map((a) => {
                    const isExpanded = expandedId === a.account_id;
                    return (
                      <AccountRow
                        key={a.account_id}
                        account={a}
                        isExpanded={isExpanded}
                        onToggle={() =>
                          setExpandedId(isExpanded ? null : a.account_id)
                        }
                      />
                    );
                  })
                )}
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
        </>
      )}
    </SectionPage>
  );
}

function AccountRow({
  account,
  isExpanded,
  onToggle,
}: {
  account: AdminAccountSummary;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `account-panel-${account.account_id}`;

  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
          isExpanded ? "bg-muted/30" : ""
        }`}
      >
        <td className="p-3 align-top">
          <button
            type="button"
            // The whole row toggles; this button exists so keyboard users and
            // screen readers get a real control with expanded state.
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-expanded={isExpanded}
            aria-controls={panelId}
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${
              account.account_name || "unnamed account"
            } details`}
            className="flex items-center text-muted-foreground hover:text-foreground"
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </button>
        </td>
        <td className="p-3">
          <Link
            to={`/accounts/${account.account_id}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium hover:underline"
          >
            {account.account_name || "Unnamed account"}
          </Link>
          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate max-w-[200px]">
            {account.account_id}
          </p>
        </td>
        <td className="p-3">
          <StatusBadge
            status={account.status as "active" | "inactive" | "suspended"}
          />
        </td>
        <td className="p-3">
          <StatusBadge
            status={
              account.kyc_status as
                | "unverified"
                | "pending"
                | "verified"
                | "rejected"
            }
          />
        </td>
        <td className="p-3 text-right tabular-nums">{account.member_count}</td>
        <td className="p-3 text-right tabular-nums">
          {account.active_fund_count}/{account.fund_count}
        </td>
        <td className="p-3 text-right tabular-nums">
          {formatAmount(account.total_collected)}
        </td>
        <td className="p-3 text-muted-foreground whitespace-nowrap">
          {formatDate(account.created_at)}
        </td>
      </tr>
      {isExpanded && (
        <tr id={panelId} className="border-b last:border-0 bg-muted/10">
          <td colSpan={COLUMN_COUNT} className="p-0">
            <AccountExpandedPanel account={account} />
          </td>
        </tr>
      )}
    </>
  );
}

function AccountExpandedPanel({ account }: { account: AdminAccountSummary }) {
  const accountId = account.account_id;

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["admin-account-team", accountId],
    queryFn: () => adminApi.getAccountTeam(accountId),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["admin-members", accountId],
    queryFn: () => adminApi.listMembers({ accountId }),
  });

  // There is no owner column on accounts. The signup trigger links the creator
  // as the first admin, so the oldest admin link is the closest thing we have.
  const admins = team?.managers ?? [];
  const creator = admins[0];
  const otherAdmins = admins.slice(1);
  const collectors = team?.officers ?? [];

  const netHeld = account.total_collected - account.total_disbursed;

  return (
    <div className="p-4 md:p-6 space-y-6 border-t">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PanelCard title="Money in">
          <Stat label="Total collected" value={formatCurrency(account.total_collected)} emphasis />
          <Stat label="Online" value={formatCurrency(account.online_collected)} />
          <Stat label="Manual / offline" value={formatCurrency(account.manual_collected)} />
        </PanelCard>

        <PanelCard title="Money out">
          <Stat label="Total disbursed" value={formatCurrency(account.total_disbursed)} emphasis />
          <Stat
            label="Expenses recorded"
            value={String(account.expense_count)}
          />
          <Stat label="Net held" value={formatCurrency(netHeld)} />
        </PanelCard>

        <PanelCard title="Creator">
          {teamLoading ? (
            <PanelLoading />
          ) : creator ? (
            <StaffEntry staff={creator} note="First admin on the account" />
          ) : (
            <p className="text-sm text-muted-foreground">No admin linked</p>
          )}
        </PanelCard>

        <PanelCard
          title={`Members (${account.member_count})`}
          action={
            account.member_count > 0 ? (
              <Link
                to={`/accounts/${accountId}?tab=members`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                View all
              </Link>
            ) : null
          }
        >
          {membersLoading ? (
            <PanelLoading />
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {members.slice(0, 5).map((m) => (
                <li key={m.member_id} className="flex justify-between gap-3">
                  <Link
                    to={`/members/${m.member_id}`}
                    className="truncate hover:underline"
                  >
                    {m.full_name}
                  </Link>
                  <span className="tabular-nums text-muted-foreground shrink-0">
                    {formatCurrency(m.contribution_total)}
                  </span>
                </li>
              ))}
              {members.length > 5 && (
                <li className="text-xs text-muted-foreground">
                  +{members.length - 5} more
                </li>
              )}
            </ul>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PanelCard title={`Admins (${otherAdmins.length})`}>
          {teamLoading ? (
            <PanelLoading />
          ) : otherAdmins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No admins beyond the creator
            </p>
          ) : (
            <ul className="space-y-3">
              {otherAdmins.map((m) => (
                <StaffEntry key={m.user_id} staff={m} as="li" />
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard title={`Collectors (${collectors.length})`}>
          {teamLoading ? (
            <PanelLoading />
          ) : collectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No collectors linked</p>
          ) : (
            <ul className="space-y-3">
              {collectors.map((m) => (
                <StaffEntry key={m.user_id} staff={m} as="li" />
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Link
          to={`/accounts/${accountId}`}
          className="font-medium hover:underline"
        >
          Open full account page →
        </Link>
        <Link
          to={`/accounts/${accountId}?tab=funds`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Funds
        </Link>
        <Link
          to={`/accounts/${accountId}?tab=contributions`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Contributions
        </Link>
        <Link
          to={`/accounts/${accountId}?tab=kyc`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          KYC
        </Link>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-sm py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${emphasis ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function StaffEntry({
  staff,
  note,
  as: Tag = "div",
}: {
  staff: AccountStaffMember;
  note?: string;
  as?: "div" | "li";
}) {
  return (
    <Tag className="text-sm">
      <p className="font-medium truncate">{staff.full_name || staff.email}</p>
      {staff.full_name && (
        <p className="text-muted-foreground truncate">{staff.email}</p>
      )}
      {staff.phone_number && (
        <p className="text-xs text-muted-foreground">{staff.phone_number}</p>
      )}
      <p className="text-xs text-muted-foreground mt-0.5">
        {note ? `${note} · ` : ""}
        Linked {formatDate(staff.linked_at)}
      </p>
    </Tag>
  );
}

function PanelLoading() {
  return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
}
