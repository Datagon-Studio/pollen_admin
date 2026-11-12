import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SortableTh } from "@/components/ui/sortable-th";
import { TablePagination } from "@/components/ui/table-pagination";
import { usePagination } from "@/hooks/usePagination";
import { useStaffRole } from "@/hooks/useStaffRole";
import { useSortedRows } from "@/lib/table-sort";
import { formatDate } from "@/lib/format";
import {
  adminApi,
  FundSettlementStatus,
} from "@/services/admin.api";

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const statusFilters: Array<"all" | FundSettlementStatus> = [
  "all",
  "pending",
  "successful",
  "canceled",
];

function todayInputValue(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatMoney(amount: number): string {
  return `GHS ${Number(amount).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

type RecordedSettlementsProps = {
  accountId?: string;
};

export function RecordedSettlements({ accountId }: RecordedSettlementsProps) {
  const queryClient = useQueryClient();
  const { canMutateCompliance } = useStaffRole();
  const [status, setStatus] = useState<"all" | FundSettlementStatus>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(accountId ?? "");
  const [fundId, setFundId] = useState("");
  const [amount, setAmount] = useState("");
  const [settlementDate, setSettlementDate] = useState(todayInputValue);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const lockedAccountId = accountId ?? "";
  const activeAccountId = lockedAccountId || selectedAccountId;

  const { data = [], isLoading, error } = useQuery({
    queryKey: ["fund-settlements", accountId ?? "all", status],
    queryFn: () =>
      adminApi.listFundSettlements({
        accountId,
        status: status === "all" ? undefined : status,
      }),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminApi.listAccounts(),
    enabled: canMutateCompliance && formOpen && !lockedAccountId,
  });

  const { data: funds = [], isLoading: fundsLoading } = useQuery({
    queryKey: ["admin-funds", activeAccountId, "settlement-form"],
    queryFn: () => adminApi.listFunds({ accountId: activeAccountId }),
    enabled: canMutateCompliance && formOpen && !!activeAccountId,
  });

  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["fund-settlement-availability", activeAccountId, fundId],
    queryFn: () => adminApi.getFundSettlementAvailability(activeAccountId, fundId),
    enabled: canMutateCompliance && formOpen && !!activeAccountId && !!fundId,
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["fund-settlements"] }),
      queryClient.invalidateQueries({ queryKey: ["fund-settlement-availability"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-account"] }),
    ]);
  };

  const record = useMutation({
    mutationFn: (nextStatus: "pending" | "successful") =>
      adminApi.recordFundSettlement({
        account_id: activeAccountId,
        fund_id: fundId,
        amount: Number(amount),
        settlement_date: settlementDate,
        status: nextStatus,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: async () => {
      setAmount("");
      setReference("");
      setNotes("");
      setFormError(null);
      setFormOpen(false);
      await invalidate();
    },
    onError: (mutationError) => {
      setFormError(mutationError instanceof Error ? mutationError.message : "Could not record settlement");
    },
  });

  const updateStatus = useMutation({
    mutationFn: (input: { settlementId: string; status: "successful" | "canceled" }) =>
      adminApi.updateFundSettlementStatus(input.settlementId, { status: input.status }),
    onSuccess: async () => {
      setActionError(null);
      await invalidate();
    },
    onError: (mutationError) => {
      setActionError(mutationError instanceof Error ? mutationError.message : "Could not update settlement");
    },
  });

  const archive = useMutation({
    mutationFn: (settlementId: string) => adminApi.archiveFundSettlement(settlementId),
    onSuccess: async () => {
      setConfirmArchiveId(null);
      setActionError(null);
      await invalidate();
    },
    onError: (mutationError) => {
      setActionError(mutationError instanceof Error ? mutationError.message : "Could not archive settlement");
    },
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return data;
    return data.filter((row) => {
      const accountName = row.account_name || "";
      return (
        accountName.toLowerCase().includes(query) ||
        row.fund_name.toLowerCase().includes(query) ||
        (row.reference || "").toLowerCase().includes(query)
      );
    });
  }, [data, search]);

  const rowSort = useSortedRows(filtered, (row, column) => {
    switch (column) {
      case "date":
        return row.settlement_date;
      case "account":
        return row.account_name || "";
      case "fund":
        return row.fund_name;
      case "amount":
        return Number(row.amount);
      case "reference":
        return row.reference || "";
      case "status":
        return row.status;
      default:
        return "";
    }
  });
  const pagination = usePagination(rowSort.sorted, undefined, `${status}|${search}|${accountId ?? ""}`);

  const accountOptions = useMemo(
    () =>
      [...accounts].sort((a, b) =>
        (a.account_name || "").localeCompare(b.account_name || "")
      ),
    [accounts]
  );

  const parsedAmount = Number(amount);
  const amountReady = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const withinBalance =
    !availability || (amountReady && parsedAmount <= availability.availableAmount + 0.001);
  const canSubmit =
    !!activeAccountId &&
    !!fundId &&
    !!settlementDate &&
    amountReady &&
    withinBalance &&
    availability?.availableAmount !== 0 &&
    !availabilityLoading &&
    !record.isPending;

  const submit = (event: FormEvent, nextStatus: "pending" | "successful") => {
    event.preventDefault();
    if (!canSubmit) {
      setFormError(
        availability && parsedAmount > availability.availableAmount
          ? `Amount cannot exceed ${formatMoney(availability.availableAmount)}.`
          : "Choose an account, fund, date, and a valid amount."
      );
      return;
    }
    setFormError(null);
    record.mutate(nextStatus);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={status === filter ? "default" : "outline"}
              onClick={() => setStatus(filter)}
              className="capitalize"
            >
              {filter}
            </Button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={accountId ? "Search fund or reference" : "Search account, fund, or reference"}
            className="w-full sm:w-72"
          />
          {canMutateCompliance && (
            <Button
              size="sm"
              onClick={() => {
                setFormOpen((open) => !open);
                setFormError(null);
              }}
            >
              {formOpen ? "Close form" : "Record settlement"}
            </Button>
          )}
        </div>
      </div>

      {formOpen && canMutateCompliance && (
        <form className="rounded-lg border bg-card p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Record a settlement</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start a pending payout, or record a payout that has already been paid.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {!lockedAccountId && (
              <div className="space-y-2">
                <Label htmlFor="settlement-account">Account</Label>
                <select
                  id="settlement-account"
                  className={fieldClass}
                  value={selectedAccountId}
                  onChange={(event) => {
                    setSelectedAccountId(event.target.value);
                    setFundId("");
                    setAmount("");
                  }}
                >
                  <option value="">Select an account</option>
                  {accountOptions.map((account) => (
                    <option key={account.account_id} value={account.account_id}>
                      {account.account_name || "Untitled account"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="settlement-fund">Fund</Label>
              <select
                id="settlement-fund"
                className={fieldClass}
                value={fundId}
                onChange={(event) => {
                  setFundId(event.target.value);
                  setAmount("");
                }}
                disabled={!activeAccountId || fundsLoading}
              >
                <option value="">{fundsLoading ? "Loading funds…" : "Select a fund"}</option>
                {funds.map((fund) => (
                  <option key={fund.fund_id} value={fund.fund_id}>
                    {fund.fund_name}
                    {fund.is_active ? "" : " (Inactive)"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-date">Date</Label>
              <Input
                id="settlement-date"
                type="date"
                value={settlementDate}
                onChange={(event) => setSettlementDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-amount">Amount (GHS)</Label>
              <Input
                id="settlement-amount"
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!fundId || availability?.availableAmount === 0}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settlement-reference">Reference</Label>
              <Input
                id="settlement-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Bank transfer, MoMo, or cheque reference"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="settlement-notes">Notes</Label>
              <textarea
                id="settlement-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Optional details about this payout"
              />
            </div>
          </div>

          {fundId && (
            <div className="rounded-md border bg-muted/40 px-3 py-3 space-y-2 text-sm">
              {availabilityLoading && (
                <p className="text-muted-foreground">Calculating available balance…</p>
              )}
              {availability && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Confirmed in fund</span>
                    <span>{formatMoney(availability.collected)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Already reserved</span>
                    <span>{formatMoney(availability.reservedAmount)}</span>
                  </div>
                  <div className="flex justify-between font-medium pt-1 border-t">
                    <span>Maximum withdrawable</span>
                    <span>{formatMoney(availability.availableAmount)}</span>
                  </div>
                  {availability.availableAmount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-0"
                      onClick={() => setAmount(availability.availableAmount.toFixed(2))}
                    >
                      Use maximum
                    </Button>
                  )}
                  {availability.availableAmount === 0 && (
                    <p className="text-destructive text-xs">This fund has no remaining balance to settle.</p>
                  )}
                </>
              )}
            </div>
          )}

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" disabled={!canSubmit} onClick={(event) => submit(event, "pending")}>
              {record.isPending ? "Saving…" : "Start settlement"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!canSubmit}
              onClick={(event) => submit(event, "successful")}
            >
              Record as paid
            </Button>
          </div>
        </form>
      )}

      {actionError && <p className="text-sm text-destructive">{actionError}</p>}

      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <SortableTh label="Date" column="date" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
              {!accountId && (
                <SortableTh label="Account" column="account" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
              )}
              <SortableTh label="Fund" column="fund" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
              <SortableTh label="Amount (GHS)" column="amount" align="right" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
              <SortableTh label="Reference" column="reference" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
              <SortableTh label="Status" column="status" sortColumn={rowSort.sortColumn} sortDirection={rowSort.sortDirection} onSort={rowSort.onSort} />
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {pagination.paginatedItems.map((row) => (
              <tr key={row.settlement_id} className="hover:bg-muted/20">
                <td className="p-3 text-muted-foreground">{formatDate(row.settlement_date)}</td>
                {!accountId && <td className="p-3 font-medium">{row.account_name || "Unknown"}</td>}
                <td className="p-3">{row.fund_name}</td>
                <td className="p-3 text-right font-semibold">{formatMoney(Number(row.amount)).replace("GHS ", "")}</td>
                <td className="p-3">
                  <p>{row.reference || "—"}</p>
                  {row.notes && <p className="text-xs text-muted-foreground">{row.notes}</p>}
                </td>
                <td className="p-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="p-3 text-right">
                  {canMutateCompliance && row.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ settlementId: row.settlement_id, status: "successful" })
                        }
                        disabled={updateStatus.isPending}
                      >
                        Mark paid
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          updateStatus.mutate({ settlementId: row.settlement_id, status: "canceled" })
                        }
                        disabled={updateStatus.isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                  {canMutateCompliance && row.status !== "pending" && (
                    confirmArchiveId === row.settlement_id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => archive.mutate(row.settlement_id)}
                          disabled={archive.isPending}
                        >
                          Archive
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmArchiveId(null)}>
                          Keep
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmArchiveId(row.settlement_id)}>
                        Archive
                      </Button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && (
          <div className="p-10 text-center text-muted-foreground">Loading recorded settlements...</div>
        )}
        {error && (
          <div className="p-10 text-center text-destructive">
            {error instanceof Error ? error.message : "Unable to load recorded settlements"}
          </div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="p-6">
            <EmptyState
              illustration={status === "all" && !search.trim() ? "signed-document" : "file-searching"}
              size="table"
              description="No recorded settlements match this view."
            />
          </div>
        )}
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
  );
}
