import { request } from "@/lib/api-client";

export interface AccountKYC {
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

export interface KYCWithAccount extends AccountKYC {
  account_name: string | null;
  account_kyc_status: "unverified" | "pending" | "verified" | "rejected" | null;
}

export const kycApi = {
  async getAll(): Promise<KYCWithAccount[]> {
    const response = await request<KYCWithAccount[]>("/accounts/kyc/all", {
      method: "GET",
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to fetch KYC list");
    }
    return response.data;
  },

  async verify(accountId: string): Promise<AccountKYC> {
    const response = await request<AccountKYC>(
      `/accounts/${accountId}/kyc/verify`,
      { method: "POST" }
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || "Failed to verify KYC");
    }
    return response.data;
  },

  async reject(accountId: string): Promise<void> {
    const response = await request<void>(
      `/accounts/${accountId}/kyc/reject`,
      { method: "POST" }
    );
    if (!response.success) {
      throw new Error(response.error || "Failed to reject KYC");
    }
  },

  async getDocumentSignedUrl(filePath: string): Promise<string> {
    const response = await request<{ signedUrl: string }>(
      `/accounts/kyc/document-url?path=${encodeURIComponent(filePath)}`,
      { method: "GET" }
    );
    if (!response.success || !response.data?.signedUrl) {
      throw new Error(response.error || "Failed to open document");
    }
    return response.data.signedUrl;
  },
};
