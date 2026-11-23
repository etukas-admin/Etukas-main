import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Laptop,
  ShieldCheck,
  Smartphone,
  X
} from "lucide-react";
import { marketplaceApi, setSession, type User } from "../../../services/api";
import { ETUKAS_FAQS, ETUKAS_POLICIES } from "../data/accountSupportData";
import type { AccountPreferences, NotificationPreferences, SupportedLanguage } from "../types";
import type { AccountModalType } from "./AccountSettingsMenu";

type AccountModalsProps = {
  activeModal: AccountModalType | null;
  onClose: () => void;
  user: User;
  preferences: AccountPreferences;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onUpdateNotifications: (patch: Partial<NotificationPreferences>) => void;
  onUserUpdated: (updated: User) => void;
};

const LANGUAGES: { value: SupportedLanguage; native: string; subtitle: string }[] = [
  { value: "English", native: "English", subtitle: "Default interface language" },
  { value: "తెలుగు", native: "తెలుగు", subtitle: "Telugu" },
  { value: "हिन्दी", native: "हिन्दी", subtitle: "Hindi" },
  { value: "தமிழ்", native: "தமிழ்", subtitle: "Tamil" }
];

const NOTIFICATION_ITEMS: {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}[] = [
  {
    key: "orderUpdates",
    title: "Order & Dispatch Updates",
    description: "Instant alerts when your order is confirmed, loaded, or delivered."
  },
  {
    key: "driverAlerts",
    title: "Vehicle & Driver Arrival Alerts",
    description: "Know when the delivery truck is en route to your construction site."
  },
  {
    key: "couponsAndOffers",
    title: "Coupons & Wholesale Price Drops",
    description: "Exclusive Cement, TMT Steel, and seasonal discount alerts."
  },
  {
    key: "technicianReminders",
    title: "Technician Appointment Reminders",
    description: "Updates for your booked electricians, plumbers, and masons."
  }
];

export function AccountModals({
  activeModal,
  onClose,
  user,
  preferences,
  onChangeLanguage,
  onUpdateNotifications,
  onUserUpdated
}: AccountModalsProps) {
  const [name, setName] = useState(user.name || "");
  const [mobile, setMobile] = useState(user.mobile || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string>(ETUKAS_FAQS[0]?.id ?? "");

  useEffect(() => {
    if (activeModal === "edit-profile") {
      setName(user.name || "");
      setMobile(user.mobile || "");
      setProfileNotice(null);
    }
  }, [activeModal, user]);

  if (!activeModal) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedMobile = mobile.trim();
    if (!trimmedName) {
      setProfileNotice("Please enter your full name.");
      return;
    }

    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const updatedUser = await marketplaceApi.updateProfile({
        name: trimmedName,
        mobile: trimmedMobile || undefined
      });
      const merged: User = { ...user, ...updatedUser };
      const existingToken = window.localStorage.getItem("etukas_access_token");
      const existingCsrf = window.localStorage.getItem("etukas_csrf_token");
      setSession(existingToken, existingCsrf, merged);
      onUserUpdated(merged);
      setProfileNotice("Profile updated successfully!");
      window.setTimeout(() => onClose(), 900);
    } catch {
      // Graceful local update if server endpoint / DB is temporarily unreachable
      const merged: User = { ...user, name: trimmedName, mobile: trimmedMobile || user.mobile };
      const existingToken = window.localStorage.getItem("etukas_access_token");
      const existingCsrf = window.localStorage.getItem("etukas_csrf_token");
      setSession(existingToken, existingCsrf, merged);
      onUserUpdated(merged);
      setProfileNotice("Profile saved on this device.");
      window.setTimeout(() => onClose(), 900);
    } finally {
      setSavingProfile(false);
    }
  };

  const isMobileUa =
    typeof navigator !== "undefined" && /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

  const modalTitleMap: Record<AccountModalType, string> = {
    "edit-profile": "Edit Profile",
    language: "Change Language",
    notifications: "Notification Settings",
    privacy: "Privacy Center",
    devices: "Manage Devices",
    policies: "Terms, Policies & Licences",
    faqs: "Frequently Asked Questions"
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-3xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-lg font-extrabold text-etukas-black">{modalTitleMap[activeModal]}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* 1. Edit Profile */}
        {activeModal === "edit-profile" && (
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-etukas-black focus:border-etukas-red focus:outline-none focus:ring-2 focus:ring-etukas-pink"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                Mobile Number
              </label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-etukas-black focus:border-etukas-red focus:outline-none focus:ring-2 focus:ring-etukas-pink"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-gray-600">
                Email Address
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Contact support via Help if you need to change your registered email.
              </p>
            </div>

            {profileNotice ? (
              <p className="rounded-xl bg-etukas-pink px-3 py-2 text-xs font-bold text-etukas-red">
                {profileNotice}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProfile}
                className="rounded-xl bg-etukas-red px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
              >
                {savingProfile ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* 2. Change Language */}
        {activeModal === "language" && (
          <div className="space-y-2.5">
            <p className="text-xs text-gray-500">
              Choose your preferred language for Etukas communications and display.
            </p>
            {LANGUAGES.map((lang) => {
              const selected = preferences.language === lang.value;
              return (
                <button
                  key={lang.value}
                  type="button"
                  onClick={() => {
                    onChangeLanguage(lang.value);
                    onClose();
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-etukas-red bg-etukas-pink/70"
                      : "border-gray-200 bg-white hover:border-etukas-red/40"
                  }`}
                >
                  <div>
                    <p className="text-sm font-extrabold text-etukas-black">{lang.native}</p>
                    <p className="text-xs text-gray-500">{lang.subtitle}</p>
                  </div>
                  {selected ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-etukas-red text-white">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. Notification Settings */}
        {activeModal === "notifications" && (
          <div className="space-y-3">
            {NOTIFICATION_ITEMS.map((item) => {
              const enabled = preferences.notifications[item.key];
              return (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 rounded-xl border border-gray-200/80 p-3.5"
                >
                  <div>
                    <p className="text-sm font-bold text-etukas-black">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => onUpdateNotifications({ [item.key]: !enabled })}
                    className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                      enabled ? "bg-etukas-red" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* 4. Privacy Center */}
        {activeModal === "privacy" && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <ShieldCheck size={22} className="shrink-0 text-etukas-green" />
              <div className="text-xs leading-relaxed text-emerald-950">
                <p className="font-extrabold">Your Etukas Account is Protected</p>
                <p className="mt-1">
                  Delivery site locations, phone numbers, and order records are encrypted in transit and shared only with assigned partner stores and delivery drivers.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-gray-600">
              <p className="font-bold text-etukas-black">Data Controls</p>
              <ul className="list-disc space-y-1.5 pl-4">
                <li>Clear your Recently Viewed history directly from My Account anytime.</li>
                <li>Manage saved construction sites and delivery pins in Saved Addresses.</li>
                <li>Request account data support anytime via the Help chat button.</li>
              </ul>
            </div>
          </div>
        )}

        {/* 5. Manage Devices */}
        {activeModal === "devices" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-etukas-red/20 bg-etukas-pink/40 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-etukas-red shadow-xs">
                  {isMobileUa ? <Smartphone size={20} /> : <Laptop size={20} />}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-etukas-black">
                    {isMobileUa ? "Current Mobile Device" : "Current Web Session"}
                  </p>
                  <p className="text-xs text-gray-500">Active now • Signed in as {user.email}</p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-etukas-green">
                Active
              </span>
            </div>

            <div className="rounded-xl border border-gray-200 p-3.5 text-xs text-gray-600">
              Need to update your account password for extra security?
              <Link
                to="/login"
                onClick={onClose}
                className="ml-1 font-bold text-etukas-red hover:underline"
              >
                Reset password →
              </Link>
            </div>
          </div>
        )}

        {/* 6. Policies */}
        {activeModal === "policies" && (
          <div className="space-y-3">
            {ETUKAS_POLICIES.map((policy) => (
              <div key={policy.id} className="rounded-xl border border-gray-200/80 p-3.5">
                <h4 className="text-sm font-extrabold text-etukas-black">{policy.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{policy.summary}</p>
              </div>
            ))}
          </div>
        )}

        {/* 7. FAQs */}
        {activeModal === "faqs" && (
          <div className="space-y-2.5">
            {ETUKAS_FAQS.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="overflow-hidden rounded-xl border border-gray-200/80">
                  <button
                    type="button"
                    onClick={() => setOpenFaqId(isOpen ? "" : faq.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs font-bold text-etukas-black hover:bg-gray-50 sm:text-sm"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp size={16} className="shrink-0 text-etukas-red" />
                    ) : (
                      <ChevronDown size={16} className="shrink-0 text-gray-400" />
                    )}
                  </button>
                  {isOpen ? (
                    <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-3 text-xs leading-relaxed text-gray-600">
                      {faq.answer}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
