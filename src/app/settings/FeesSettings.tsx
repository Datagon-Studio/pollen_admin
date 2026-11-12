import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Percent, Trash2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { adminApi } from "@/services/admin.api";

const FEES_QUERY_KEY = ["admin-fees"] as const;
const fieldClass =
  "h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export default function FeesSettings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: FEES_QUERY_KEY,
    queryFn: () => adminApi.getFees(),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: () => adminApi.listAccounts(),
    staleTime: 5 * 60 * 1000,
  });

  const [globalPercent, setGlobalPercent] = useState("2");
  const [accountId, setAccountId] = useState("");
  const [accountPercent, setAccountPercent] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (data) setGlobalPercent(String(data.globalPercent));
  }, [data]);

  const overrideAccountIds = useMemo(
    () => new Set((data?.overrides ?? []).map((row) => row.account_id)),
    [data?.overrides],
  );

  const availableAccounts = useMemo(
    () =>
      accounts
        .filter((account) => !overrideAccountIds.has(account.account_id))
        .map((account) => ({
          id: account.account_id,
          name: account.account_name || "Unnamed account",
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [accounts, overrideAccountIds],
  );

  const saveGlobal = useMutation({
    mutationFn: (percent: number) => adminApi.setGlobalFee(percent),
    onSuccess: async (result) => {
      setNotice(`Global fee saved at ${result.percent}%.`);
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: FEES_QUERY_KEY });
    },
    onError: (err) => {
      setNotice("");
      setFormError(err instanceof Error ? err.message : "Failed to save global fee");
    },
  });

  const saveOverride = useMutation({
    mutationFn: (input: { accountId: string; percent: number }) =>
      adminApi.setAccountFee(input.accountId, { percent: input.percent }),
    onSuccess: async () => {
      setNotice("Account fee override saved.");
      setFormError("");
      setAccountId("");
      setAccountPercent("");
      await queryClient.invalidateQueries({ queryKey: FEES_QUERY_KEY });
    },
    onError: (err) => {
      setNotice("");
      setFormError(err instanceof Error ? err.message : "Failed to save account fee");
    },
  });

  const clearOverride = useMutation({
    mutationFn: (id: string) => adminApi.setAccountFee(id, { clear: true }),
    onSuccess: async () => {
      setNotice("Account now uses the global fee.");
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: FEES_QUERY_KEY });
    },
    onError: (err) => {
      setNotice("");
      setFormError(err instanceof Error ? err.message : "Failed to clear account fee");
    },
  });

  const onSaveGlobal = (event: FormEvent) => {
    event.preventDefault();
    const percent = parsePercent(globalPercent);
    if (percent === null || percent < 0 || percent > 100) {
      setFormError("Enter a global fee between 0 and 100.");
      return;
    }
    saveGlobal.mutate(percent);
  };

  const onSaveOverride = (event: FormEvent) => {
    event.preventDefault();
    if (!accountId) {
      setFormError("Choose an account for the override.");
      return;
    }
    const percent = parsePercent(accountPercent);
    if (percent === null || percent < 0 || percent > 100) {
      setFormError("Enter an account fee between 0 and 100.");
      return;
    }
    saveOverride.mutate({ accountId, percent });
  };

  return (
    <SectionPage
      title="Transaction fees"
      description="Set the platform default fee for online contributions, and optional per-account overrides."
      badge={null}
    >
      {(formError || notice) && (
        <p
          className={
            formError
              ? "text-sm text-destructive bg-destructive/10 rounded-md p-3"
              : "text-sm bg-secondary rounded-md p-3"
          }
        >
          {formError || notice}
        </p>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Loading fee settings…</p>}
      {error && (
        <Card>
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Failed to load fee settings"}
          </CardContent>
        </Card>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Global fee
              </CardTitle>
              <CardDescription>
                Applied to every account that does not have its own override. Currently{" "}
                {data.globalPercent}%.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSaveGlobal} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="global-fee">Fee percent</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="global-fee"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={globalPercent}
                      onChange={(event) => setGlobalPercent(event.target.value)}
                      className="max-w-[10rem]"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <Button type="submit" disabled={saveGlobal.isPending}>
                  {saveGlobal.isPending ? "Saving…" : "Save global fee"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account override</CardTitle>
              <CardDescription>
                Use a different rate for one organization. Leave others on the global default.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSaveOverride} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fee-account">Account</Label>
                  <select
                    id="fee-account"
                    className={`${fieldClass} w-full`}
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                  >
                    <option value="">Select an account</option>
                    {availableAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account-fee">Fee percent</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="account-fee"
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      value={accountPercent}
                      onChange={(event) => setAccountPercent(event.target.value)}
                      className="max-w-[10rem]"
                    />
                    <span className="text-sm text-muted-foreground">%</span>
                  </div>
                </div>
                <Button type="submit" disabled={saveOverride.isPending || availableAccounts.length === 0}>
                  {saveOverride.isPending ? "Saving…" : "Add override"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Account overrides</CardTitle>
              <CardDescription>
                These accounts charge a custom fee instead of the global {data.globalPercent}%.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.overrides.length === 0 ? (
                <EmptyState
                  illustration="file-searching"
                  size="table"
                  description="No account overrides yet. Every account uses the global fee."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Account</th>
                        <th className="py-2 pr-4 font-medium">Fee</th>
                        <th className="py-2 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.overrides.map((row) => (
                        <tr key={row.account_id} className="border-b border-border/70">
                          <td className="py-3 pr-4">
                            <p className="font-medium">{row.account_name || "Unnamed account"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{row.account_id}</p>
                          </td>
                          <td className="py-3 pr-4 tabular-nums">{row.percent}%</td>
                          <td className="py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={clearOverride.isPending}
                              onClick={() => clearOverride.mutate(row.account_id)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Use global
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </SectionPage>
  );
}
