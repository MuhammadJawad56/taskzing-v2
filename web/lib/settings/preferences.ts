/** Flutter `SettingsModel` — SharedPreferences key `notificationsEnabled`. */

const NOTIFICATIONS_ENABLED_KEY = "notificationsEnabled";

export function getNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function setNotificationsEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore quota
  }
}
