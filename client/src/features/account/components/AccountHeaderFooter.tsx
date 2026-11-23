import { Headphones, Instagram, Linkedin, LogOut, Youtube } from "lucide-react";
import type { User } from "../../../services/api";

type AccountHeaderProps = {
  user: User;
  onOpenHelp: () => void;
};

export function AccountHeader({ user, onOpenHelp }: AccountHeaderProps) {
  const firstName = user.name?.trim().split(/\s+/)[0] || "User";

  return (
    <header className="flex items-center justify-between gap-3 pt-1">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-etukas-black sm:text-[26px]">
          Hey, {firstName}
        </h1>
        <p className="mt-0.5 truncate text-xs font-medium text-gray-500">
          {user.mobile ? `+91 ${user.mobile.replace(/^\+?91/, "")}` : user.email}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenHelp}
        className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-etukas-black shadow-xs transition hover:border-etukas-red/40 hover:bg-etukas-pink/60 hover:text-etukas-red active:scale-95"
      >
        <Headphones size={17} className="text-etukas-red" />
        <span>Help</span>
      </button>
    </header>
  );
}

type AccountFooterSectionProps = {
  onLogout: () => void;
  isLoggingOut?: boolean;
};

const SOCIAL_LINKS = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/etukas_com/",
    icon: Instagram
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@Etukas",
    icon: Youtube
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/etukas-b64022210/",
    icon: Linkedin
  }
] as const;

export function AccountFooterSection({ onLogout, isLoggingOut }: AccountFooterSectionProps) {
  return (
    <div className="space-y-6 border-t border-gray-100 pt-5">
      {/* Follow Us On */}
      <section aria-labelledby="follow-us-heading" className="space-y-3">
        <h2 id="follow-us-heading" className="text-[17px] font-extrabold tracking-tight text-etukas-black">
          Follow Us On
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {SOCIAL_LINKS.map(({ name, href, icon: Icon }) => (
            <a
              key={name}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3 py-3 text-xs font-bold text-etukas-black transition hover:border-etukas-red/40 hover:bg-etukas-pink/50 hover:text-etukas-red sm:text-sm"
            >
              <Icon size={18} strokeWidth={2} />
              <span className="truncate">{name}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Log out button */}
      <div className="space-y-3 pt-1">
        <button
          type="button"
          onClick={onLogout}
          disabled={isLoggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-etukas-red/40 bg-white py-3 text-sm font-extrabold text-etukas-red shadow-xs transition hover:border-etukas-red hover:bg-etukas-pink/60 active:scale-[0.99] disabled:opacity-60"
        >
          <LogOut size={16} />
          <span>{isLoggingOut ? "Logging out..." : "Log out"}</span>
        </button>

        <p className="text-center text-xs font-medium text-gray-400">Etukas App v1.0.0</p>
      </div>

      {/* Subtle brand watermark footer matching Flipkart aesthetic */}
      <div className="pb-4 pt-2 select-none">
        <p className="text-2xl font-black leading-tight tracking-tight text-gray-200 sm:text-3xl">
          Trusted by
          <br />
          Builders &amp; Homeowners
        </p>
      </div>
    </div>
  );
}
