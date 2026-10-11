import { request } from "@/lib/api-client";

export interface PlatformDashboard {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  suspendedAccounts: number;
  activeFunds: number;
  totalFunds: number;
  totalCollected: number;
  collectedThisMonth: number;
  pendingKycCount: number;
  monthlyTrend: Array<{
    month: string;
    online: number;
    manual: number;
    total: number;
  }>;
}

export interface AdminAccountSummary {
  account_id: string;
  account_name: string | null;
  account_logo: string | null;
  status: string;
  kyc_status: string;
  created_at: string;
  member_count: number;
  fund_count: number;
  active_fund_count: number;
  total_collected: number;
  online_collected: number;
  manual_collected: number;
  total_disbursed: number;
  expense_count: number;
}

export interface AdminAccountDetail extends AdminAccountSummary {
  short_url: string | null;
  updated_at: string;
}

export interface AdminMemberSummary {
  member_id: string;
  account_id: string;
  account_name: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  phone_verified: boolean;
  email_verified: boolean;
  membership_number: string | null;
  is_active: boolean;
  also_in_count: number;
  contribution_count: number;
  contribution_total: number;
  created_at: string;
}

export interface AdminMemberOtherGroup {
  member_id: string;
  account_id: string;
  account_name: string | null;
  full_name: string;
}

export interface AdminContributionRow {
  contribution_id: string;
  account_id: string;
  account_name: string | null;
  fund_id: string;
  fund_name: string | null;
  member_id: string | null;
  member_name: string | null;
  amount: number;
  channel: "offline" | "online";
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  date_received: string;
  comment: string | null;
  received_by_user_id: string | null;
  created_at: string;
}

export interface AdminMemberDetail extends AdminMemberSummary {
  dob: string | null;
  other_groups: AdminMemberOtherGroup[];
  contributions: AdminContributionRow[];
}

export interface AdminFundSummary {
  fund_id: string;
  account_id: string;
  account_name: string | null;
  fund_name: string;
  fund_goal: number | null;
  amount_collected: number;
  is_public: boolean;
  is_active: boolean;
  settlement_status: string | null;
  created_at: string;
}

export interface AdminFundDetail extends AdminFundSummary {
  description: string | null;
  default_amount: number | null;
  updated_at: string;
  contributions: AdminContributionRow[];
}

export interface AdminContributionDetail extends AdminContributionRow {
  updated_at: string;
}

export interface AccountStaffMember {
  user_id: string;
  email: string;
  full_name: string | null;
  phone_number: string | null;
  account_role: string;
  linked_at: string;
}

export interface AdminAccountTeam {
  managers: AccountStaffMember[];
  officers: AccountStaffMember[];
}

export interface AdminAccountKycRecord {
  kyc_id: string;
  account_id: string;
  account_type: "individual" | "business";
  official_name: string;
  business_registration_url: string | null;
  passport_photo_url: string | null;
  national_id_url: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAccountKyc {
  account_kyc_status: string;
  kyc: AdminAccountKycRecord | null;
}

export interface AuditLogEntry {
  audit_id: string;
  action_type: string;
  action_category: string;
  user_id: string | null;
  account_id: string | null;
  entity_type: string | null;
  entity_id: string | null;
  action_details: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

export type SettlementRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "disbursed";

export interface AdminSettlementRequest {
  request_id: string;
  account_id: string;
  account_name: string;
  fund_id: string;
  fund_name: string;
  requested_by_user_id: string;
  requester_name: string | null;
  requester_email: string | null;
  amount: number;
  status: SettlementRequestStatus;
  request_note: string | null;
  admin_note: string | null;
  destination_type: "bank" | "mobile_money";
  destination_account_name: string;
  destination_account_number: string;
  destination_bank_name: string | null;
  destination_bank_branch: string | null;
  destination_provider: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  disbursed_at: string | null;
  disbursement_reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettlementRequestHistory {
  history_id: string;
  previous_status: SettlementRequestStatus | null;
  new_status: SettlementRequestStatus;
  changed_by_user_id: string;
  changed_by_name: string | null;
  note: string | null;
  created_at: string;
}

export interface AdminSettlementRequestDetail extends AdminSettlementRequest {
  history: SettlementRequestHistory[];
  fund_collected: number;
  fund_disbursed: number;
}

function qs(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") search.set(k, v);
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

export const adminApi = {
  async listSettlementRequests(params?: {
    status?: SettlementRequestStatus;
    accountId?: string;
    fundId?: string;
  }): Promise<AdminSettlementRequest[]> {
    const response = await request<AdminSettlementRequest[]>(
      `/admin/settlement-requests${qs({
        status: params?.status,
        accountId: params?.accountId,
        fundId: params?.fundId,
      })}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load settlement requests");
    }
    return response.data;
  },

  async getSettlementRequest(
    requestId: string
  ): Promise<AdminSettlementRequestDetail> {
    const response = await request<AdminSettlementRequestDetail>(
      `/admin/settlement-requests/${requestId}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load settlement request");
    }
    return response.data;
  },

  async updateSettlementRequestStatus(
    requestId: string,
    input: {
      status: Exclude<SettlementRequestStatus, "pending">;
      note?: string;
      disbursement_reference?: string;
    }
  ): Promise<AdminSettlementRequest> {
    const response = await request<AdminSettlementRequest>(
      `/admin/settlement-requests/${requestId}/status`,
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to update settlement request");
    }
    return response.data;
  },

  async getDashboard(): Promise<PlatformDashboard> {
    const response = await request<PlatformDashboard>("/admin/dashboard", {
      method: "GET",
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load dashboard");
    }
    return response.data;
  },

  async listAccounts(): Promise<AdminAccountSummary[]> {
    const response = await request<AdminAccountSummary[]>("/admin/accounts", {
      method: "GET",
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load accounts");
    }
    return response.data;
  },

  async getAccount(accountId: string): Promise<AdminAccountDetail> {
    const response = await request<AdminAccountDetail>(
      `/admin/accounts/${accountId}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load account");
    }
    return response.data;
  },

  async deactivateAccount(accountId: string, reason: string): Promise<void> {
    const response = await request(`/admin/accounts/${accountId}/deactivate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    if (!response.success) {
      throw new Error(response.error || "Failed to deactivate account");
    }
  },

  async reactivateAccount(accountId: string, reason: string): Promise<void> {
    const response = await request(`/admin/accounts/${accountId}/reactivate`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
    if (!response.success) {
      throw new Error(response.error || "Failed to reactivate account");
    }
  },

  async listMembers(params?: {
    accountId?: string;
    verified?: boolean;
    search?: string;
  }): Promise<AdminMemberSummary[]> {
    const response = await request<AdminMemberSummary[]>(
      `/admin/members${qs({
        accountId: params?.accountId,
        search: params?.search,
        verified:
          params?.verified === true
            ? "true"
            : params?.verified === false
              ? "false"
              : undefined,
      })}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load members");
    }
    return response.data;
  },

  async getMember(
    memberId: string,
    scope: "account" | "all" = "account"
  ): Promise<AdminMemberDetail> {
    const response = await request<AdminMemberDetail>(
      `/admin/members/${memberId}${qs({ scope: scope === "all" ? "all" : undefined })}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load member");
    }
    return response.data;
  },

  async listFunds(params?: {
    accountId?: string;
    isActive?: boolean;
    isPublic?: boolean;
    search?: string;
  }): Promise<AdminFundSummary[]> {
    const response = await request<AdminFundSummary[]>(
      `/admin/funds${qs({
        accountId: params?.accountId,
        search: params?.search,
        isActive:
          params?.isActive === true
            ? "true"
            : params?.isActive === false
              ? "false"
              : undefined,
        isPublic:
          params?.isPublic === true
            ? "true"
            : params?.isPublic === false
              ? "false"
              : undefined,
      })}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load funds");
    }
    return response.data;
  },

  async getFund(fundId: string): Promise<AdminFundDetail> {
    const response = await request<AdminFundDetail>(`/admin/funds/${fundId}`, {
      method: "GET",
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load fund");
    }
    return response.data;
  },

  async listContributions(params?: {
    accountId?: string;
    fundId?: string;
    channel?: "offline" | "online";
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<AdminContributionRow[]> {
    const response = await request<AdminContributionRow[]>(
      `/admin/contributions${qs({
        accountId: params?.accountId,
        fundId: params?.fundId,
        channel: params?.channel,
        status: params?.status,
        dateFrom: params?.dateFrom,
        dateTo: params?.dateTo,
        search: params?.search,
      })}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load contributions");
    }
    return response.data;
  },

  async getContribution(contributionId: string): Promise<AdminContributionDetail> {
    const response = await request<AdminContributionDetail>(
      `/admin/contributions/${contributionId}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load contribution");
    }
    return response.data;
  },

  async getAccountTeam(accountId: string): Promise<AdminAccountTeam> {
    const response = await request<AdminAccountTeam>(
      `/admin/accounts/${accountId}/team`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load account team");
    }
    return response.data;
  },

  async getAccountKyc(accountId: string): Promise<AdminAccountKyc> {
    const response = await request<AdminAccountKyc>(
      `/admin/accounts/${accountId}/kyc`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load account KYC");
    }
    return response.data;
  },

  async listAuditLogs(params?: {
    accountId?: string;
    category?: string;
    limit?: number;
  }): Promise<AuditLogEntry[]> {
    const response = await request<AuditLogEntry[]>(
      `/admin/audit-logs${qs({
        accountId: params?.accountId,
        category: params?.category,
        limit: params?.limit?.toString(),
      })}`,
      { method: "GET" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to load audit logs");
    }
    return response.data;
  },
};
