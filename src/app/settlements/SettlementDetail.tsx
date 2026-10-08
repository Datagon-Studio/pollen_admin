import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  adminApi,
  SettlementRequestStatus,
} from "@/services/admin.api";
import { formatCurrency, formatDate } from "@/lib/format";
import { useStaffRole } from "@/hooks/useStaffRole";

export default function SettlementDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { canMutateCompliance } = useStaffRole();
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["settlement-request", id],
    queryFn: () => adminApi.getSettlementRequest(id!),
    enabled: !!id,
  });
  const mutation = useMutation({
    mutationFn: (status: Exclude<SettlementRequestStatus, "pending">) =>
      adminApi.updateSettlementRequestStatus(id!, {
        status,
        note: note.trim() || undefined,
        disbursement_reference: reference.trim() || undefined,
      }),
    onSuccess: async () => {
      setNote("");
      setReference("");
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["settlement-request", id] }),
        queryClient.invalidateQueries({ queryKey: ["settlement-requests"] }),
      ]);
    },
    onError: (mutationError) => {
      setActionError(
        mutationError instanceof Error ? mutationError.message : "Status update failed"
      );
    },
  });

  return (
    <SectionPage
      title="Settlement request"
      description="Review the requested amount and captured payment destination before changing status."
      phase="ready"
    >
      <div className="space-y-5">
        <Button asChild variant="outline" size="sm">
          <Link to="/settlements">← All settlement requests</Link>
        </Button>

        {isLoading && <p className="text-muted-foreground">Loading request...</p>}
        {error && (
          <p className="text-destructive">
            {error instanceof Error ? error.message : "Unable to load request"}
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <section className="rounded-lg border bg-card p-5 lg:col-span-2">
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <p className="text-sm text-muted-foreground">Requested amount</p>
                    <p className="text-3xl font-semibold">
                      {formatCurrency(Number(data.amount))}
                    </p>
                  </div>
                  <StatusBadge status={data.status} />
                </div>
                <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Account</dt>
                    <dd className="font-medium">{data.account_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Fund</dt>
                    <dd className="font-medium">{data.fund_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requester</dt>
                    <dd>{data.requester_name || data.requester_email || "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Requested</dt>
                    <dd>{formatDate(data.created_at)}</dd>
                  </div>
                </dl>
                {data.request_note && (
                  <div className="mt-5 border-t pt-4">
                    <p className="text-sm text-muted-foreground">Manager note</p>
                    <p className="mt-1">{data.request_note}</p>
                  </div>
                )}
              </section>

              <section className="rounded-lg border bg-card p-5">
                <h2 className="font-semibold mb-4">Payment details</h2>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Type</dt>
                    <dd className="capitalize">
                      {data.destination_type.replace("_", " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Account name</dt>
                    <dd className="font-medium">{data.destination_account_name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Account number</dt>
                    <dd className="font-mono">{data.destination_account_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {data.destination_type === "bank" ? "Bank" : "Provider"}
                    </dt>
                    <dd>{data.destination_bank_name || data.destination_provider}</dd>
                  </div>
                  {data.destination_bank_branch && (
                    <div>
                      <dt className="text-muted-foreground">Branch</dt>
                      <dd>{data.destination_bank_branch}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            {canMutateCompliance &&
              (data.status === "pending" || data.status === "approved") && (
                <section className="rounded-lg border bg-card p-5 space-y-4">
                  <div>
                    <h2 className="font-semibold">Admin action</h2>
                    <p className="text-sm text-muted-foreground">
                      Pending requests can be approved or rejected. Approved requests can be marked disbursed.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="admin-note">
                        Admin note {data.status === "pending" ? "(required to reject)" : ""}
                      </Label>
                      <textarea
                        id="admin-note"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Reason or internal processing note"
                      />
                    </div>
                    {data.status === "approved" && (
                      <div className="space-y-2">
                        <Label htmlFor="disbursement-reference">
                          Disbursement reference
                        </Label>
                        <Input
                          id="disbursement-reference"
                          value={reference}
                          onChange={(event) => setReference(event.target.value)}
                          placeholder="Provider or transfer reference"
                        />
                      </div>
                    )}
                  </div>
                  {actionError && <p className="text-sm text-destructive">{actionError}</p>}
                  <div className="flex flex-wrap gap-2">
                    {data.status === "pending" && (
                      <>
                        <Button
                          className="bg-success text-white hover:bg-success/90"
                          onClick={() => mutation.mutate("approved")}
                          disabled={mutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => mutation.mutate("rejected")}
                          disabled={mutation.isPending || !note.trim()}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {data.status === "approved" && (
                      <>
                        <Button
                          className="bg-blue-600 text-white hover:bg-blue-700"
                          onClick={() => mutation.mutate("disbursed")}
                          disabled={mutation.isPending}
                        >
                          Mark disbursed
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => mutation.mutate("rejected")}
                          disabled={mutation.isPending || !note.trim()}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </section>
              )}

            <section className="rounded-lg border bg-card p-5">
              <h2 className="font-semibold mb-4">Status history</h2>
              <div className="space-y-4">
                {data.history.map((event) => (
                  <div key={event.history_id} className="flex gap-3 text-sm">
                    <StatusBadge status={event.new_status} />
                    <div>
                      <p>
                        {event.changed_by_name || "User"} · {formatDate(event.created_at)}
                      </p>
                      {event.note && (
                        <p className="text-muted-foreground mt-0.5">{event.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </SectionPage>
  );
}
