/** Dev-only: skip auth and enter portal as superadmin. Never available in production builds. */

const STORAGE_KEY = "pollean_admin_dev_bypass";

export function isDevBypassAvailable(): boolean {
  return import.meta.env.DEV;
}

export function isDevBypassEnabled(): boolean {
  return isDevBypassAvailable() && sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function enableDevBypass(): void {
  if (!isDevBypassAvailable()) return;
  sessionStorage.setItem(STORAGE_KEY, "1");
}

export function disableDevBypass(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
