import { Fragment, useMemo, useState } from "react";
import { useSortedRows } from "@/lib/table-sort";
import { SortableTh } from "@/components/ui/sortable-th";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Search,
  Shield,
  User,
  XCircle,
} from "lucide-react";
import { SectionPage } from "@/components/pages/SectionPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { kycApi } from "@/services/kyc.api";
import { formatDate } from "@/lib/format";

export default function KycQueue() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: kycList = [], isLoading, error } = useQuery({
    queryKey: ["kyc-queue"],
    queryFn: () => kycApi.getAll(),
  });

  const filteredKYC = useMemo(() => {
    return kycList.filter((kyc) => {
      const matchesSearch =
        !searchQuery.trim() ||
        kyc.account_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        kyc.official_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || kyc.account_kyc_status === statusFilter;
      const matchesType = typeFilter === "all" || kyc.account_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [kycList, searchQuery, statusFilter, typeFilter]);

  const kycSort = useSortedRows(filteredKYC, (kyc, column) => {
    switch (column) {
      case "account":
        return kyc.account_name || "Unnamed account";
      case "official":
        return kyc.official_name;
      case "type":
        return kyc.account_type;
      case "status":
        return kyc.account_kyc_status || "unverified";
      case "submitted":
        return kyc.created_at;
      default:
        return "";
    }
  });

  const toggleRow = (kycId: string) => {
    const next = new Set(expandedRows);
    if (next.has(kycId)) next.delete(kycId);
    else next.add(kycId);
    setExpandedRows(next);
  };

  const reload = () => queryClient.invalidateQueries({ queryKey: ["kyc-queue"] });

  const handleVerify = async (accountId: string) => {
    try {
      setProcessing(accountId);
      setActionError(null);
      await kycApi.verify(accountId);
      await reload();
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      const next = new Set(expandedRows);
      next.delete(accountId);
      setExpandedRows(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to verify KYC");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (accountId: string) => {
    if (!confirm("Reject this KYC submission?")) return;
    try {
      setProcessing(accountId);
      setActionError(null);
      await kycApi.reject(accountId);
      await reload();
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] });
      const next = new Set(expandedRows);
      next.delete(accountId);
      setExpandedRows(next);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject KYC");
    } finally {
      setProcessing(null);
    }
  };

  const handleViewDocument = async (filePath: string) => {
    try {
      const url = await kycApi.getDocumentSignedUrl(filePath);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to open document");
    }
  };

  if (isLoading) {
    return (
      <SectionPage title="KYC queue" description="Review and verify submissions">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SectionPage>
    );
  }

  return (
    <SectionPage
      title="KYC queue"
      description="Approve or reject KYC submissions across all accounts."
      phase="ready"
    >
      {error && (
        <p className="text-sm text-destructive mb-4">
          {error instanceof Error ? error.message : "Failed to load KYC queue"}
        </p>
      )}
      {actionError && (
        <p className="text-sm text-destructive mb-4">{actionError}</p>
      )}

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search account or official name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="unverified">Unverified</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          <option value="business">Business</option>
          <option value="individual">Individual</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        Showing {filteredKYC.length} of {kycList.length} submissions
      </p>

      {filteredKYC.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No KYC submissions found</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="w-10 p-3" />
                <SortableTh label="Account" column="account" sortColumn={kycSort.sortColumn} sortDirection={kycSort.sortDirection} onSort={kycSort.onSort} />
                <SortableTh label="Official name" column="official" sortColumn={kycSort.sortColumn} sortDirection={kycSort.sortDirection} onSort={kycSort.onSort} />
                <SortableTh label="Type" column="type" sortColumn={kycSort.sortColumn} sortDirection={kycSort.sortDirection} onSort={kycSort.onSort} />
                <SortableTh label="Status" column="status" sortColumn={kycSort.sortColumn} sortDirection={kycSort.sortDirection} onSort={kycSort.onSort} />
                <SortableTh label="Submitted" column="submitted" sortColumn={kycSort.sortColumn} sortDirection={kycSort.sortDirection} onSort={kycSort.onSort} />
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {kycSort.sorted.map((kyc) => {
                const isExpanded = expandedRows.has(kyc.kyc_id);
                const status = kyc.account_kyc_status || "unverified";
                return (
                  <Fragment key={kyc.kyc_id}>
                    <tr
                      className="border-b hover:bg-muted/30 cursor-pointer"
                      onClick={() => toggleRow(kyc.kyc_id)}
                    >
                      <td className="p-3">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="p-3 font-medium">
                        {kyc.account_name || "Unnamed account"}
                      </td>
                      <td className="p-3">{kyc.official_name}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1.5 capitalize">
                          {kyc.account_type === "business" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                          {kyc.account_type}
                        </span>
                      </td>
                      <td className="p-3">
                        <StatusBadge
                          status={
                            status as
                              | "unverified"
                              | "pending"
                              | "verified"
                              | "rejected"
                          }
                        />
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {formatDate(kyc.created_at)}
                      </td>
                      <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {status !== "verified" ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              disabled={processing === kyc.account_id}
                              onClick={() => handleVerify(kyc.account_id)}
                            >
                              {processing === kyc.account_id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Verify
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processing === kyc.account_id}
                              onClick={() => handleReject(kyc.account_id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-success text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            Verified
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={7} className="p-6">
                          <div className="space-y-4 max-w-3xl">
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Account ID</p>
                                <p className="font-mono mt-1">{kyc.account_id}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Official name</p>
                                <p className="font-medium mt-1">{kyc.official_name}</p>
                              </div>
                            </div>
                            <div>
                              <h3 className="text-sm font-semibold mb-2">Documents</h3>
                              <div className="space-y-2">
                                {kyc.account_type === "business" &&
                                  kyc.business_registration_url && (
                                    <DocRow
                                      icon={<FileText className="h-5 w-5" />}
                                      title="Business registration"
                                      onView={() =>
                                        handleViewDocument(kyc.business_registration_url!)
                                      }
                                    />
                                  )}
                                {kyc.account_type === "individual" &&
                                  kyc.passport_photo_url && (
                                    <DocRow
                                      icon={<ImageIcon className="h-5 w-5" />}
                                      title="Passport photo"
                                      onView={() =>
                                        handleViewDocument(kyc.passport_photo_url!)
                                      }
                                    />
                                  )}
                                {kyc.national_id_url && (
                                  <DocRow
                                    icon={<FileText className="h-5 w-5" />}
                                    title="National ID"
                                    onView={() => handleViewDocument(kyc.national_id_url)}
                                  />
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2 border-t">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Submitted {formatDate(kyc.created_at)}
                              </span>
                              {kyc.verified_at && (
                                <span className="inline-flex items-center gap-1 text-success">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Verified {formatDate(kyc.verified_at)}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SectionPage>
  );
}

function DocRow({
  icon,
  title,
  onView,
}: {
  icon: React.ReactNode;
  title: string;
  onView: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg bg-background">
      <div className="flex items-center gap-3 text-muted-foreground">
        {icon}
        <span className="font-medium text-foreground">{title}</span>
      </div>
      <Button variant="outline" size="sm" onClick={onView}>
        <ExternalLink className="h-4 w-4 mr-2" />
        View
      </Button>
    </div>
  );
}
