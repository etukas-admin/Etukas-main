import { useEffect, useState } from "react";
import type { AccountPreferences, NotificationPreferences, SupportedLanguage } from "../types";

const PREFS_STORAGE_KEY = "etukas_account_preferences_v1";
export const ACCOUNT_PREFS_EVENT = "etukas_account_prefs_change";

const DEFAULT_PREFERENCES: AccountPreferences = {
  language: "English",
  notifications: {
    orderUpdates: true,
    driverAlerts: true,
    couponsAndOffers: true,
    technicianReminders: true
  },
  claimedCouponIds: ["etukas-welcome-10"]
};

function readPreferences(): AccountPreferences {
  try {
    if (typeof window === "undefined") return DEFAULT_PREFERENCES;
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<AccountPreferences>;
    return {
      language: parsed.language ?? DEFAULT_PREFERENCES.language,
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...(parsed.notifications ?? {})
      },
      claimedCouponIds: Array.isArray(parsed.claimedCouponIds)
        ? parsed.claimedCouponIds
        : DEFAULT_PREFERENCES.claimedCouponIds
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function writePreferences(next: AccountPreferences) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(ACCOUNT_PREFS_EVENT));
    }
  } catch {
    // Ignore storage errors
  }
}

export function getAccountPreferences(): AccountPreferences {
  return readPreferences();
}

export function setAccountLanguage(language: SupportedLanguage): AccountPreferences {
  const current = readPreferences();
  const next: AccountPreferences = { ...current, language };
  writePreferences(next);
  return next;
}

export function updateNotificationPreferences(patch: Partial<NotificationPreferences>): AccountPreferences {
  const current = readPreferences();
  const next: AccountPreferences = {
    ...current,
    notifications: { ...current.notifications, ...patch }
  };
  writePreferences(next);
  return next;
}

export function toggleClaimCoupon(couponId: string): AccountPreferences {
  const current = readPreferences();
  const exists = current.claimedCouponIds.includes(couponId);
  const nextIds = exists
    ? current.claimedCouponIds.filter((id) => id !== couponId)
    : [...current.claimedCouponIds, couponId];
  const next: AccountPreferences = { ...current, claimedCouponIds: nextIds };
  writePreferences(next);
  return next;
}

export function useAccountPreferences() {
  const [preferences, setPreferences] = useState<AccountPreferences>(getAccountPreferences);

  useEffect(() => {
    const sync = () => setPreferences(getAccountPreferences());
    window.addEventListener(ACCOUNT_PREFS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ACCOUNT_PREFS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    preferences,
    setLanguage: setAccountLanguage,
    updateNotifications: updateNotificationPreferences,
    toggleClaimCoupon
  };
}
