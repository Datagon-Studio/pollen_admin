/**
 * Canonical production admin URL for auth email links.
 */
export const CANONICAL_ADMIN_URL = "https://admin.pollean.com";

/**
 * Origin used in password-reset redirects so the email link returns to this app.
 * Prefer VITE_APP_URL, then the current origin on localhost or admin.pollean.com.
 */
export function getAppUrl(): string {
  const configured = import.meta.env.VITE_APP_URL;
  if (configured?.trim()) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      origin.includes("localhost") ||
      origin.includes("127.0.0.1") ||
      origin.includes("admin.pollean.com")
    ) {
      return origin;
    }
    return CANONICAL_ADMIN_URL;
  }

  return CANONICAL_ADMIN_URL;
}
