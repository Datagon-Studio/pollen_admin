import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { adminApi } from "@/services/admin.api";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: p, isLoading, error } = useQuery({
    queryKey: ["admin-payment", id],
    queryFn: () => adminApi.getPayment(id!),
    enabled: !!id,
  });

  const verifyMutation = useMutation({
    mutationFn: () => adminApi.verifyPayment(id!),
    onSuccess: async () => {
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payment", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
      ]);
    },
    onError: async (mutationError) => {
      setActionError(
        mutationError instanceof Error ? mutationError.message : "Verification failed"
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-payment", id] }),
        queryClient.invalidateQueries({ queryKey: ["admin-payments"] }),
      ]);
    },
  });

  if (isLoading) {
    return (
      <SectionPage title="Payment detail" description="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  if (error || !p) {
    return (
      <SectionPage title="Payment detail" description="Not found">
        <Button asChild variant="outline" size="sm">
          <Link to="/payments">← All payments</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="pt-6">
            <EmptyState
              illustration="files-missing"
              description={error instanceof Error ? error.message : "Payment not found"}
            />
          </CardContent>
        </Card>
      </SectionPage>
    );
  }

  const canVerify = p.status !== "successful";

  return (
    <SectionPage
      title={formatCurrency(p.contribution_amount)}
      description={`${p.contributor_name} · ${p.reference}`}
      phase="ready"
      actions={
        canVerify ? (
          <Button
            size="sm"
            onClick={() => verifyMutation.mutate()}
            disabled={verifyMutation.isPending}
          >
            {verifyMutation.isPending ? "Verifying…" : "Verify payment"}
          </Button>
        ) : null
      }
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/payments">← All payments</Link>
      </Button>

      {actionError && (
        <p className="mt-3 text-sm text-destructive">{actionError}</p>
      )}

      <Card className="mt-4 max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Status">
            <StatusBadge status={p.status} />
          </Row>
          <Row label="Paystack status" value={p.paystack_status || "—"} />
          <Row label="Contribution" value={formatCurrency(p.contribution_amount)} />
          <Row label="Fee" value={formatCurrency(p.fee_amount)} />
          <Row label="Charged" value={formatCurrency(p.charged_amount)} />
          <Row label="Currency" value={p.currency} />
          <Row label="Reference">
            <span className="font-mono text-xs">{p.reference}</span>
          </Row>
          <Row label="Customer" value={p.contributor_name} />
          <Row label="Email" value={p.user_email} />
          <Row label="Phone" value={p.phone || "—"} />
          <Row label="Initiated" value={formatDateTime(p.created_at)} />
          <Row
            label="Paid at"
            value={p.paid_at ? formatDateTime(p.paid_at) : "—"}
          />
          <Row
            label="Last verified"
            value={p.last_verified_at ? formatDateTime(p.last_verified_at) : "—"}
          />
          <Row
            label="Webhook received"
            value={p.webhook_received_at ? formatDateTime(p.webhook_received_at) : "—"}
          />
          <Row label="Verification attempts" value={String(p.verification_attempts)} />
          <Row label="Last error" value={p.last_error || "—"} />
          <Row label="Payment ID">
            <span className="font-mono text-xs">{p.payment_id}</span>
          </Row>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mt-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              to={`/accounts/${p.account_id}`}
              className="text-sm font-medium hover:underline"
            >
              {p.account_name || "Unnamed account"}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Fund</CardTitle>
          </CardHeader>
          <CardContent>
            <Link to={`/funds/${p.fund_id}`} className="text-sm font-medium hover:underline">
              {p.fund_name || "Fund"}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Contribution</CardTitle>
          </CardHeader>
          <CardContent>
            {p.contribution_id ? (
              <Link
                to={`/contributions/${p.contribution_id}`}
                className="text-sm font-medium hover:underline"
              >
                View contribution
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">Not recorded yet</span>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionPage>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{children ?? value}</span>
    </div>
  );
}
