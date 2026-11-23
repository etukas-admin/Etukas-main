import type { LucideIcon } from "lucide-react";
import {
  Bell,
  ChevronRight,
  FileText,
  Globe,
  HelpCircle,
  Lock,
  MapPin,
  Smartphone,
  Store,
  UserRound,
  Wrench
} from "lucide-react";
import { Link } from "react-router-dom";
import type { User } from "../../../services/api";
import type { SupportedLanguage } from "../types";

export type AccountModalType =
  | "edit-profile"
  | "language"
  | "notifications"
  | "privacy"
  | "devices"
  | "policies"
  | "faqs";

type MenuRowProps = {
  icon: LucideIcon;
  label: string;
  badge?: string;
  to?: string;
  onClick?: () => void;
};

function MenuRow({ icon: Icon, label, badge, to, onClick }: MenuRowProps) {
  const content = (
    <div className="flex w-full items-center justify-between gap-3 py-3 transition hover:bg-gray-50/80 active:bg-etukas-pink/40 rounded-xl px-1.5 -mx-1.5">
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-etukas-pink text-etukas-red">
          <Icon size={18} strokeWidth={2} />
        </div>
        <span className="truncate text-[14.5px] font-medium text-gray-800">{label}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {badge ? (
          <span className="rounded-md bg-etukas-pink px-2.5 py-1 text-xs font-bold text-etukas-red">
            {badge}
          </span>
        ) : null}
        <ChevronRight size={18} className="text-gray-400" />
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className="block w-full text-left">
      {content}
    </button>
  );
}

type AccountSettingsMenuProps = {
  user: User;
  language: SupportedLanguage;
  savedAddressesCount: number;
  serviceBookingsCount: number;
  onOpenModal: (modal: AccountModalType) => void;
};

export function AccountSettingsMenu({
  user,
  language,
  savedAddressesCount,
  serviceBookingsCount,
  onOpenModal
}: AccountSettingsMenuProps) {
  const isSeller = user.roles?.includes("SELLER");

  return (
    <div className="space-y-6">
      {/* Profile Settings */}
      <section aria-labelledby="profile-settings-heading" className="border-t border-gray-100 pt-5">
        <h2 id="profile-settings-heading" className="mb-2 text-[17px] font-extrabold tracking-tight text-etukas-black">
          Profile Settings
        </h2>
        <div className="divide-y divide-gray-100/80">
          <MenuRow
            icon={UserRound}
            label="Edit profile"
            onClick={() => onOpenModal("edit-profile")}
          />
          <MenuRow
            icon={MapPin}
            label="Saved addresses"
            badge={savedAddressesCount > 0 ? `${savedAddressesCount} saved` : undefined}
            to="/location"
          />
          <MenuRow
            icon={Wrench}
            label="Booked technician services"
            badge={serviceBookingsCount > 0 ? `${serviceBookingsCount}` : undefined}
            to="/orders?tab=services"
          />
          <MenuRow
            icon={Globe}
            label="Change language"
            badge={language}
            onClick={() => onOpenModal("language")}
          />
          <MenuRow
            icon={Bell}
            label="Notification settings"
            onClick={() => onOpenModal("notifications")}
          />
        </div>
      </section>

      {/* Privacy & Security */}
      <section aria-labelledby="privacy-security-heading" className="border-t border-gray-100 pt-5">
        <h2 id="privacy-security-heading" className="mb-2 text-[17px] font-extrabold tracking-tight text-etukas-black">
          Privacy &amp; Security
        </h2>
        <div className="divide-y divide-gray-100/80">
          <MenuRow
            icon={Lock}
            label="Privacy center"
            onClick={() => onOpenModal("privacy")}
          />
          <MenuRow
            icon={Smartphone}
            label="Manage devices"
            badge="1 active device"
            onClick={() => onOpenModal("devices")}
          />
        </div>
      </section>

      {/* Earn with Etukas */}
      <section aria-labelledby="earn-etukas-heading" className="border-t border-gray-100 pt-5">
        <h2 id="earn-etukas-heading" className="mb-2 text-[17px] font-extrabold tracking-tight text-etukas-black">
          Earn with Etukas
        </h2>
        <div className="divide-y divide-gray-100/80">
          <MenuRow
            icon={Store}
            label={isSeller ? "Open Partner Dashboard" : "Sell on Etukas"}
            badge={isSeller ? "Active" : undefined}
            to={isSeller ? "/partner-dashboard" : "/partner-hub"}
          />
          <MenuRow
            icon={Wrench}
            label="Join as Certified Technician"
            to="/technicians"
          />
        </div>
      </section>

      {/* Feedback & Information */}
      <section aria-labelledby="feedback-info-heading" className="border-t border-gray-100 pt-5">
        <h2 id="feedback-info-heading" className="mb-2 text-[17px] font-extrabold tracking-tight text-etukas-black">
          Feedback &amp; Information
        </h2>
        <div className="divide-y divide-gray-100/80">
          <MenuRow
            icon={FileText}
            label="Terms, Policies & Licences"
            onClick={() => onOpenModal("policies")}
          />
          <MenuRow
            icon={HelpCircle}
            label="Browse FAQs"
            onClick={() => onOpenModal("faqs")}
          />
        </div>
      </section>
    </div>
  );
}
