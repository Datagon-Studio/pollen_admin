import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2 } from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContributionTable } from "@/components/catalog/ContributionTable";
import { AuditLogTable } from "@/components/audit/AuditLogTable";
import { adminApi } from "@/services/admin.api";
import { kycApi } from "@/services/kyc.api";
import { useStaffRole } from "@/hooks/useStaffRole";
import { formatCurrency, formatDate } from "@/lib/format";

const TAB_IDS = [
  "overview",
  "members",
  "funds",
  "team",
  "contributions",
  "kyc",
  "audit",
] as const;

type TabId = (typeof TAB_IDS)[number];

const tabs: TabItem[] = [
  { id: "overview", label: "Overview" },
  { id: "members", label: "Members" },
  { id: "funds", label: "Funds" },
  { id: "team", label: "Manager & officers" },
  { id: "contributions", label: "Contributions" },
  { id: "kyc", label: "KYC" },
  { id: "audit", label: "Audit" },
];

function parseTab(value: string | null): TabId {
  if (value && TAB_IDS.includes(value as TabId)) return value as TabId;
  return "overview";
}

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseTab(searchParams.get("tab"));
  const queryClient = useQueryClient();
  const { canManagePlatform, canMutateCompliance } = useStaffRole();
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [kycDocError, setKycDocError] = useState<string | null>(null);

  const setTab = (tabId: string) => {
    setSearchParams(tabId === "overview" ? {} : { tab: tabId }, { replace: true });
  };

  const { data: account, isLoading, error } = useQuery({
    queryKey: ["admin-account", id],
    queryFn: () => adminApi.getAccount(id!),
    enabled: !!id,
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["admin-members", id],
    queryFn: () => adminApi.listMembers({ accountId: id! }),
    enabled: !!id && activeTab === "members",
  });

  const { data: funds = [], isLoading: fundsLoading } = useQuery({
    queryKey: ["admin-funds", id],
    queryFn: () => adminApi.listFunds({ accountId: id! }),
    enabled: !!id && activeTab === "funds",
  });

  const { data: contributions = [], isLoading: contribLoading } = useQuery({
    queryKey: ["admin-contributions", id],
    queryFn: () => adminApi.listContributions({ accountId: id! }),
    enabled: !!id && activeTab === "contributions",
  });

  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ["admin-account-team", id],
    queryFn: () => adminApi.getAccountTeam(id!),
    enabled: !!id && activeTab === "team",
  });

  const { data: accountKyc, isLoading: kycLoading } = useQuery({
    queryKey: ["admin-account-kyc", id],
    queryFn: () => adminApi.getAccountKyc(id!),
    enabled: !!id && activeTab === "kyc",
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery({
    queryKey: ["admin-audit-logs", id],
    queryFn: () => adminApi.listAuditLogs({ accountId: id!, limit: 100 }),
    enabled: !!id && activeTab === "audit",
  });

  const statusMutation = useMutation({
    mutationFn: async (action: "deactivate" | "reactivate") => {
      if (!id || !reason.trim()) throw new Error("Reason is required");
      if (action === "deactivate") {
        await adminApi.deactivateAccount(id, reason.trim());
      } else {
        await adminApi.reactivateAccount(id, reason.trim());
      }
    },
    onSuccess: () => {
      setReason("");
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-account", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (err) => {
      setActionError(err instanceof Error ? err.message : "Action failed");
    },
  });

  const openKycDocument = async (path: string) => {
    try {
      setKycDocError(null);
      const url = await kycApi.getDocumentSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setKycDocError(err instanceof Error ? err.message : "Failed to open document");
    }
  };

  if (isLoading) {
    return (
      <SectionPage title="Account detail" description="Loading…">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  if (error || !account) {
    return (
      <SectionPage title="Account detail" description="Account not found">
        <Button asChild variant="outline" size="sm">
          <Link to="/accounts">← All accounts</Link>
        </Button>
        <Card className="mt-4">
          <CardContent className="pt-6 text-sm text-destructive">
            {error instanceof Error ? error.message : "Account not found"}
          </CardContent>
        </Card>
      </SectionPage>
    );
  }

  const isActive = account.status === "active";

  return (
    <SectionPage
      title={account.account_name || "Unnamed account"}
      description={`Account ${account.account_id}`}
      phase="ready"
    >
      <Button asChild variant="outline" size="sm">
        <Link to="/accounts">← All accounts</Link>
      </Button>

      <div className="mt-4">
        <Tabs tabs={tabs} active={activeTab} onChange={setTab} />
      </div>

      <div className="mt-6">
        {activeTab === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Status">
                    <StatusBadge
                      status={account.status as "active" | "inactive" | "suspended"}
                    />
                  </Row>
                  <Row label="KYC">
                    <StatusBadge
                      status={
                        account.kyc_status as
                          | "unverified"
                          | "pending"
                          | "verified"
                          | "rejected"
                      }
                    />
                  </Row>
                  <Row label="Short URL">{account.short_url || "—"}</Row>
                  <Row label="Created">{formatDate(account.created_at)}</Row>
                  <Row label="Updated">{formatDate(account.updated_at)}</Row>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <Row label="Members">{account.member_count}</Row>
                  <Row label="Funds">
                    {account.active_fund_count} active / {account.fund_count} total
                  </Row>
                  <Row label="Total collected">
                    {formatCurrency(account.total_collected)}
                  </Row>
                  <Row label="Online">{formatCurrency(account.online_collected)}</Row>
                  <Row label="Manual">{formatCurrency(account.manual_collected)}</Row>
                  <Row label="Total disbursed">
                    {formatCurrency(account.total_disbursed)}
                  </Row>
                  <Row label="Net held">
                    {formatCurrency(account.total_collected - account.total_disbursed)}
                  </Row>
                </CardContent>
              </Card>
            </div>

            {canManagePlatform && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {isActive ? "Deactivate account" : "Reactivate account"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (required)</Label>
                    <Input
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is this status changing?"
                    />
                  </div>
                  {actionError && (
                    <p className="text-sm text-destructive">{actionError}</p>
                  )}
                  <Button
                    variant={isActive ? "destructive" : "default"}
                    disabled={statusMutation.isPending || !reason.trim()}
                    onClick={() =>
                      statusMutation.mutate(isActive ? "deactivate" : "reactivate")
                    }
                  >
                    {statusMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isActive ? (
                      "Deactivate"
                    ) : (
                      "Reactivate"
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "members" && (
          <TabPanel loading={membersLoading} empty={members.length === 0} emptyLabel="No members">
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Phone</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Contributions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.member_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/members/${m.member_id}`} className="font-medium hover:underline">
                          {m.full_name}
                        </Link>
                      </td>
                      <td className="p-3 text-muted-foreground">{m.phone}</td>
                      <td className="p-3">
                        <StatusBadge status={m.is_active ? "active" : "inactive"} />
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(m.contribution_total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabPanel>
        )}

        {activeTab === "funds" && (
          <TabPanel loading={fundsLoading} empty={funds.length === 0} emptyLabel="No funds">
            <div className="border rounded-lg overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Fund</th>
                    <th className="text-right p-3 font-medium">Collected</th>
                    <th className="text-right p-3 font-medium">Goal</th>
                    <th className="text-left p-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {funds.map((f) => (
                    <tr key={f.fund_id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/funds/${f.fund_id}`} className="font-medium hover:underline">
                          {f.fund_name}
                        </Link>
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatCurrency(f.amount_collected)}
                      </td>
                      <td className="p-3 text-right tabular-nums text-muted-foreground">
                        {f.fund_goal != null ? formatCurrency(f.fund_goal) : "—"}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={f.is_active ? "active" : "inactive"} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabPanel>
        )}

        {activeTab === "team" && (
          <TabPanel
            loading={teamLoading}
            empty={!team?.managers.length && !team?.officers.length}
            emptyLabel="No linked managers or officers"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <StaffCard title="Managers" members={team?.managers ?? []} />
              <StaffCard title="Officers (collectors)" members={team?.officers ?? []} />
            </div>
          </TabPanel>
        )}

        {activeTab === "contributions" && (
          <TabPanel
            loading={contribLoading}
            empty={contributions.length === 0}
            emptyLabel="No contributions"
          >
            <ContributionTable rows={contributions} />
          </TabPanel>
        )}

        {activeTab === "kyc" && (
          <TabPanel loading={kycLoading} empty={false}>
            {kycDocError && (
              <p className="text-sm text-destructive mb-4">{kycDocError}</p>
            )}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">KYC status</CardTitle>
                {canMutateCompliance && account.kyc_status === "pending" && (
                  <Button asChild size="sm" variant="outline">
                    <Link to="/kyc">Open KYC queue →</Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Row label="Status">
                  <StatusBadge
                    status={
                      accountKyc?.account_kyc_status as
                        | "unverified"
                        | "pending"
                        | "verified"
                        | "rejected"
                    }
                  />
                </Row>
                {!accountKyc?.kyc ? (
                  <p className="text-muted-foreground">No KYC submission on file.</p>
                ) : (
                  <>
                    <Row label="Official name" value={accountKyc.kyc.official_name} />
                    <Row label="Type" value={accountKyc.kyc.account_type} />
                    <Row label="Submitted" value={formatDate(accountKyc.kyc.created_at)} />
                    {accountKyc.kyc.verified_at && (
                      <Row label="Verified" value={formatDate(accountKyc.kyc.verified_at)} />
                    )}
                    <div className="space-y-2 pt-2 border-t">
                      <p className="font-medium">Documents</p>
                      {accountKyc.kyc.national_id_url && (
                        <DocButton
                          label="National ID"
                          onClick={() => openKycDocument(accountKyc.kyc!.national_id_url)}
                        />
                      )}
                      {accountKyc.kyc.business_registration_url && (
                        <DocButton
                          label="Business registration"
                          onClick={() =>
                            openKycDocument(accountKyc.kyc!.business_registration_url!)
                          }
                        />
                      )}
                      {accountKyc.kyc.passport_photo_url && (
                        <DocButton
                          label="Passport photo"
                          onClick={() => openKycDocument(accountKyc.kyc!.passport_photo_url!)}
                        />
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabPanel>
        )}

        {activeTab === "audit" && (
          <TabPanel loading={auditLoading} empty={auditLogs.length === 0} emptyLabel="No audit events">
            <AuditLogTable logs={auditLogs} />
          </TabPanel>
        )}
      </div>
    </SectionPage>
  );
}

function TabPanel({
  loading,
  empty,
  emptyLabel,
  children,
}: {
  loading: boolean;
  empty?: boolean;
  emptyLabel?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (empty) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{emptyLabel}</p>;
  }
  return <>{children}</>;
}

function StaffCard({
  title,
  members,
}: {
  title: string;
  members: Array<{
    user_id: string;
    email: string;
    full_name: string | null;
    phone_number: string | null;
    linked_at: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground">None</p>
        ) : (
          <ul className="space-y-3 text-sm">
            {members.map((m) => (
              <li key={m.user_id} className="border-b last:border-0 pb-3 last:pb-0">
                <p className="font-medium">{m.full_name || m.email}</p>
                <p className="text-muted-foreground">{m.email}</p>
                {m.phone_number && (
                  <p className="text-muted-foreground text-xs">{m.phone_number}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Linked {formatDate(m.linked_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function DocButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick}>
      <ExternalLink className="h-4 w-4 mr-2" />
      {label}
    </Button>
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
      <span className="text-right capitalize">{children ?? value}</span>
    </div>
  );
}
