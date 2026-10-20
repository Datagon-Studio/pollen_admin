import { supabase } from "@/lib/supabase";

// Local dev leaves this unset so Vite proxies /api to the backend.
// Production builds call the group app's API. VITE_API_URL overrides that
// (https only — an http URL is blocked from the HTTPS admin site).
const PRODUCTION_API_BASE_URL = "https://app.pollean.com/api/v1";

function resolveApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_URL?.trim();
  if (!configured) {
    return import.meta.env.PROD ? PRODUCTION_API_BASE_URL : "/api/v1";
  }
  return configured.replace(
    /^http:\/\/((?:app\.)?pollean\.com)/,
    "https://$1"
  );
}

const API_BASE_URL = resolveApiBaseUrl();

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;

  let {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.expires_at) {
    const expiresAt = session.expires_at * 1000;
    const bufferTime = 5 * 60 * 1000;
    if (expiresAt - Date.now() < bufferTime) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      if (refreshed.session) session = refreshed.session;
    }
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (session?.access_token) {
    (headers as Record<string, string>)["Authorization"] =
      `Bearer ${session.access_token}`;
  }

  const response = await fetch(url, { ...options, headers });
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const text = await response.text();
    return {
      success: false,
      error: `Server returned non-JSON: ${response.status} ${text.slice(0, 120)}`,
    };
  }

  const data = await response.json();
  if (!response.ok) {
    return {
      success: false,
      error: data.error || data.message || `Request failed (${response.status})`,
    };
  }

  return data as ApiResponse<T>;
}
